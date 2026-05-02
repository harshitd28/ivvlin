import { NextResponse } from "next/server";
import { claimWebhookIdempotency } from "@/lib/messaging/idempotency";
import { assertInternalIngestSecret } from "@/lib/messaging/assert-internal-ingest";
import {
  applyForwardedDeliveryStatus,
  conversationIdByWaMessageId,
  insertInboundWhatsAppConversation,
  normalizePhoneDigits,
  resolveLeadIdByCustomerPhone,
} from "@/lib/messaging/inbound-customer-message";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { Json } from "@/lib/types";

/**
 * Forward WhatsApp Cloud API events from n8n (or any worker) when Meta webhook is not pointed at this app.
 * Uses the same idempotency keys as `/api/webhooks/meta` (`wa:msg:*`, `wa:status:*`) so duplicate delivery is ignored.
 *
 * Runbook: `docs/n8n-whatsapp-forward.md`
 *
 * POST JSON examples:
 *
 * Message:
 * `{ "whatsapp_message_id": "wamid...", "client_id": "<uuid>", "lead_id": "<text lead_id>", "customer_phone": "+91...", "text": "hi", "type": "text" }`
 *
 * Status:
 * `{ "event": "status", "whatsapp_message_id": "wamid...", "status": "delivered", "client_id": "<uuid>" }`
 *
 * Client resolution: `client_id` OR `whatsapp_phone_id` (Meta phone number id on `clients.whatsapp_phone_id`).
 */
export async function POST(req: Request) {
  const deny = assertInternalIngestSecret(req);
  if (deny) return deny;

  const svc = createServiceRoleClient();
  if (!svc) {
    return NextResponse.json({ ok: false, message: "Service role not configured" }, { status: 503 });
  }

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  const rec = body as Record<string, unknown>;
  const event = typeof rec.event === "string" ? rec.event : "message";

  if (event === "status") {
    return handleStatus(svc, rec);
  }
  if (event !== "message") {
    return NextResponse.json({ ok: false, message: "Unknown event" }, { status: 400 });
  }
  return handleMessage(svc, rec);
}

async function resolveClientId(
  svc: NonNullable<ReturnType<typeof createServiceRoleClient>>,
  rec: Record<string, unknown>
): Promise<string | null> {
  const direct = typeof rec.client_id === "string" ? rec.client_id.trim() : "";
  if (direct) {
    const { data: row } = await svc.from("clients").select("id").eq("id", direct).maybeSingle();
    return (row as { id?: string } | null)?.id ?? null;
  }
  const phoneId = typeof rec.whatsapp_phone_id === "string" ? rec.whatsapp_phone_id.trim() : "";
  if (!phoneId) return null;
  const { data: clientRow } = await svc
    .from("clients")
    .select("id")
    .eq("whatsapp_phone_id", phoneId)
    .eq("whatsapp_enabled", true)
    .maybeSingle();
  return (clientRow as { id?: string } | null)?.id ?? null;
}

async function handleMessage(
  svc: NonNullable<ReturnType<typeof createServiceRoleClient>>,
  rec: Record<string, unknown>
): Promise<Response> {
  const waId = typeof rec.whatsapp_message_id === "string" ? rec.whatsapp_message_id.trim() : "";
  if (!waId) {
    return NextResponse.json({ ok: false, message: "whatsapp_message_id required" }, { status: 400 });
  }

  const idempotencyKey = `wa:msg:${waId}`;
  const claimed = await claimWebhookIdempotency(svc, idempotencyKey, "meta-whatsapp", {
    source: "n8n_forward",
  } as Json);
  if (!claimed.ok) {
    return NextResponse.json({ ok: false, message: claimed.error }, { status: 500 });
  }
  if (claimed.duplicate) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  const clientId = await resolveClientId(svc, rec);
  if (!clientId) {
    return NextResponse.json(
      {
        ok: false,
        code: "client_not_resolved",
        message: "client_id or whatsapp_phone_id required",
        hint: "Pass UUID `clients.id`, or Meta `whatsapp_phone_id` as stored on `clients.whatsapp_phone_id`.",
      },
      { status: 400 }
    );
  }

  const existingId = await conversationIdByWaMessageId(svc, clientId, waId);
  if (existingId) {
    return NextResponse.json({ ok: true, duplicate: true, reason: "message_already_stored" });
  }

  const leadIdText = typeof rec.lead_id === "string" ? rec.lead_id.trim() : "";
  let leadId: string | null = leadIdText || null;

  if (!leadId) {
    const phoneRaw = typeof rec.customer_phone === "string" ? rec.customer_phone : "";
    if (!phoneRaw) {
      return NextResponse.json(
        { ok: false, message: "lead_id or customer_phone required for message event" },
        { status: 400 }
      );
    }
    const fromDigits = normalizePhoneDigits(phoneRaw);
    leadId = await resolveLeadIdByCustomerPhone(svc, clientId, fromDigits);
    if (!leadId) {
      return NextResponse.json(
        {
          ok: false,
          code: "lead_not_found",
          message: "No lead matches customer_phone for this client",
          hint: "Create a lead with `leads.phone` matching the WhatsApp number (digits). Or send `lead_id` (text key) explicitly.",
        },
        { status: 404 }
      );
    }
  } else {
    const { data: leadRow } = await svc
      .from("leads")
      .select("lead_id")
      .eq("client_id", clientId)
      .eq("lead_id", leadId)
      .maybeSingle();
    if (!(leadRow as { lead_id?: string } | null)?.lead_id) {
      return NextResponse.json(
        {
          ok: false,
          code: "lead_not_found",
          message: "lead_id not found for client",
          hint: "Use the text `leads.lead_id` for this tenant. Check CRM import or UUID confusion — inbox joins on text lead_id, not leads.id uuid.",
        },
        { status: 404 }
      );
    }
  }

  const type = typeof rec.type === "string" ? rec.type : "text";
  let text = typeof rec.text === "string" ? rec.text : "";
  if (type !== "text") {
    text = text || `[${type}]`;
  }

  const contactPhone =
    typeof rec.customer_phone === "string" && rec.customer_phone.trim()
      ? rec.customer_phone.trim()
      : typeof rec.from === "string" && rec.from.trim()
        ? String(rec.from).trim()
        : "";

  if (!contactPhone) {
    return NextResponse.json({ ok: false, message: "customer_phone or from required" }, { status: 400 });
  }

  await insertInboundWhatsAppConversation(svc, {
    clientId,
    leadId,
    contactPhone,
    whatsappMessageId: waId,
    text: text || "[empty]",
    metadataExtras: { ingest_source: "n8n_forward" },
  });

  return NextResponse.json({ ok: true });
}

async function handleStatus(
  svc: NonNullable<ReturnType<typeof createServiceRoleClient>>,
  rec: Record<string, unknown>
): Promise<Response> {
  const waId = typeof rec.whatsapp_message_id === "string" ? rec.whatsapp_message_id.trim() : "";
  const statusRaw = typeof rec.status === "string" ? rec.status.trim() : "";
  if (!waId || !statusRaw) {
    return NextResponse.json({ ok: false, message: "whatsapp_message_id and status required" }, { status: 400 });
  }

  const idempotencyKey = `wa:status:${waId}`;
  const claimed = await claimWebhookIdempotency(svc, idempotencyKey, "meta-whatsapp", {
    source: "n8n_forward",
    status: statusRaw,
  } as Json);
  if (!claimed.ok) {
    return NextResponse.json({ ok: false, message: claimed.error }, { status: 500 });
  }
  if (claimed.duplicate) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  const clientId = await resolveClientId(svc, rec);
  if (!clientId) {
    return NextResponse.json(
      {
        ok: false,
        code: "client_not_resolved",
        message: "client_id or whatsapp_phone_id required",
        hint: "Same as message forward: identify the WhatsApp Business phone / tenant.",
      },
      { status: 400 }
    );
  }

  const result = await applyForwardedDeliveryStatus(svc, clientId, waId, statusRaw);
  return NextResponse.json({ ok: true, updated: result.updated });
}
