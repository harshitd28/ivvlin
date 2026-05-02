/** Meta customer care session: free-form messages allowed within ~24h of the customer's last inbound message. */
export const WHATSAPP_CUSTOMER_CARE_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Whether a WhatsApp session allows session **text** replies (vs template-only).
 * No inbound timestamp ⇒ cold outreach ⇒ templates only.
 */
export function isWhatsAppSessionActive(lastCustomerMessageAt: string | null | undefined, nowMs = Date.now()): boolean {
  if (!lastCustomerMessageAt) return false;
  const t = new Date(lastCustomerMessageAt).getTime();
  if (Number.isNaN(t)) return false;
  return nowMs - t < WHATSAPP_CUSTOMER_CARE_WINDOW_MS;
}
