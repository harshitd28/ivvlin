import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchOutboundJobCounts, type OutboundJobQueueCounts } from "@/lib/inbox/messaging-queue-counts";

export type JobDigestRow = {
  id: string;
  lead_id: string;
  /** Rolled-out column may be `error` or `last_error` depending on environment. */
  last_error: string | null;
  attempts: number;
  updated_at: string;
  created_at: string;
  /** Worker uses pending retry → dead; no separate `failed` state today. */
  state?: string;
};

function pickJobError(row: Record<string, unknown>): string | null {
  const e = row.error ?? row.last_error;
  return typeof e === "string" && e.trim() ? e : null;
}

export type WebhookEventDigest = {
  id: string;
  created_at: string;
  source: string;
  event_kind: string;
  outcome: string;
  error_message: string | null;
  detail: Record<string, unknown>;
};

export type MessagingInsights = {
  counts: OutboundJobQueueCounts;
  /** Seconds behind now for the oldest still-pending job (queue lag). */
  pending_lag_seconds: number | null;
  oldest_pending_scheduled_at: string | null;
  recent_failed: JobDigestRow[];
  recent_dead: JobDigestRow[];
  webhook_events_24h: WebhookEventDigest[];
};

/**
 * Service-role client + tenant `client_id` — same safety model as queue counts.
 */
export async function fetchMessagingInsights(svc: SupabaseClient, clientId: string): Promise<MessagingInsights> {
  const counts = await fetchOutboundJobCounts(svc, clientId);
  const now = Date.now();

  const { data: oldestPending } = await svc
    .from("outbound_message_jobs")
    .select("scheduled_at")
    .eq("client_id", clientId)
    .eq("state", "pending")
    .order("scheduled_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const oldestSa = (oldestPending as { scheduled_at?: string } | null)?.scheduled_at ?? null;
  let pending_lag_seconds: number | null = null;
  if (oldestSa) {
    const t = new Date(oldestSa).getTime();
    if (!Number.isNaN(t)) pending_lag_seconds = Math.max(0, Math.floor((now - t) / 1000));
  }

  /** Jobs that recorded an API/config error (often pending with backoff or terminal dead). */
  const { data: problemPool } = await svc
    .from("outbound_message_jobs")
    .select("id, lead_id, last_error, error, attempts, updated_at, created_at, state")
    .eq("client_id", clientId)
    .neq("state", "sent")
    .order("updated_at", { ascending: false })
    .limit(48);

  const { data: deadRows } = await svc
    .from("outbound_message_jobs")
    .select("id, lead_id, last_error, error, attempts, updated_at, created_at, state")
    .eq("client_id", clientId)
    .eq("state", "dead")
    .order("updated_at", { ascending: false })
    .limit(12);

  const since = new Date(now - 24 * 60 * 60 * 1000).toISOString();
  const { data: webhookRows } = await svc
    .from("webhook_delivery_events")
    .select("id, created_at, source, event_kind, outcome, error_message, detail")
    .eq("client_id", clientId)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(50);

  const recent_failed = (problemPool ?? [])
    .map((r) => {
      const row = r as Record<string, unknown>;
      return {
        id: String(row.id ?? ""),
        lead_id: String(row.lead_id ?? ""),
        last_error: pickJobError(row),
        attempts: typeof row.attempts === "number" ? row.attempts : 0,
        updated_at: String(row.updated_at ?? ""),
        created_at: String(row.created_at ?? ""),
        state: typeof row.state === "string" ? row.state : "",
      };
    })
    .filter((x) => x.last_error !== null)
    .slice(0, 10);
  const recent_dead = (deadRows ?? []).map((r) => {
    const row = r as Record<string, unknown>;
    return {
      id: String(row.id ?? ""),
      lead_id: String(row.lead_id ?? ""),
      last_error: pickJobError(row),
      attempts: typeof row.attempts === "number" ? row.attempts : 0,
      updated_at: String(row.updated_at ?? ""),
      created_at: String(row.created_at ?? ""),
      state: typeof row.state === "string" ? row.state : "dead",
    };
  });
  const webhook_events_24h = (webhookRows ?? []).map((r) => {
    const row = r as {
      id: string;
      created_at: string;
      source: string;
      event_kind: string;
      outcome: string;
      error_message: string | null;
      detail: unknown;
    };
    return {
      id: row.id,
      created_at: row.created_at,
      source: row.source,
      event_kind: row.event_kind,
      outcome: row.outcome,
      error_message: row.error_message,
      detail: typeof row.detail === "object" && row.detail !== null && !Array.isArray(row.detail)
        ? (row.detail as Record<string, unknown>)
        : {},
    };
  });

  return {
    counts,
    pending_lag_seconds,
    oldest_pending_scheduled_at: oldestSa,
    recent_failed,
    recent_dead,
    webhook_events_24h,
  };
}
