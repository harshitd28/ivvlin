import { format, formatDistanceToNow } from "date-fns";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Channel, Client, Lead, Visit } from "@/lib/types";
import LeadCard from "@/components/dashboard/LeadCard";
import DashboardRealtime from "@/components/dashboard/realtime/DashboardRealtime";

import StatCard from "@/components/shared/StatCard";

function greetingForDate(d: Date) {
  const h = d.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function formatAvgResponseSeconds(avgSeconds: number) {
  if (avgSeconds < 60) {
    const s = Math.round(avgSeconds);
    return `${s}s`;
  }
  const m = Math.round(avgSeconds / 60);
  return `${m} min`;
}

function channelColor(channel: Channel) {
  if (channel === "instagram") return { bar: "bg-[#A855F7]", track: "bg-[#2A1F0A]" };
  return { bar: "bg-[#16A34A]", track: "bg-[#10311f]" };
}

export default async function ClientHomePage() {
  const supabase = await createSupabaseServerClient();
  const now = new Date();

  if (!supabase) {
    return (
      <div className="pt-0 space-y-4">
        <h1 className="text-[#0A0A0A] text-[20px] font-medium">Dashboard</h1>
        <p className="text-[#555] text-[13px]">Configure Supabase env vars to load real data.</p>
      </div>
    );
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData.session;

  if (!session) {
    return (
      <div className="pt-0 space-y-4">
        <h1 className="text-[#0A0A0A] text-[20px] font-medium">Dashboard</h1>
        <p className="text-[#555] text-[13px]">Please sign in again.</p>
      </div>
    );
  }

  const userId = session.user.id;

  const { data: profile } = await supabase
    .from("profiles")
    .select("client_id, full_name, email")
    .eq("id", userId)
    .maybeSingle();

  const typedProfile = profile as unknown as {
    client_id?: string | null;
    full_name?: string | null;
    email?: string | null;
  } | null;

  const clientId = typedProfile?.client_id ?? null;
  const ownerName = typedProfile?.full_name ?? "there";
  const ownerEmail = typedProfile?.email ?? "client@example.com";

  if (!clientId) {
    return (
      <div className="space-y-4">
        <h1 className="text-[#0A0A0A] text-[20px] font-medium">Dashboard</h1>
        <p className="text-[#555] text-[13px]">No client linked to this account.</p>
      </div>
    );
  }

  const { data: clientRow } = await supabase
    .from("clients")
    .select("id, business_name, agent_type, industry, whatsapp_phone_id, instagram_page_id")
    .eq("id", clientId)
    .maybeSingle();

  const typedClient = (clientRow ?? null) as unknown as
    | Client
    | (null | undefined);

  const whatsappConfigured = !!typedClient?.whatsapp_phone_id;
  const instagramConfigured = !!typedClient?.instagram_page_id;

  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfTomorrow = new Date(now);
  startOfTomorrow.setHours(24, 0, 0, 0);
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfToday.getDate() - 1);

  const todayISODate = format(now, "yyyy-MM-dd");
  const start24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

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

  // Avg response time approximation: average diff between created_at and last_reply_at.
  const { data: leadTimingRows } = await supabase
    .from("leads")
    .select("created_at, last_reply_at")
    .eq("client_id", clientId)
    .not("last_reply_at", "is", null);

  const timingTyped = (leadTimingRows ?? []) as unknown as Array<{
    created_at: string;
    last_reply_at: string;
  }>;

  const avgResponseSeconds = timingTyped.length
    ? timingTyped.reduce((acc, r) => {
        const diffMs = new Date(r.last_reply_at).getTime() - new Date(r.created_at).getTime();
        return acc + diffMs / 1000;
      }, 0) / timingTyped.length
    : 0;

  const greeting = greetingForDate(now);

  // Channel performance (last 24h)
  const [waSent, waReceived, igSent, igReceived] = await Promise.all([
    supabase
      .from("conversations")
      .select("id", { count: "exact", head: true })
      .eq("client_id", clientId)
      .eq("channel", "whatsapp")
      .eq("direction", "outbound")
      .gte("created_at", start24h.toISOString()),
    supabase
      .from("conversations")
      .select("id", { count: "exact", head: true })
      .eq("client_id", clientId)
      .eq("channel", "whatsapp")
      .eq("direction", "inbound")
      .gte("created_at", start24h.toISOString()),
    supabase
      .from("conversations")
      .select("id", { count: "exact", head: true })
      .eq("client_id", clientId)
      .eq("channel", "instagram")
      .eq("direction", "outbound")
      .gte("created_at", start24h.toISOString()),
    supabase
      .from("conversations")
      .select("id", { count: "exact", head: true })
      .eq("client_id", clientId)
      .eq("channel", "instagram")
      .eq("direction", "inbound")
      .gte("created_at", start24h.toISOString()),
  ]);

  const waSentCount = waSent.count ?? 0;
  const waReceivedCount = waReceived.count ?? 0;
  const igSentCount = igSent.count ?? 0;
  const igReceivedCount = igReceived.count ?? 0;

  const totalWa = waSentCount + waReceivedCount;
  const waProgress = totalWa > 0 ? Math.round((waSentCount / totalWa) * 100) : 0;

  const totalIg = igSentCount + igReceivedCount;
  const igProgress = totalIg > 0 ? Math.round((igSentCount / totalIg) * 100) : 0;

  // Hot leads
  const { data: hotLeadsRows } = await supabase
    .from("leads")
    .select(
      "id, lead_id, name, phone, score, channel, budget, bhk_preference, location_preference, message, last_reply_at"
    )
    .eq("client_id", clientId)
    .gte("score", 70)
    .order("score", { ascending: false })
    .limit(5);

  const hotLeadsTyped = (hotLeadsRows ?? []) as unknown as Lead[];

  const hotLeadIds = hotLeadsTyped.map((l) => l.lead_id).filter((v): v is string => typeof v === "string");

  // Latest conversation preview per lead.
  const latestConvByLead = new Map<string, { message: string | null; created_at: string | null }>();
  if (hotLeadIds.length) {
    const { data: convRows } = await supabase
      .from("conversations")
      .select("lead_id, message, created_at")
      .eq("client_id", clientId)
      .in("lead_id", hotLeadIds)
      .order("created_at", { ascending: false })
      .limit(100);

    const convTyped = (convRows ?? []) as unknown as Array<{
      lead_id: string;
      message: string;
      created_at: string;
    }>;

    for (const c of convTyped) {
      if (latestConvByLead.has(c.lead_id)) continue;
      latestConvByLead.set(c.lead_id, { message: c.message, created_at: c.created_at });
    }
  }

  // Visits today mapped by lead_id
  const { data: visitsTodayRows } = await supabase
    .from("visits")
    .select("id, lead_id, visit_date, visit_time, property, status, reminder_sent")
    .eq("client_id", clientId)
    .eq("visit_date", todayISODate);

  const visitsTyped = (visitsTodayRows ?? []) as unknown as Visit[];
  const visitByLead = new Map<string, Visit>();
  for (const v of visitsTyped) {
    if (!v.lead_id) continue;
    visitByLead.set(v.lead_id, v);
  }

  // Activities last 24 hours
  const { data: activityRowsRaw } = await supabase
    .from("activities")
    .select("id, created_at, type, channel, direction, content")
    .eq("client_id", clientId)
    .gte("created_at", start24h.toISOString())
    .order("created_at", { ascending: false })
    .limit(10);

  const activityTyped = (activityRowsRaw ?? []) as unknown as Array<{
    id: string;
    created_at: string;
    type: string | null;
    channel: string | null;
    direction: string | null;
    content: string | null;
  }>;

  return (
    <div className="pt-0 p-8 space-y-6">
      <DashboardRealtime clientId={clientId} />
      <div>
        <h1 className="text-[#0A0A0A] text-[20px] font-light">
          {greeting}, {ownerName}.
        </h1>
        <p className="text-[#555] text-[13px] mt-2">Here is what Vaani did last night.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="NEW LEADS TODAY" value={newLeadsTodayCount ?? 0} />
        <StatCard label="HOT LEADS" value={hotLeadsCount ?? 0} />
        <StatCard label="VISITS TODAY" value={visitsTodayCount ?? 0} />
        <StatCard label="AVG RESPONSE TIME" value={formatAvgResponseSeconds(avgResponseSeconds)} />
      </div>

      <section className="border border-[#E8E8E8] rounded-xl p-5">
        <div className="text-[#555] text-[11px] uppercase tracking-[0.2em] font-semibold">
          CHANNEL PERFORMANCE
        </div>

        <div className="mt-4 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 min-w-[130px]">
              <span className="h-2.5 w-2.5 rounded-full bg-[#16A34A]" />
              <span className="text-[#0A0A0A] text-[13px] font-medium">WhatsApp</span>
            </div>
            <div className="flex-1 h-2 bg-[#10311f] rounded-full overflow-hidden">
              <div className="h-full bg-[#16A34A]" style={{ width: `${waProgress}%` }} />
            </div>
            <div className="text-[#0A0A0A] text-[13px] font-medium min-w-[90px] text-right">{waSentCount + waReceivedCount} messages</div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 min-w-[130px]">
              <span className="h-2.5 w-2.5 rounded-full bg-[#A855F7]" />
              <span className="text-[#0A0A0A] text-[13px] font-medium">Instagram</span>
            </div>

            {instagramConfigured ? (
              <>
                <div className="flex-1 h-2 bg-[#2A1F0A] rounded-full overflow-hidden">
                  <div className="h-full bg-[#A855F7]" style={{ width: `${igProgress}%` }} />
                </div>
                <div className="text-[#0A0A0A] text-[13px] font-medium min-w-[90px] text-right">
                  {igSentCount + igReceivedCount} messages
                </div>
              </>
            ) : (
              <div className="flex-1 text-[#888] text-[13px]">
                Instagram not connected.{" "}
                <a href="/dashboard/settings" className="underline underline-offset-4 text-[#0A0A0A]">
                  Connect Instagram →
                </a>
              </div>
            )}
          </div>
        </div>
      </section>

      <section>
        <div className="text-[#555] text-[11px] uppercase tracking-[0.2em] font-semibold">
          HOT LEADS — CALL THESE FIRST
        </div>

        <div className="mt-4 space-y-3">
          {hotLeadsTyped.length === 0 ? (
            <div className="text-[#444] text-[13px] p-6 border border-[#E8E8E8] rounded-xl text-center">
              No hot leads yet.
            </div>
          ) : (
            hotLeadsTyped.map((lead) => {
              const conv = latestConvByLead.get(lead.lead_id) ?? null;
              const preview = conv?.message ?? null;
              const at = conv?.created_at ?? null;
              return (
                <LeadCard
                  key={lead.lead_id}
                  lead={lead}
                  channel={lead.channel}
                  lastMessagePreview={preview}
                  lastMessageAt={at}
                  visit={visitByLead.get(lead.lead_id) ?? null}
                />
              );
            })
          )}
        </div>
      </section>

      <section>
        <div className="text-[#555] text-[11px] uppercase tracking-[0.2em] font-semibold">VISITS TODAY</div>
        <div className="mt-4 border border-[#E8E8E8] rounded-xl overflow-hidden">
          {visitsTyped.length === 0 ? (
            <div className="p-6 text-center text-[#444] text-[13px]">No visits scheduled today.</div>
          ) : (
            <div className="divide-y divide-[#2A2A2A]">
              {visitsTyped.map((v) => (
                <div key={v.id} className="flex items-center justify-between px-5 py-4">
                  <div className="min-w-[120px] text-[#555] text-[13px]">
                    {v.visit_time ?? "—"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[#0A0A0A] text-[13px] font-medium truncate">{v.lead_name ?? "Lead"}</div>
                    <div className="text-[#555] text-[12px] mt-1 truncate">
                      {v.property ?? "Property"}
                    </div>
                  </div>
                  <div className="text-[#16A34A] text-[12px] font-medium">
                    {v.reminder_sent ? "Reminder sent ✓" : "⚠ Reminder pending"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section>
        <div className="text-[#555] text-[11px] uppercase tracking-[0.2em] font-semibold">
          VAANI'S LAST 24 HOURS
        </div>

        <div className="mt-4 border border-[#E8E8E8] rounded-xl overflow-hidden">
          {activityTyped.length === 0 ? (
            <div className="p-6 text-center text-[#444] text-[13px]">No activity yet.</div>
          ) : (
            <div className="divide-y divide-[#2A2A2A]">
              {activityTyped.map((a) => (
                <div key={a.id} className="flex items-start justify-between px-5 py-4">
                  <div className="text-[#666] text-[12px]">
                    {a.type ?? "Activity"}{a.content ? `: ${a.content}` : ""}
                  </div>
                  <div className="text-[#444] text-[11px] whitespace-nowrap ml-4">
                    {formatDistanceToNow(new Date(a.created_at), { addSuffix: false })} ago
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}


