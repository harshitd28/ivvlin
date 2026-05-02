import type { SupabaseClient } from "@supabase/supabase-js";
import type { Json, WebhookIdempotencyInsert } from "@/lib/types";

export type IdempotencyResult =
  | { ok: true; duplicate: false }
  | { ok: true; duplicate: true }
  | { ok: false; error: string };

/**
 * Inserts (provider, event_id). Duplicate → duplicate: true (caller should return 200/no-op).
 * Matches rolled-out `webhook_idempotency` (see docs/supabase-rolled-out-schema.md).
 */
export async function claimWebhookIdempotency(
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
