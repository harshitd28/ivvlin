import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Visit } from "@/lib/types";
import VisitCalendar from "@/components/dashboard/VisitCalendar";
import DashboardRealtime from "@/components/dashboard/realtime/DashboardRealtime";

export default async function VisitsPage() {
  const supabase = await createSupabaseServerClient();
  const now = new Date();

  if (!supabase) {
    return (
      <div className="p-8">
        <h1 className="text-[#0A0A0A] text-[20px] font-medium">Visits</h1>
        <p className="text-[#555] text-[13px] mt-2">Configure Supabase env vars to load real data.</p>
      </div>
    );
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData.session;
  if (!session) {
    return (
      <div className="p-8">
        <h1 className="text-[#0A0A0A] text-[20px] font-medium">Visits</h1>
        <p className="text-[#555] text-[13px] mt-2">Please sign in again.</p>
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
        <h1 className="text-[#0A0A0A] text-[20px] font-medium">Visits</h1>
        <p className="text-[#555] text-[13px] mt-2">No client linked to this account.</p>
      </div>
    );
  }

  // Load a month range for calendar.
  const start = new Date(now);
  start.setDate(start.getDate() - 7);
  const end = new Date(now);
  end.setDate(end.getDate() + 30);

  const startKey = start.toISOString().slice(0, 10);
  const endKey = end.toISOString().slice(0, 10);

  const { data: visitsRows } = await supabase
    .from("visits")
    .select("id, lead_id, lead_name, visit_date, visit_time, property, status, reminder_sent, notes")
    .eq("client_id", clientId)
    .gte("visit_date", startKey)
    .lte("visit_date", endKey)
    .order("visit_date", { ascending: true });

  const visits = (visitsRows ?? []) as unknown as Visit[];

  return (
    <>
      <DashboardRealtime clientId={clientId} />
      <div className="p-8 pt-0">
        <h1 className="text-[#0A0A0A] text-[20px] font-medium">Visits</h1>
        <p className="text-[#555] text-[13px] mt-2">
          Schedule overview for your lead visits.
        </p>
        <div className="mt-6">
          <VisitCalendar visits={visits} />
        </div>
      </div>
    </>
  );
}

