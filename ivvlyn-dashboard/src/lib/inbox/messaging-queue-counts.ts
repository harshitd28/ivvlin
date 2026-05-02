import type { SupabaseClient } from "@supabase/supabase-js";

export type OutboundJobQueueCounts = {
  pending: number;
  processing: number;
  failed: number;
  dead: number;
};

/** Service-role client + tenant `client_id` — workers bypass RLS; do not expose publicly without auth. */
export async function fetchOutboundJobCounts(
  svc: SupabaseClient,
  clientId: string
): Promise<OutboundJobQueueCounts> {
  async function countState(state: string): Promise<number> {
    const { count, error } = await svc
      .from("outbound_message_jobs")
      .select("id", { count: "exact", head: true })
      .eq("client_id", clientId)
      .eq("state", state);
    if (error) return 0;
    return count ?? 0;
  }

  const [pending, processing, failed, dead] = await Promise.all([
    countState("pending"),
    countState("processing"),
    countState("failed"),
    countState("dead"),
  ]);

  return { pending, processing, failed, dead };
}
