import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Channel, Lead } from "@/lib/types";
import { activityOccurredAt } from "@/lib/activities/time";
import { rowToThreadMessage, type ConversationRowInput } from "@/lib/conversations/thread-map";
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
      "lead_id, name, phone, email, instagram_psid, score, status, stage, channel, source, budget, bhk_preference, location_preference, created_at, last_contact, mode, dnd, preferred_lang, follow_up_step, assigned_to, visit_date, visit_time, property_interest, all_sources, owner_summary, urgency, intent, assigned_to_user_id, inbox_status, first_response_due_at, sla_breached_at, last_customer_message_at, last_agent_response_at"
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

  const { data: activityRows } = await supabase
    .from("activities")
    .select("id, timestamp, created_at, direction, channel, content, type")
    .eq("client_id", clientId)
    .eq("lead_id", leadId)
    .order("timestamp", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(200);

  const activityItems = (activityRows ?? [])
    .map((r) => {
      const at = activityOccurredAt(r);
      if (!at) return null;
      return {
        id: `activity:${r.id}`,
        created_at: at,
        direction: r.direction,
        channel: r.channel,
        content: r.content,
        type: r.type,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const modeEvents = activityItems.filter((t) => t.type === "mode_change");
  const lastModeEvent = modeEvents.length ? modeEvents[modeEvents.length - 1] : null;

  const { data: convTimelineRows } = await supabase
    .from("conversations")
    .select("id, content, message, timestamp, created_at, direction, channel, metadata, sender")
    .eq("client_id", clientId)
    .eq("lead_id", leadId)
    .order("timestamp", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(200);

  const conversationItems = (convTimelineRows ?? []).map((r) => {
    const tm = rowToThreadMessage(r as ConversationRowInput);
    return {
      id: `conversation:${r.id}`,
      created_at: tm.created_at,
      direction: tm.direction,
      channel: tm.channel,
      content: tm.message,
      type: tm.is_automated ? "automated_message" : "message",
    };
  });

  const timeline = [...activityItems, ...conversationItems].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  return (
    <>
      <DashboardRealtime clientId={clientId} />
      <div className="pt-0 p-8">
        <LeadDetailClient
          lead={{
            lead_id: lead.lead_id,
            name: lead.name,
            phone: lead.phone,
            email: lead.email ?? null,
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
            visit_date: lead.visit_date ?? null,
            visit_time: lead.visit_time ?? null,
            property_interest: lead.property_interest ?? null,
            all_sources: lead.all_sources ?? null,
            owner_summary: lead.owner_summary ?? null,
            urgency: lead.urgency ?? null,
            intent: lead.intent ?? null,
            assigned_to_user_id: (lead as Lead).assigned_to_user_id ?? null,
            inbox_status: (lead as Lead).inbox_status ?? null,
            first_response_due_at: (lead as Lead).first_response_due_at ?? null,
            sla_breached_at: (lead as Lead).sla_breached_at ?? null,
            last_customer_message_at: (lead as Lead).last_customer_message_at ?? null,
            last_agent_response_at: (lead as Lead).last_agent_response_at ?? null,
          }}
          timeline={timeline}
          defaultTakenOverAt={lastModeEvent?.created_at ?? null}
        />
      </div>
    </>
  );
}


