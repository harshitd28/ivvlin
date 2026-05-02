import type { SupabaseClient } from "@supabase/supabase-js";

/** Matches admin bulk-mode semantics: human → `takeover_at`, ai → `handback_at`. */
export function buildLeadTakeoverPatch(
  mode: "ai" | "human",
  opts?: { assigned_to?: string | null; assigned_to_user_id?: string | null }
): Record<string, unknown> {
  const now = new Date().toISOString();
  if (mode === "human") {
    return {
      mode: "human",
      takeover_at: now,
      ...(opts?.assigned_to ? { assigned_to: opts.assigned_to } : {}),
      ...(opts?.assigned_to_user_id !== undefined && opts?.assigned_to_user_id !== null
        ? { assigned_to_user_id: opts.assigned_to_user_id }
        : {}),
    };
  }
  return {
    mode: "ai",
    handback_at: now,
  };
}

export async function updateLeadTakeoverByLeadId(
  svc: SupabaseClient,
  leadIdText: string,
  patch: Record<string, unknown>
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: row, error: fetchErr } = await svc.from("leads").select("lead_id").eq("lead_id", leadIdText).maybeSingle();
  if (fetchErr) return { ok: false, error: fetchErr.message };
  if (!(row as { lead_id?: string } | null)?.lead_id) return { ok: false, error: "lead not found" };

  const { error } = await svc.from("leads").update(patch).eq("lead_id", leadIdText);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
