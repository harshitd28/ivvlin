import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { hasCompletedWebhookIdempotency, markWebhookIdempotencyCompleted } from "@/lib/messaging/idempotency";
import {
  collectMetaWaIds,
  mapWaStatusToLifecycle,
  metaVerifyChallenge,
  readPhoneNumberId,
  verifyMetaSignature,
} from "@/lib/messaging/meta-webhook";
import {
  conversationIdByWaMessageId,
  insertInboundWhatsAppConversation,
  normalizePhoneDigits,
  resolveLeadIdByCustomerPhone,
} from "@/lib/messaging/inbound-customer-message";
import { mergeConversationMetadata } from "@/lib/conversations/merge-metadata";
import { insertWebhookDeliveryEvent } from "@/lib/messaging/webhook-delivery-log";
import { rateLimitMetaWebhook } from "@/lib/rate-limit/meta-webhook";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export async function GET(req: Request) {
  const token = process.env.META_VERIFY_TOKEN ?? "";
  if (!token) {
    return NextResponse.json({ ok: false, message: "META_VERIFY_TOKEN not configured" }, { status: 503 });
  }
  const url = new URL(req.url);
  const challenge = metaVerifyChallenge(url.searchParams, token);
  if (challenge === null) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }
  return new NextResponse(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

export async function POST(req: Request) {
  const fwd = req.headers.get("x-forwarded-for");
  const ip = fwd?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip") ?? "unknown";
  const rl = await rateLimitMetaWebhook(ip);
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, message: "Rate limited" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter ?? 60) } }
    );
  }

  const appSecret = process.env.META_APP_SECRET ?? "";
  const rawBody = await req.text();

  if (process.env.NODE_ENV === "production" && !appSecret) {
    return NextResponse.json({ ok: false, message: "META_APP_SECRET required in production" }, { status: 503 });
  }

  if (appSecret) {
    const sig = req.headers.get("x-hub-signature-256");
    if (!verifyMetaSignature(appSecret, rawBody, sig)) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
  }

  let body: unknown = {};
  try {
    body = JSON.parse(rawBody || "{}") as unknown;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const ids = collectMetaWaIds(body);
  const idempotencyKey =
    ids.length > 0
      ? [...new Set(ids)].sort().join("|")
      : `meta:sha256:${crypto.createHash("sha256").update(rawBody).digest("hex")}`;

  const svc = createServiceRoleClient();
  if (!svc) {
    return NextResponse.json({ ok: false, message: "Service role not configured" }, { status: 503 });
  }

  const completed = await hasCompletedWebhookIdempotency(svc, idempotencyKey, "meta-whatsapp");
  if (!completed.ok) {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  if (completed.duplicate) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  try {
    await applyMetaPayload(svc, body);
    const marked = await markWebhookIdempotencyCompleted(svc, idempotencyKey, "meta-whatsapp", { count: ids.length });
    if (!marked.ok) {
      return NextResponse.json({ ok: false }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await insertWebhookDeliveryEvent(svc, {
      client_id: null,
      source: "meta_whatsapp",
      event_kind: "apply_payload",
      outcome: "error",
      error_message: msg,
      detail: {},
    });
    return NextResponse.json({ ok: false, message: msg }, { status: 500 });
  }
}

async function applyMetaPayload(
  svc: NonNullable<ReturnType<typeof createServiceRoleClient>>,
  body: unknown
) {
  const phoneNumberId = readPhoneNumberId(body);
  if (!phoneNumberId) return;

  const { data: clientRow } = await svc
    .from("clients")
    .select("id")
    .eq("whatsapp_phone_id", phoneNumberId)
    .eq("whatsapp_enabled", true)
    .maybeSingle();

  const clientId = (clientRow as { id?: string } | null)?.id;
  if (!clientId) {
    await insertWebhookDeliveryEvent(svc, {
      client_id: null,
      source: "meta_whatsapp",
      event_kind: "unknown_whatsapp_phone_id",
      outcome: "skipped",
      detail: { phone_number_id: phoneNumberId },
    });
    return;
  }

  const root = asRecord(body);
  const entry = root?.entry;
  if (!Array.isArray(entry)) return;

  for (const e of entry) {
    const ent = asRecord(e);
    const changes = ent?.changes;
    if (!Array.isArray(changes)) continue;
    for (const c of changes) {
      const ch = asRecord(c);
      const value = asRecord(ch?.value);
      if (!value) continue;

      const statuses = value.statuses;
      if (Array.isArray(statuses)) {
        for (const s of statuses) {
          const st = asRecord(s);
          if (!st) continue;
          const id = typeof st.id === "string" ? st.id : null;
          const status = typeof st.status === "string" ? st.status : null;
          const life = mapWaStatusToLifecycle(status);
          if (!id || !life) continue;
          const convId = await conversationIdByWaMessageId(svc, clientId, id);
          if (convId) {
            await mergeConversationMetadata(svc, convId, {
              delivery_status: life === "failed" ? "failed" : life,
              last_delivery_update: new Date().toISOString(),
            });
          }
        }
      }

      const messages = value.messages;
      if (Array.isArray(messages)) {
        for (const m of messages) {
          const msg = asRecord(m);
          if (!msg) continue;
          const id = typeof msg.id === "string" ? msg.id : null;
          const from = typeof msg.from === "string" ? msg.from : null;
          const type = typeof msg.type === "string" ? msg.type : null;
          if (!id || !from) continue;

          let text = "";
          if (type === "text") {
            const t = asRecord(msg.text);
            text = typeof t?.body === "string" ? t.body : "";
          } else {
            text = `[${type ?? "unknown"}]`;
          }

          const fromDigits = normalizePhoneDigits(from);
          const leadId = await resolveLeadIdByCustomerPhone(svc, clientId, fromDigits);
          if (!leadId) {
            await insertWebhookDeliveryEvent(svc, {
              client_id: clientId,
              source: "meta_whatsapp",
              event_kind: "inbound_no_lead",
              outcome: "skipped",
              detail: { from_digits: fromDigits, wa_message_id: id },
            });
            continue;
          }

          const existingId = await conversationIdByWaMessageId(svc, clientId, id);
          if (existingId) continue;

          await insertInboundWhatsAppConversation(svc, {
            clientId,
            leadId,
            contactPhone: from,
            whatsappMessageId: id,
            text,
            metadataExtras: { ingest_source: "meta_webhook" },
          });
        }
      }
    }
  }
}
