import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Lead, Channel } from "@/lib/types";
import LeadsClient from "@/components/dashboard/leads/LeadsClient";
import DashboardRealtime from "@/components/dashboard/realtime/DashboardRealtime";

export default async function LeadsPage() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return (
      <div className="p-8">
        <div className="text-[#0A0A0A] text-[20px] font-medium">Leads</div>
        <div className="text-[#555] text-[13px] mt-2">Configure Supabase env vars to load real data.</div>
      </div>
    );
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData.session;
  if (!session) {
    return (
      <div className="p-8">
        <div className="text-[#0A0A0A] text-[20px] font-medium">Leads</div>
        <div className="text-[#555] text-[13px] mt-2">Please sign in again.</div>
      </div>
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("client_id")
    .eq("id", session.user.id)
    .maybeSingle();

  const typedProfile = profile as unknown as { client_id?: string | null } | null;
  const clientId = typedProfile?.client_id ?? null;
  if (!clientId) {
    return (
      <div className="p-8">
        <div className="text-[#0A0A0A] text-[20px] font-medium">Leads</div>
        <div className="text-[#555] text-[13px] mt-2">No client linked to this account.</div>
      </div>
    );
  }

  const { data: leadsRows } = await supabase
    .from("leads")
    .select(
      "lead_id, name, phone, email, score, status, channel, source, created_at, last_contact, bhk_preference, location_preference, budget, visit_date"
    )
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });

  const leads = (leadsRows ?? []) as unknown as Lead[];

  // Pre-calc counts for tabs.
  const hotCount = leads.filter((l) => l.status === "hot" || (typeof l.score === "number" && l.score >= 70)).length;
  const warmCount = leads.filter(
    (l) =>
      l.status === "warm" ||
      (typeof l.score === "number" && l.score >= 50 && l.score < 70)
  ).length;
  const coldCount = leads.filter(
    (l) => l.status === "cold" || (typeof l.score === "number" && l.score < 50)
  ).length;
  const lostCount = leads.filter((l) => l.status === "lost").length;

  return (
    <>
      <DashboardRealtime clientId={clientId} />
      <LeadsClient
        leads={leads}
        counts={{ all: leads.length, hot: hotCount, warm: warmCount, cold: coldCount, lost: lostCount }}
      />
    </>
  );
}

