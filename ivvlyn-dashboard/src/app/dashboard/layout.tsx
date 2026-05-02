import type { ReactNode } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireClient } from "@/lib/auth/requireClient";
import DashboardShellClient from "@/components/layout/DashboardShellClient";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  await requireClient();
  const supabase = await createSupabaseServerClient();
  let clientName = "Demo Client";

  if (supabase) {
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;

    if (session) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", session.user.id)
        .maybeSingle();

      clientName = (profile as { full_name?: string | null } | null)?.full_name ?? clientName;
    }
  }

  return (
    <DashboardShellClient clientName={clientName}>{children}</DashboardShellClient>
  );
}

