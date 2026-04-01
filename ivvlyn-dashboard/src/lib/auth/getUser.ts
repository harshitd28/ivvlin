import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/types";

export type AuthUserWithProfile = {
  userId: string;
  email: string | null;
  role: UserRole | null;
  clientId: string | null;
  fullName: string | null;
};

export async function getUserWithProfile(): Promise<AuthUserWithProfile | null> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, client_id, full_name")
    .eq("id", userData.user.id)
    .maybeSingle();

  const typed = (profile as { role?: UserRole | null; client_id?: string | null; full_name?: string | null } | null) ?? null;

  return {
    userId: userData.user.id,
    email: userData.user.email ?? null,
    role: typed?.role ?? null,
    clientId: typed?.client_id ?? null,
    fullName: typed?.full_name ?? null,
  };
}
