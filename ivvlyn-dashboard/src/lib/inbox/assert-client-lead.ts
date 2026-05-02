import type { SupabaseClient } from "@supabase/supabase-js";

export async function getClientProfileForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<{ clientId: string } | { error: string; status: number }> {
  const { data: profile } = await supabase.from("profiles").select("role, client_id").eq("id", userId).maybeSingle();

  const typed = profile as { role?: string | null; client_id?: string | null } | null;
  if (typed?.role !== "client" || !typed.client_id) {
    return { error: "Forbidden", status: 403 };
  }
  return { clientId: typed.client_id };
}

export async function assertLeadBelongsToClient(
  supabase: SupabaseClient,
  clientId: string,
  leadId: string
): Promise<boolean> {
  const { data: row } = await supabase
    .from("leads")
    .select("lead_id")
    .eq("client_id", clientId)
    .eq("lead_id", leadId)
    .maybeSingle();

  return Boolean((row as { lead_id?: string } | null)?.lead_id);
}
