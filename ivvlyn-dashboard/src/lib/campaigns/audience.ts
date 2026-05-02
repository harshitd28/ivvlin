import type { SupabaseClient } from "@supabase/supabase-js";

export type CampaignAudienceFilter = {
  min_score?: number;
  max_score?: number;
  sources?: string[];
  stages?: string[];
  unassigned_only?: boolean;
  modes?: string[];
  require_phone?: boolean;
};

function asFiniteInt(n: unknown, fallback?: number): number | undefined {
  if (typeof n !== "number" || !Number.isFinite(n)) return fallback;
  return Math.floor(n);
}

export function normalizeAudienceFilter(raw: unknown): CampaignAudienceFilter {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return {};
  const o = raw as Record<string, unknown>;
  const min = asFiniteInt(o.min_score);
  const max = asFiniteInt(o.max_score);
  const sources = Array.isArray(o.sources) ? o.sources.filter((x): x is string => typeof x === "string") : undefined;
  const stages = Array.isArray(o.stages) ? o.stages.filter((x): x is string => typeof x === "string") : undefined;
  const modes = Array.isArray(o.modes) ? o.modes.filter((x): x is string => typeof x === "string") : undefined;
  return {
    min_score: min,
    max_score: max,
    sources: sources?.length ? sources : undefined,
    stages: stages?.length ? stages : undefined,
    unassigned_only: typeof o.unassigned_only === "boolean" ? o.unassigned_only : undefined,
    modes: modes?.length ? modes : undefined,
    require_phone: typeof o.require_phone === "boolean" ? o.require_phone : true,
  };
}

/**
 * Returns lead_id values matching filter (WhatsApp-ready leads by default).
 */
export async function resolveAudienceLeadIds(
  svc: SupabaseClient,
  clientId: string,
  filter: CampaignAudienceFilter,
  limit: number
): Promise<string[]> {
  const cap = Math.max(1, Math.min(50_000, limit));
  let q = svc.from("leads").select("lead_id").eq("client_id", clientId).limit(cap);

  if (filter.require_phone !== false) {
    q = q.not("phone", "is", null).neq("phone", "");
  }
  if (typeof filter.min_score === "number") q = q.gte("score", filter.min_score);
  if (typeof filter.max_score === "number") q = q.lte("score", filter.max_score);
  if (filter.unassigned_only) q = q.is("assigned_to_user_id", null);
  if (filter.sources?.length) q = q.in("source", filter.sources);
  if (filter.stages?.length) q = q.in("stage", filter.stages);
  if (filter.modes?.length) q = q.in("mode", filter.modes);

  const { data, error } = await q;
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as Array<{ lead_id: string | null }>;
  const out: string[] = [];
  for (const r of rows) {
    if (r.lead_id && !out.includes(r.lead_id)) out.push(r.lead_id);
  }
  return out;
}
