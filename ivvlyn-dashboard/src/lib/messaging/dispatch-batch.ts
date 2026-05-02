import type { SupabaseClient } from "@supabase/supabase-js";
import { popOutboundJobIds } from "@/lib/messaging/redis-queue";
import {
  buildWhatsAppSendPlanFromPayload,
  type WhatsAppTemplateButtonComponent,
  type WhatsAppTemplateHeader,
} from "@/lib/messaging/whatsapp-send-plan";
import { mergeConversationMetadata } from "@/lib/conversations/merge-metadata";

type JobRow = Record<string, unknown>;

function jobStr(j: JobRow, k: string): string | undefined {
  return typeof j[k] === "string" ? (j[k] as string) : undefined;
}

function jobNum(j: JobRow, k: string, fallback: number): number {
  return typeof j[k] === "number" && Number.isFinite(j[k] as number) ? (j[k] as number) : fallback;
}

function jobScheduledAt(j: JobRow): string {
  const s = jobStr(j, "scheduled_at");
  const n = jobStr(j, "next_attempt_at");
  return (s && s.length > 0 ? s : n && n.length > 0 ? n : null) ?? new Date().toISOString();
}

const GRAPH_API_VERSION = "v21.0";

export type DrainBatchResult = {
  scanned: number;
  completed: number;
  redis_ids: number;
  postgres_ids: number;
};

function backoffMs(attempt: number): number {
  const base = 2000;
  return Math.min(120_000, base * 2 ** Math.max(0, attempt));
}

/** DB rollouts use `last_error` and/or `error`; keep both in sync. */
function dualJobErrors(msg: string | null): { last_error: string | null; error: string | null } {
  return { last_error: msg, error: msg };
}

function dualProviderMessageIds(messageId: string): {
  external_message_id: string;
  provider_message_id: string;
} {
  return { external_message_id: messageId, provider_message_id: messageId };
}

async function sendWhatsAppText(args: {
  phoneNumberId: string;
  accessToken: string;
  toDigits: string;
  body: string;
}): Promise<{ ok: true; messageId: string } | { ok: false; error: string }> {
  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${args.phoneNumberId}/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: args.toDigits,
      type: "text",
      text: { body: args.body },
    }),
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const err =
      typeof json.error === "object" && json.error !== null && "message" in json.error
        ? String((json.error as { message?: string }).message)
        : res.statusText;
    return { ok: false, error: err || "WhatsApp API error" };
  }
  const messages = json.messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    return { ok: false, error: "No message id in response" };
  }
  const mid = (messages[0] as { id?: string })?.id;
  if (!mid) return { ok: false, error: "Missing message id" };
  return { ok: true, messageId: mid };
}

function appendTemplateHeaderComponents(components: Record<string, unknown>[], header: WhatsAppTemplateHeader) {
  if (header.kind === "none") return;
  if (header.kind === "text" && header.textParams.length > 0) {
    components.push({
      type: "header",
      parameters: header.textParams.map((t) => ({ type: "text", text: t })),
    });
    return;
  }
  if (header.kind === "image") {
    components.push({
      type: "header",
      parameters: [{ type: "image", image: { link: header.link } }],
    });
    return;
  }
  if (header.kind === "video") {
    components.push({
      type: "header",
      parameters: [{ type: "video", video: { link: header.link } }],
    });
    return;
  }
  if (header.kind === "document") {
    const doc: Record<string, unknown> = { link: header.link };
    if (header.filename) doc.filename = header.filename;
    components.push({
      type: "header",
      parameters: [{ type: "document", document: doc }],
    });
  }
}

async function sendWhatsAppTemplate(args: {
  phoneNumberId: string;
  accessToken: string;
  toDigits: string;
  templateName: string;
  languageCode: string;
  bodyParams: string[];
  header: WhatsAppTemplateHeader;
  buttons: WhatsAppTemplateButtonComponent[];
}): Promise<{ ok: true; messageId: string } | { ok: false; error: string }> {
  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${args.phoneNumberId}/messages`;
  const template: Record<string, unknown> = {
    name: args.templateName,
    language: { code: args.languageCode },
  };
  const components: Record<string, unknown>[] = [];
  appendTemplateHeaderComponents(components, args.header);
  if (args.bodyParams.length > 0) {
    components.push({
      type: "body",
      parameters: args.bodyParams.map((t) => ({ type: "text", text: t })),
    });
  }
  for (const b of args.buttons) {
    components.push({
      type: "button",
      sub_type: b.sub_type,
      index: b.index,
      parameters: b.parameters.map((t) => ({ type: "text", text: t })),
    });
  }
  if (components.length > 0) {
    template.components = components;
  }
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: args.toDigits,
      type: "template",
      template,
    }),
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const err =
      typeof json.error === "object" && json.error !== null && "message" in json.error
        ? String((json.error as { message?: string }).message)
        : res.statusText;
    return { ok: false, error: err || "WhatsApp API error" };
  }
  const messages = json.messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    return { ok: false, error: "No message id in response" };
  }
  const mid = (messages[0] as { id?: string })?.id;
  if (!mid) return { ok: false, error: "Missing message id" };
  return { ok: true, messageId: mid };
}

function normalizeRecipient(input: string | null): string | null {
  if (!input) return null;
  let d = input.replace(/\D/g, "");
  if (d.length === 10) d = `91${d}`;
  return d.length >= 10 ? d : null;
}

async function clearSlaClock(svc: SupabaseClient, clientId: string, leadId: string) {
  const now = new Date().toISOString();
  await svc
    .from("leads")
    .update({
      first_response_due_at: null,
      sla_breached_at: null,
      last_agent_response_at: now,
    })
    .eq("client_id", clientId)
    .eq("lead_id", leadId);
}

/**
 * Claim and process one job by id (id may come from Redis fast-lane or Postgres sweep).
 */
export async function processOutboundJobById(svc: SupabaseClient, jobId: string): Promise<boolean> {
  const nowIso = new Date().toISOString();
  const { data: lockRow } = await svc
    .from("outbound_message_jobs")
    .update({
      state: "processing",
      updated_at: nowIso,
      locked_at: nowIso,
      locked_by: "worker",
    })
    .eq("id", jobId)
    .eq("state", "pending")
    .select("id")
    .maybeSingle();

  if (!(lockRow as { id?: string } | null)?.id) return false;

  const { data: jobRow } = await svc.from("outbound_message_jobs").select("*").eq("id", jobId).maybeSingle();
  const jr = jobRow as JobRow | null;
  if (!jr) {
    await svc
      .from("outbound_message_jobs")
      .update({ state: "pending", locked_at: null, locked_by: null, updated_at: new Date().toISOString() })
      .eq("id", jobId)
      .eq("state", "processing");
    return false;
  }

  const clientId = jobStr(jr, "client_id")!;
  const leadId = jobStr(jr, "lead_id")!;
  const conversationId = jobStr(jr, "conversation_id") ?? null;

  const { data: clientRow } = await svc
    .from("clients")
    .select("whatsapp_enabled, whatsapp_phone_id, whatsapp_access_token")
    .eq("id", clientId)
    .maybeSingle();

  const client = clientRow as {
    whatsapp_enabled?: boolean | null;
    whatsapp_phone_id?: string | null;
    whatsapp_access_token?: string | null;
  } | null;

  const { data: leadRow } = await svc
    .from("leads")
    .select("phone")
    .eq("client_id", clientId)
    .eq("lead_id", leadId)
    .maybeSingle();

  const phoneFromLead = normalizeRecipient((leadRow as { phone?: string | null } | null)?.phone ?? null);
  const toPhoneJob = normalizeRecipient(jobStr(jr, "to_phone") ?? null);
  const to = toPhoneJob ?? phoneFromLead;
  const plan = buildWhatsAppSendPlanFromPayload(jr.payload ?? {});

  const skipProvider = process.env.MESSAGING_SKIP_PROVIDER_SEND === "1";

  if (skipProvider) {
    const devId = `dev:${jobId}`;
    if (conversationId) {
      await mergeConversationMetadata(svc, conversationId, {
        delivery_status: "sent",
        whatsapp_message_id: devId,
        queue_status: "sent",
      });
    }
    await svc
      .from("outbound_message_jobs")
      .update({
        state: "sent",
        sent_at: new Date().toISOString(),
        ...dualProviderMessageIds(devId),
        ...dualJobErrors(null),
        locked_at: null,
        locked_by: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);
    await clearSlaClock(svc, clientId, leadId);
    return true;
  }

  const canSend =
    client?.whatsapp_enabled &&
    client.whatsapp_phone_id &&
    client.whatsapp_access_token &&
    to &&
    plan !== null;

  if (!canSend) {
    const err = !to
      ? "Lead phone missing"
      : !plan
        ? "Empty or invalid payload (text or template required)"
        : !client?.whatsapp_enabled
          ? "WhatsApp disabled for client"
          : "WhatsApp credentials incomplete";

    const attempts = jobNum(jr, "attempts", 0);
    const maxAttempts = jobNum(jr, "max_attempts", 8);
    const nextAttempts = attempts + 1;
    const dead = nextAttempts >= maxAttempts;
    const nextAt = dead ? jobScheduledAt(jr) : new Date(Date.now() + backoffMs(attempts)).toISOString();
    await svc
      .from("outbound_message_jobs")
      .update({
        state: dead ? "dead" : "pending",
        attempts: nextAttempts,
        scheduled_at: nextAt,
        ...dualJobErrors(err),
        failed_at: dead ? new Date().toISOString() : null,
        locked_at: null,
        locked_by: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);
    return false;
  }

  const result =
    plan!.kind === "template"
      ? await sendWhatsAppTemplate({
          phoneNumberId: client!.whatsapp_phone_id!,
          accessToken: client!.whatsapp_access_token!,
          toDigits: to!,
          templateName: plan.templateName,
          languageCode: plan.languageCode,
          bodyParams: plan.bodyParams,
          header: plan.header,
          buttons: plan.buttons,
        })
      : await sendWhatsAppText({
          phoneNumberId: client!.whatsapp_phone_id!,
          accessToken: client!.whatsapp_access_token!,
          toDigits: to!,
          body: plan.body,
        });

  if (result.ok) {
    await svc
      .from("outbound_message_jobs")
      .update({
        state: "sent",
        sent_at: new Date().toISOString(),
        ...dualProviderMessageIds(result.messageId),
        ...dualJobErrors(null),
        locked_at: null,
        locked_by: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    if (conversationId) {
      await mergeConversationMetadata(svc, conversationId, {
        delivery_status: "sent",
        whatsapp_message_id: result.messageId,
        queue_status: "sent",
      });
    }
    await clearSlaClock(svc, clientId, leadId);
    return true;
  }

  const attempts = jobNum(jr, "attempts", 0);
  const maxAttempts = jobNum(jr, "max_attempts", 8);
  const nextAttempts = attempts + 1;
  const dead = nextAttempts >= maxAttempts;
  const nextAt = dead ? jobScheduledAt(jr) : new Date(Date.now() + backoffMs(attempts)).toISOString();
  await svc
    .from("outbound_message_jobs")
    .update({
      state: dead ? "dead" : "pending",
      attempts: nextAttempts,
      scheduled_at: nextAt,
      ...dualJobErrors(result.error),
      failed_at: dead ? new Date().toISOString() : null,
      locked_at: null,
      locked_by: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId);
  return false;
}

/**
 * Drain up to `maxJobs` outbound sends. Redis IDs first (burst), then Postgres priority sweep.
 */
export async function drainOutboundBatch(
  svc: SupabaseClient,
  opts: { maxJobs: number; useRedis?: boolean }
): Promise<DrainBatchResult> {
  const max = Math.max(1, Math.min(100, opts.maxJobs));
  const useRedis = opts.useRedis !== false;
  const ids: string[] = [];
  let redisCount = 0;

  if (useRedis && process.env.REDIS_URL) {
    const fromRedis = await popOutboundJobIds(max);
    ids.push(...fromRedis);
    redisCount = fromRedis.length;
  }

  const need = max - ids.length;
  let postgresCount = 0;
  if (need > 0) {
    const nowPoll = new Date().toISOString();
    const { data: rows } = await svc
      .from("outbound_message_jobs")
      .select("id")
      .eq("state", "pending")
      .lte("scheduled_at", nowPoll)
      .order("priority", { ascending: false })
      .order("scheduled_at", { ascending: true })
      .limit(need);

    for (const r of rows ?? []) {
      const id = (r as { id: string }).id;
      if (id && !ids.includes(id)) ids.push(id);
    }
    postgresCount = (rows ?? []).length;
  }

  let completed = 0;
  for (const id of ids) {
    const ok = await processOutboundJobById(svc, id);
    if (ok) completed += 1;
  }

  return {
    scanned: ids.length,
    completed,
    redis_ids: redisCount,
    postgres_ids: postgresCount,
  };
}
