import type { SupabaseClient } from "@supabase/supabase-js";
import { mergeConversationMetadata } from "@/lib/conversations/merge-metadata";
import { mapWaStatusToLifecycle } from "@/lib/messaging/meta-webhook";

const LEAD_PHONE_LOOKUP_PAGE_SIZE = 1000;

/** Compare Meta `from` with DB phone — digits only, optional leading 91 for IN. */
export function normalizePhoneDigits(input: string): string {
  let d = input.replace(/\D/g, "");
  if (d.length === 10) d = `91${d}`;
  if (d.startsWith("0") && d.length > 10) d = d.replace(/^0+/, "");
  return d;
}

export async function conversationIdByWaMessageId(
  svc: SupabaseClient,
  clientId: string,
  waMsgId: string
): Promise<string | null> {
  const { data: byMeta } = await svc
    .from("conversations")
    .select("id")
    .eq("client_id", clientId)
    .filter("metadata->>whatsapp_message_id", "eq", waMsgId)
    .maybeSingle();
  const id1 = (byMeta as { id?: string } | null)?.id;
  if (id1) return id1;
  const { data: byLegacy } = await svc
    .from("conversations")
    .select("id")
    .eq("client_id", clientId)
    .eq("provider_message_id", waMsgId)
    .maybeSingle();
  return (byLegacy as { id?: string } | null)?.id ?? null;
}

export async function fetchLeadMode(
  svc: SupabaseClient,
  clientId: string,
  leadId: string
): Promise<"ai" | "human" | null> {
  const { data } = await svc.from("leads").select("mode").eq("client_id", clientId).eq("lead_id", leadId).maybeSingle();
  const m = (data as { mode?: string } | null)?.mode;
  return m === "human" || m === "ai" ? m : null;
}

export async function resolveLeadIdByCustomerPhone(
  svc: SupabaseClient,
  clientId: string,
  fromDigits: string
): Promise<string | null> {
  for (let offset = 0; ; offset += LEAD_PHONE_LOOKUP_PAGE_SIZE) {
    const { data: leadRows, error } = await svc
      .from("leads")
      .select("id, lead_id, phone")
      .eq("client_id", clientId)
      .not("phone", "is", null)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(offset, offset + LEAD_PHONE_LOOKUP_PAGE_SIZE - 1);

    if (error) return null;

    const leadsList = (leadRows ?? []) as Array<{ lead_id: string; phone: string | null }>;
    const matchedLead = leadsList.find((l) => l.phone && normalizePhoneDigits(l.phone) === fromDigits);
    if (matchedLead?.lead_id) return matchedLead.lead_id;

    if (leadsList.length < LEAD_PHONE_LOOKUP_PAGE_SIZE) return null;
  }
}

export type InsertInboundParams = {
  clientId: string;
  leadId: string;
  contactPhone: string;
  whatsappMessageId: string;
  text: string;
  /** Extra metadata merged into row.metadata */
  metadataExtras?: Record<string, unknown>;
};

/**
 * Inserts one inbound WhatsApp conversation row + touches SLA on leads (same behavior as Meta webhook).
 * Caller must ensure idempotency (webhook_idempotency and/or duplicate wa message id check).
 */
export async function insertInboundWhatsAppConversation(
  svc: SupabaseClient,
  p: InsertInboundParams
): Promise<void> {
  const now = new Date().toISOString();
  const mode = await fetchLeadMode(svc, p.clientId, p.leadId);
  const metadata: Record<string, unknown> = {
    whatsapp_message_id: p.whatsappMessageId,
    is_automated: false,
    delivery_status: "delivered",
    ...(mode ? { lead_mode: mode } : {}),
    human_takeover_active: mode === "human",
    ...p.metadataExtras,
  };

  await svc.from("conversations").insert({
    client_id: p.clientId,
    lead_id: p.leadId,
    channel: "whatsapp",
    direction: "inbound",
    content: p.text || "[empty]",
    timestamp: now,
    sender: "customer",
    metadata,
    conversation_status: "open",
    contact_phone: p.contactPhone,
    last_message_at: now,
    updated_at: now,
  });

  const slaMins = 15;
  const dueAt = new Date(Date.now() + slaMins * 60_000).toISOString();
  await svc
    .from("leads")
    .update({
      first_response_due_at: dueAt,
      sla_breached_at: null,
      last_customer_message_at: now,
    })
    .eq("client_id", p.clientId)
    .eq("lead_id", p.leadId);
}

export async function applyForwardedDeliveryStatus(
  svc: SupabaseClient,
  clientId: string,
  whatsappMessageId: string,
  statusRaw: string
): Promise<{ updated: boolean }> {
  const life = mapWaStatusToLifecycle(statusRaw);
  if (!life) return { updated: false };
  const convId = await conversationIdByWaMessageId(svc, clientId, whatsappMessageId);
  if (!convId) return { updated: false };
  await mergeConversationMetadata(svc, convId, {
    delivery_status: life === "failed" ? "failed" : life,
    last_delivery_update: new Date().toISOString(),
  });
  return { updated: true };
}
