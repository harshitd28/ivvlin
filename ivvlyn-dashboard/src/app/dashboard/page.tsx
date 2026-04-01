import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Channel, Lead } from "@/lib/types";
import DashboardRealtime from "@/components/dashboard/realtime/DashboardRealtime";
import ClientDashboardView from "@/components/dashboard/ClientDashboardView";

export default async function ClientHomePage() {
  const supabase = await createSupabaseServerClient();
  const now = new Date();

  if (!supabase) {
    return (
      <div className="pt-0 space-y-4">
        <h1 className="text-[#0A0A0A] text-[22px] font-medium">Dashboard</h1>
        <p className="text-[#555] text-[13px]">Configure Supabase env vars to load real data.</p>
      </div>
    );
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData.session;

  if (!session) {
    return (
      <div className="pt-0 space-y-4">
        <h1 className="text-[#0A0A0A] text-[22px] font-medium">Dashboard</h1>
        <p className="text-[#555] text-[13px]">Please sign in again.</p>
      </div>
    );
  }

  const userId = session.user.id;

  const { data: profile } = await supabase
    .from("profiles")
    .select("client_id")
    .eq("id", userId)
    .maybeSingle();

  const typedProfile = profile as unknown as {
    client_id?: string | null;
  } | null;

  const clientId = typedProfile?.client_id ?? null;
  if (!clientId) {
    return (
      <div className="space-y-4">
        <h1 className="text-[#0A0A0A] text-[22px] font-medium">Dashboard</h1>
        <p className="text-[#555] text-[13px]">No client linked to this account.</p>
      </div>
    );
  }

  const { data: clientRow } = await supabase
    .from("clients")
    .select("id, business_name, status, whatsapp_phone_id, instagram_page_id")
    .eq("id", clientId)
    .maybeSingle();

  const typedClient = (clientRow ?? null) as unknown as {
    business_name?: string | null;
    status?: string | null;
    whatsapp_phone_id?: string | null;
    instagram_page_id?: string | null;
  } | null;

  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfTomorrow = new Date(now);
  startOfTomorrow.setHours(24, 0, 0, 0);
  const todayISODate = now.toISOString().slice(0, 10);
  const monthAgo = new Date(now);
  monthAgo.setDate(monthAgo.getDate() - 30);

  const { count: newLeadsTodayCount } = await supabase
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("client_id", clientId)
    .gte("created_at", startOfToday.toISOString())
    .lt("created_at", startOfTomorrow.toISOString());

  const { count: hotLeadsCount } = await supabase
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("client_id", clientId)
    .gte("score", 70);

  const { count: visitsTodayCount } = await supabase
    .from("visits")
    .select("id", { count: "exact", head: true })
    .eq("client_id", clientId)
    .eq("visit_date", todayISODate);

  const { count: messagesSentTodayCount } = await supabase
    .from("activities")
    .select("id", { count: "exact", head: true })
    .eq("client_id", clientId)
    .eq("direction", "outbound")
    .gte("created_at", startOfToday.toISOString())
    .lt("created_at", startOfTomorrow.toISOString());

  const { count: visitsBookedTodayCount } = await supabase
    .from("visits")
    .select("id", { count: "exact", head: true })
    .eq("client_id", clientId)
    .gte("created_at", startOfToday.toISOString())
    .lt("created_at", startOfTomorrow.toISOString());

  const { data: hotLeadsRows } = await supabase
    .from("leads")
    .select(
      "id, lead_id, name, score, status, stage, preferred_channel, mode, last_reply_at, message"
    )
    .eq("client_id", clientId)
    .gte("score", 70)
    .neq("status", "lost")
    .order("score", { ascending: false })
    .limit(12);
  const hotLeads = (hotLeadsRows ?? []) as unknown as Lead[];

  const { data: recentLeadsRaw } = await supabase
    .from("leads")
    .select("lead_id, name, score, status, stage, preferred_channel, mode, last_reply_at, created_at")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(220);

  const recentLeads = (recentLeadsRaw ?? []) as unknown as Array<{
    lead_id: string;
    name: string | null;
    score: number | null;
    status: string | null;
    stage: string | null;
    preferred_channel: Channel;
    mode: "ai" | "human";
    last_reply_at: string | null;
    created_at: string;
  }>;

  const { data: channelRows } = await supabase
    .from("leads")
    .select("preferred_channel")
    .eq("client_id", clientId)
    .gte("created_at", monthAgo.toISOString());

  const buckets = new Map<Channel, number>();
  for (const row of (channelRows ?? []) as Array<{ preferred_channel: Channel | null }>) {
    const ch = row.preferred_channel;
    if (!ch) continue;
    buckets.set(ch, (buckets.get(ch) ?? 0) + 1);
  }

  if ((typedClient?.whatsapp_phone_id ?? null) && !buckets.has("whatsapp")) buckets.set("whatsapp", 0);
  if ((typedClient?.instagram_page_id ?? null) && !buckets.has("instagram")) buckets.set("instagram", 0);

  const channels = Array.from(buckets.entries()).map(([channel, count]) => ({ channel, count }));

  const leadNameMap = new Map<string, string | null>();
  for (const lead of recentLeads) leadNameMap.set(lead.lead_id, lead.name);

  const { data: activityRowsRaw } = await supabase
    .from("activities")
    .select("id, created_at, lead_id, type, channel, direction, content")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(50);

  const activities = (activityRowsRaw ?? []) as Array<{
    id: string;
    created_at: string;
    lead_id: string | null;
    type: string | null;
    channel: string | null;
    direction: string | null;
    content: string | null;
  }>;

  const activityByLead = new Map<string, { at: string; text: string | null }>();
  for (const a of activities) {
    if (!a.lead_id) continue;
    if (activityByLead.has(a.lead_id)) continue;
    activityByLead.set(a.lead_id, { at: a.created_at, text: a.content ?? a.type });
  }

  const recentLeadsWithActivity = recentLeads.map((l) => {
    const a = activityByLead.get(l.lead_id);
    return {
      lead_id: l.lead_id,
      name: l.name,
      score: l.score,
      status: l.status,
      stage: l.stage,
      preferred_channel: l.preferred_channel,
      mode: l.mode,
      last_activity_at: a?.at ?? l.last_reply_at ?? l.created_at,
      last_message_preview: a?.text ?? null,
    };
  });

  const hotLeadList = hotLeads.map((l) => {
    const a = activityByLead.get(l.lead_id);
    return {
      lead_id: l.lead_id,
      name: l.name,
      score: l.score,
      status: l.status,
      stage: l.stage,
      preferred_channel: l.preferred_channel,
      mode: l.mode,
      last_activity_at: a?.at ?? l.last_reply_at ?? null,
      last_message_preview: a?.text ?? l.message ?? null,
    };
  });

  const activityFeed = activities.map((a) => ({
    ...a,
    lead_name: a.lead_id ? leadNameMap.get(a.lead_id) ?? null : null,
  }));

  return (
    <div className="pt-0 p-8">
      <DashboardRealtime clientId={clientId} />
      <ClientDashboardView
        clientId={clientId}
        businessName={typedClient?.business_name ?? "Business"}
        status={typedClient?.status ?? "active"}
        newLeadsToday={newLeadsTodayCount ?? 0}
        messagesSentToday={messagesSentTodayCount ?? 0}
        hotLeadCount={hotLeadsCount ?? 0}
        visitsBookedToday={visitsBookedTodayCount ?? 0}
        channels={channels}
        hotLeads={hotLeadList}
        recentLeads={recentLeadsWithActivity}
        activities={activityFeed}
      />
    </div>
  );
}
