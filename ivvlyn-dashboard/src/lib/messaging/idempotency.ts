import type { SupabaseClient } from "@supabase/supabase-js";
import type { Json, WebhookIdempotencyInsert } from "@/lib/types";

export type IdempotencyResult =
  | { ok: true; duplicate: false }
  | { ok: true; duplicate: true }
  | { ok: false; error: string };

/**
 * Checks whether a webhook key has already been fully processed.
 * Matches rolled-out `webhook_idempotency` (see docs/supabase-rolled-out-schema.md).
 */
export async function hasCompletedWebhookIdempotency(
  supabase: SupabaseClient,
  idempotencyKey: string,
  source: string
): Promise<IdempotencyResult> {
  const event_id = idempotencyKey.trim();
  if (!event_id) return { ok: false, error: "missing idempotency key" };

  const { data, error } = await supabase
    .from("webhook_idempotency")
    .select("event_id")
    .eq("provider", source)
    .eq("event_id", event_id)
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  return { ok: true, duplicate: Boolean((data as { event_id?: string } | null)?.event_id) };
}

/**
 * Records a webhook key after successful processing. Duplicate → duplicate: true
 * because another worker already completed the same event.
 */
export async function markWebhookIdempotencyCompleted(
  supabase: SupabaseClient,
  idempotencyKey: string,
  source: string,
  metadata?: Json
): Promise<IdempotencyResult> {
  const event_id = idempotencyKey.trim();
  if (!event_id) return { ok: false, error: "missing idempotency key" };

  const row: WebhookIdempotencyInsert = {
    provider: source,
    event_id,
    payload: metadata ?? {},
    processed_at: new Date().toISOString(),
  };
  const { error } = await supabase.from("webhook_idempotency").insert(row);

  if (!error) return { ok: true, duplicate: false };

  if (error.code === "23505") return { ok: true, duplicate: true };

  return { ok: false, error: error.message };
}

export const claimWebhookIdempotency = markWebhookIdempotencyCompleted;
