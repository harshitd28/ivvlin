import type { SupabaseClient } from "@supabase/supabase-js";

/** Best-effort insert for observability (service-role callers). */
export async function insertWebhookDeliveryEvent(
  svc: SupabaseClient,
  row: {
    client_id: string | null;
    source: string;
    event_kind: string;
    outcome: "ok" | "skipped" | "error";
    error_message?: string | null;
    detail?: Record<string, unknown>;
  }
): Promise<void> {
  const { error } = await svc.from("webhook_delivery_events").insert({
    client_id: row.client_id,
    source: row.source,
    event_kind: row.event_kind,
    outcome: row.outcome,
    error_message: row.error_message ?? null,
    detail: row.detail ?? {},
  });
  if (error) {
    console.error("[webhook_delivery_events]", error.message);
  }
}
