import { after } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { drainOutboundBatch } from "@/lib/messaging/dispatch-batch";
import { pushOutboundJobId } from "@/lib/messaging/redis-queue";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { buildWhatsAppSendPlanFromPayload } from "@/lib/messaging/whatsapp-send-plan";

export function scheduleDrainAfterResponse() {
  const max = Math.min(25, Math.max(1, Number(process.env.MESSAGING_ENQUEUE_DRAIN_MAX ?? "8")));
  after(async () => {
    const svc = createServiceRoleClient();
    if (!svc) return;
    await drainOutboundBatch(svc, { maxJobs: max, useRedis: true });
  });
}

export type InsertQueuedOutboundResult =
  | { ok: true; conversation_id: string; job_id: string }
  | { ok: false; message: string };

function normalizePhoneDigits(input: string | null): string | null {
  if (!input) return null;
  let d = input.replace(/\D/g, "");
  if (d.length === 10) d = `91${d}`;
  if (d.startsWith("0") && d.length > 10) d = d.replace(/^0+/, "");
  return d.length >= 10 ? d : null;
}

/**
 * Insert queued conversation row + outbound job (service role). Matches rolled-out CRM schema.
 */
export async function insertQueuedOutbound(args: {
  svc: SupabaseClient;
  clientId: string;
  leadId: string;
  message: string;
  channel?: string;
  isAutomated?: boolean;
  priority?: number;
  idempotencyKey?: string | null;
  payloadExtra?: Record<string, unknown>;
}): Promise<InsertQueuedOutboundResult> {
  const channel = (args.channel ?? "whatsapp").trim() || "whatsapp";
  const isAutomated = args.isAutomated ?? false;
  const priority =
    typeof args.priority === "number" && Number.isFinite(args.priority) ? Math.floor(args.priority) : isAutomated ? 0 : 10;

  const payload: Record<string, unknown> = { text: args.message, ...(args.payloadExtra ?? {}) };
  const plan = buildWhatsAppSendPlanFromPayload(payload);
  const message_type = plan?.kind === "template" ? "template" : "text";

  const { data: leadRow } = await args.svc
    .from("leads")
    .select("phone, mode")
    .eq("client_id", args.clientId)
    .eq("lead_id", args.leadId)
    .maybeSingle();
  const phoneRaw = (leadRow as { phone?: string | null } | null)?.phone ?? null;
  const leadMode = (leadRow as { mode?: "ai" | "human" | null } | null)?.mode ?? null;
  const to_phone = normalizePhoneDigits(phoneRaw);

  const now = new Date().toISOString();
  const meta: Record<string, unknown> = {
    is_automated: isAutomated,
    queue_status: "queued",
    ...(leadMode ? { lead_mode: leadMode } : {}),
    /** When true, lead is in manual/human mode — n8n workflows should skip auto-replies if they branch on metadata or sync `leads.mode`. */
    human_takeover_active: leadMode === "human",
  };
  if (args.idempotencyKey?.trim()) meta.idempotency_key = args.idempotencyKey.trim();

  const idem = args.idempotencyKey?.trim() || null;
  const { data: conv, error: convErr } = await args.svc
    .from("conversations")
    .insert({
      client_id: args.clientId,
      lead_id: args.leadId,
      channel,
      direction: "outbound",
      content: args.message,
      timestamp: now,
      sender: isAutomated ? "system" : "agent",
      metadata: meta,
      conversation_status: "open",
      contact_phone: phoneRaw,
      last_message_at: now,
      updated_at: now,
      idempotency_key: idem,
    })
    .select("id")
    .single();

  if (convErr || !conv) {
    return { ok: false, message: convErr?.message ?? "conversation insert failed" };
  }

  const conversationId = (conv as { id: string }).id;

  const { data: jobIns, error: jobErr } = await args.svc
    .from("outbound_message_jobs")
    .insert({
      client_id: args.clientId,
      lead_id: args.leadId,
      channel,
      conversation_id: conversationId,
      to_phone: to_phone ?? phoneRaw,
      message_type,
      template_name: plan?.kind === "template" ? plan.templateName : null,
      template_language: plan?.kind === "template" ? plan.languageCode : null,
      payload,
      state: "pending",
      priority,
      attempts: 0,
      max_attempts: 8,
      scheduled_at: now,
      created_at: now,
      updated_at: now,
    })
    .select("id")
    .single();

  if (jobErr || !jobIns) {
    return { ok: false, message: jobErr?.message ?? "job insert failed" };
  }

  const jobId = (jobIns as { id: string }).id;
  return { ok: true, conversation_id: conversationId, job_id: jobId };
}

export async function enqueueAndDispatchHint(args: Parameters<typeof insertQueuedOutbound>[0] & { pushRedis?: boolean }) {
  const r = await insertQueuedOutbound(args);
  if (!r.ok) return r;
  if (args.pushRedis !== false) await pushOutboundJobId(r.job_id);
  scheduleDrainAfterResponse();
  return r;
}
