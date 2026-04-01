import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Channel, Lead } from "@/lib/types";
import DashboardRealtime from "@/components/dashboard/realtime/DashboardRealtime";
import LeadDetailClient from "@/components/dashboard/LeadDetailClient";

export default async function LeadDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return (
      <div className="p-8 pt-0">
        <h1 className="text-[#0A0A0A] text-[22px] font-medium">Lead detail</h1>
        <p className="text-[#555] text-[13px] mt-2">Configure Supabase env vars to load real data.</p>
      </div>
    );
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData.session;

  if (!session) {
    return (
      <div className="p-8 pt-0">
        <h1 className="text-[#0A0A0A] text-[22px] font-medium">Lead detail</h1>
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
      <div className="p-8 pt-0">
        <h1 className="text-[#0A0A0A] text-[22px] font-medium">Lead detail</h1>
        <p className="text-[#555] text-[13px] mt-2">No client linked to this account.</p>
      </div>
    );
  }

  const leadId = params.id;

  const { data: leadRow } = await supabase
    .from("leads")
    .select(
      "lead_id, name, phone, instagram_psid, score, status, stage, channel, source, budget, bhk_preference, location_preference, created_at, last_contact, mode, dnd, preferred_lang, follow_up_step, assigned_to"
    )
    .eq("client_id", clientId)
    .eq("lead_id", leadId)
    .maybeSingle();

  const lead = (leadRow ?? null) as unknown as Lead | null;

  if (!lead) {
    return (
      <div className="p-8 pt-0">
        <h1 className="text-[#0A0A0A] text-[22px] font-medium">Lead detail</h1>
        <p className="text-[#555] text-[13px] mt-2">Lead not found.</p>
      </div>
    );
  }

  const { data: timelineRows } = await supabase
    .from("activities")
    .select("id, created_at, direction, channel, content, type")
    .eq("client_id", clientId)
    .eq("lead_id", leadId)
    .order("created_at", { ascending: true })
    .limit(200);

  const timeline = (timelineRows ?? []) as Array<{
    id: string;
    created_at: string;
    direction: string | null;
    channel: string | null;
    content: string | null;
    type: string | null;
  }>;

  const modeEvents = timeline.filter((t) => t.type === "mode_change");
  const lastModeEvent = modeEvents.length ? modeEvents[modeEvents.length - 1] : null;

  return (
    <>
      <DashboardRealtime clientId={clientId} />
      <div className="pt-0 p-8">
        <LeadDetailClient
          lead={{
            lead_id: lead.lead_id,
            name: lead.name,
            phone: lead.phone,
            instagram_psid: (lead as Lead & { instagram_psid?: string | null }).instagram_psid ?? null,
            channel: lead.channel as Channel,
            score: lead.score,
            status: lead.status,
            mode: lead.mode,
            budget: lead.budget,
            bhk_preference: lead.bhk_preference,
            location_preference: lead.location_preference,
            source: lead.source,
            created_at: lead.created_at,
            last_contact: lead.last_contact,
            follow_up_step: (lead as Lead & { follow_up_step?: number | null }).follow_up_step ?? null,
            stage: lead.stage,
            dnd: (lead as Lead & { dnd?: boolean }).dnd ?? false,
            preferred_lang: (lead as Lead & { preferred_lang?: string | null }).preferred_lang ?? null,
            assigned_to: (lead as Lead & { assigned_to?: string | null }).assigned_to ?? null,
          }}
          timeline={timeline}
          defaultTakenOverAt={lastModeEvent?.created_at ?? null}
        />
      </div>
    </>
  );
}


