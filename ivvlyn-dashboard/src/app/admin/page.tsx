import { format } from "date-fns";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Client } from "@/lib/types";
import GlobalStats from "@/components/admin/GlobalStats";
import ClientCard from "@/components/admin/ClientCard";
import RecentActivityFeed from "@/components/admin/RecentActivityFeed";

export default async function AdminHomePage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const resolved = searchParams ? await searchParams : undefined;
  const clientId = resolved?.clientId;
  const activeClientId = typeof clientId === "string" && clientId.length ? clientId : null;

  // In this step we fully implement the "All clients" view.
  // Client-filtered view will be expanded in the next steps.
  if (activeClientId) {
    return (
      <div className="space-y-4 pt-14">
        <h1 className="text-[#0A0A0A] text-[20px] font-medium">Client view</h1>
        <p className="text-[#555] text-[13px]">
          Overview for the selected client will be implemented next.
        </p>
      </div>
    );
  }

  const supabase = await createSupabaseServerClient();

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const dateSubtitle = format(now, "MMMM d, yyyy");

  if (!supabase) {
    return (
      <div className="space-y-4 pt-14">
        <h1 className="text-[#0A0A0A] text-[20px] font-medium">{greeting} — Admin</h1>
        <p className="text-[#555] text-[13px]">
          Configure Supabase env vars to load real analytics.
        </p>
      </div>
    );
  }

  // Global stats
  const { count: totalClientsCount } = await supabase
    .from("clients")
    .select("id", { count: "exact", head: true });

  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfTomorrow = new Date(now);
  startOfTomorrow.setHours(24, 0, 0, 0);

  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfToday.getDate() - 1);

  const { count: leadsTodayCount } = await supabase
    .from("leads")
    .select("id", { count: "exact", head: true })
    .gte("created_at", startOfToday.toISOString())
    .lt("created_at", startOfTomorrow.toISOString());

  const { count: leadsYesterdayCount } = await supabase
    .from("leads")
    .select("id", { count: "exact", head: true })
    .gte("created_at", startOfYesterday.toISOString())
    .lt("created_at", startOfToday.toISOString());

  const leadsDelta = (() => {
    const t = typeof leadsTodayCount === "number" ? leadsTodayCount : 0;
    const y = typeof leadsYesterdayCount === "number" ? leadsYesterdayCount : 0;
    if (y <= 0) return { text: "New today", kind: "up" as const };
    const pct = ((t - y) / y) * 100;
    const abs = Math.round(Math.abs(pct));
    if (pct >= 0) return { text: `↑ ${abs}% from yesterday`, kind: "up" as const };
    return { text: `↓ ${abs}% from yesterday`, kind: "down" as const };
  })();

  const { count: messagesTodayCount } = await supabase
    .from("activities")
    .select("id", { count: "exact", head: true })
    .gte("created_at", startOfToday.toISOString())
    .lt("created_at", startOfTomorrow.toISOString());

  const todayISODate = format(now, "yyyy-MM-dd");
  const { count: visitsTodayCount } = await supabase
    .from("visits")
    .select("id", { count: "exact", head: true })
    .eq("visit_date", todayISODate);

  // Clients list (cards)
  const { data: clientRows } = await supabase
    .from("clients")
    .select("id, name, business_name, industry, agent_type, status, whatsapp_phone_id, instagram_page_id")
    .order("created_at", { ascending: false });

  const clients = (clientRows ?? []) as Client[];

  const clientIds = clients.map((c) => c.id);

  // Compute per-client mini stats (leads today, hot leads, messages today) in-memory.
  const leadsTodayMini = new Map<string, number>();
  const hotLeadsMini = new Map<string, number>();
  const messagesMini = new Map<string, number>();

  if (clientIds.length) {
    const { data: leadsTodayRows } = await supabase
      .from("leads")
      .select("client_id, score")
      .in("client_id", clientIds)
      .gte("created_at", startOfToday.toISOString())
      .lt("created_at", startOfTomorrow.toISOString());

    const leadsTodayTyped = (leadsTodayRows ?? []) as unknown as Array<{
      client_id: string | null;
      score: number | null;
    }>;

    for (const row of leadsTodayTyped) {
      if (!row.client_id) continue;
      leadsTodayMini.set(row.client_id, (leadsTodayMini.get(row.client_id) ?? 0) + 1);
      if (typeof row.score === "number" && row.score >= 70) {
        hotLeadsMini.set(row.client_id, (hotLeadsMini.get(row.client_id) ?? 0) + 1);
      }
    }

    const { data: hotLeadsRows } = await supabase
      .from("leads")
      .select("client_id")
      .in("client_id", clientIds)
      .gte("score", 70);

    const hotLeadsTyped = (hotLeadsRows ?? []) as unknown as Array<{
      client_id: string | null;
    }>;

    for (const row of hotLeadsTyped) {
      if (!row.client_id) continue;
      hotLeadsMini.set(row.client_id, (hotLeadsMini.get(row.client_id) ?? 0) + 1);
    }

    const { data: messagesRows } = await supabase
      .from("activities")
      .select("client_id")
      .in("client_id", clientIds)
      .gte("created_at", startOfToday.toISOString())
      .lt("created_at", startOfTomorrow.toISOString());

    const messagesTyped = (messagesRows ?? []) as unknown as Array<{
      client_id: string | null;
    }>;

    for (const row of messagesTyped) {
      if (!row.client_id) continue;
      messagesMini.set(row.client_id, (messagesMini.get(row.client_id) ?? 0) + 1);
    }
  }

  const activities = await supabase
    .from("activities")
    .select(
      "id, created_at, type, channel, direction, clients(name,business_name), leads(name)"
    )
    .order("created_at", { ascending: false })
    .limit(20);

  const activityTyped = (activities.data ?? []) as unknown as Array<{
    id: string;
    created_at: string;
    type: string | null;
    channel: string | null;
    direction: string | null;
    clients?: { business_name: string | null } | null;
    leads?: { name: string | null } | null;
  }>;

  const activityRows = activityTyped.map((a) => ({
    id: a.id,
    created_at: a.created_at,
    type: a.type,
    channel: a.channel,
    direction: a.direction,
    clientBusinessName: a.clients?.business_name ?? null,
    leadName: a.leads?.name ?? null,
  }));

  return (
    <div className="pt-14 p-8">
      <div>
        <h1 className="text-[#0A0A0A] text-[20px] font-medium">
          {greeting}, {now.toLocaleString(undefined, { hour: "numeric" }) ? "Harshit" : "Harshit"}.
        </h1>
        <p className="text-[#555] text-[13px]">{dateSubtitle}</p>
      </div>

      <div className="mt-6">
        <GlobalStats
          totalClients={typeof totalClientsCount === "number" ? totalClientsCount : 0}
          leadsToday={typeof leadsTodayCount === "number" ? leadsTodayCount : 0}
          leadsDeltaText={leadsDelta.text}
          messagesToday={typeof messagesTodayCount === "number" ? messagesTodayCount : 0}
          visitsToday={typeof visitsTodayCount === "number" ? visitsTodayCount : 0}
        />
      </div>

      <div className="mt-6">
        <div className="text-[#555] text-[11px] uppercase tracking-[0.2em] font-semibold">YOUR CLIENTS</div>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map((c) => (
            <ClientCard
              key={c.id}
              client={c}
              leadsToday={leadsTodayMini.get(c.id) ?? 0}
              hotLeads={hotLeadsMini.get(c.id) ?? 0}
              messagesToday={messagesMini.get(c.id) ?? 0}
            />
          ))}

          <div
            role="button"
            tabIndex={0}
            className="bg-white border border-dashed border-[#E8E8E8] rounded-xl p-6 flex items-center justify-center cursor-pointer hover:border-[#444] transition-colors"
            onClick={() => {
              window.location.href = "/admin/clients/new";
            }}
          >
            <div className="flex flex-col items-center">
              <div className="text-[#0A0A0A] text-3xl leading-none">+</div>
              <div className="mt-3 text-[#555] text-[12px] font-medium">Add Client</div>
            </div>
          </div>
        </div>
      </div>

      <RecentActivityFeed items={activityRows} clients={clients} />
    </div>
  );
}


