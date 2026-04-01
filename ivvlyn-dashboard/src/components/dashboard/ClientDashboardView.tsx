"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { format } from "date-fns";
import type { Channel } from "@/lib/types";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import ChannelBadge from "@/components/shared/ChannelBadge";
import ActivityItem from "@/components/shared/ActivityItem";

type LeadRow = {
  lead_id: string;
  name: string | null;
  score: number | null;
  status: string | null;
  stage: string | null;
  preferred_channel: Channel;
  mode: "ai" | "human";
  last_activity_at: string | null;
  last_message_preview: string | null;
};

type HotLeadRow = LeadRow;

type ActivityRow = {
  id: string;
  created_at: string;
  lead_id: string | null;
  lead_name: string | null;
  channel: string | null;
  direction: string | null;
  content: string | null;
  type: string | null;
};

type ChannelBucket = {
  channel: Channel;
  count: number;
};

type LeadModeUpdateBuilder = {
  update: (payload: { mode: "ai" | "human" }) => {
    eq: (column: string, value: string) => Promise<{ error: { message: string } | null }>;
  };
};

type Props = {
  clientId: string;
  businessName: string;
  status: string | null;
  newLeadsToday: number;
  messagesSentToday: number;
  hotLeadCount: number;
  visitsBookedToday: number;
  channels: ChannelBucket[];
  hotLeads: HotLeadRow[];
  recentLeads: LeadRow[];
  activities: ActivityRow[];
};

const PAGE_SIZE = 20;

function scoreTextColor(score: number) {
  if (score >= 70) return "text-[#DC2626]";
  if (score >= 40) return "text-[#D97706]";
  return "text-[#2563EB]";
}

function channelBarColor(channel: Channel) {
  if (channel === "instagram") return "bg-[#A855F7]";
  if (channel === "facebook") return "bg-[#1877F2]";
  if (channel === "sms") return "bg-[#F59E0B]";
  if (channel === "email") return "bg-[#6B7280]";
  return "bg-[#16A34A]";
}

function ToggleModeButton({
  leadId,
  mode,
  onChanged,
}: {
  leadId: string;
  mode: "ai" | "human";
  onChanged: (next: "ai" | "human") => void;
}) {
  const [loading, setLoading] = useState(false);

  async function onClick() {
    const supabase = createSupabaseBrowserClient();
    if (!supabase || loading) return;
    setLoading(true);
    const nextMode: "ai" | "human" = mode === "ai" ? "human" : "ai";
    const leadsBuilder = supabase.from("leads") as unknown as LeadModeUpdateBuilder;
    const { error } = await leadsBuilder.update({ mode: nextMode }).eq("lead_id", leadId);
    if (!error) {
      onChanged(nextMode);
      void fetch("/webhook/takeover-handler", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead_id: leadId, mode: nextMode, source: "dashboard-home" }),
      });
    }
    setLoading(false);
  }

  return (
    <button
      type="button"
      disabled={loading}
      onClick={onClick}
      className="text-[12px] px-3 py-1.5 rounded-lg border border-[#E8E8E8] bg-white hover:bg-[#f8f8f6] transition-colors duration-150 disabled:opacity-60"
    >
      {loading ? "Updating..." : mode === "ai" ? "Take Over" : "Hand Back to AI"}
    </button>
  );
}

export default function ClientDashboardView({
  clientId,
  businessName,
  status,
  newLeadsToday,
  messagesSentToday,
  hotLeadCount,
  visitsBookedToday,
  channels,
  hotLeads,
  recentLeads,
  activities,
}: Props) {
  const [selectedChannel, setSelectedChannel] = useState<Channel | "all">("all");
  const [page, setPage] = useState(1);
  const [leadModes, setLeadModes] = useState<Record<string, "ai" | "human">>(() =>
    Object.fromEntries(recentLeads.map((l) => [l.lead_id, l.mode]))
  );
  const [hotModes, setHotModes] = useState<Record<string, "ai" | "human">>(() =>
    Object.fromEntries(hotLeads.map((l) => [l.lead_id, l.mode]))
  );
  const [activityFeed, setActivityFeed] = useState<ActivityRow[]>(activities);

  useEffect(() => {
    setLeadModes(Object.fromEntries(recentLeads.map((l) => [l.lead_id, l.mode])));
  }, [recentLeads]);

  useEffect(() => {
    setHotModes(Object.fromEntries(hotLeads.map((l) => [l.lead_id, l.mode])));
  }, [hotLeads]);

  useEffect(() => {
    setActivityFeed(activities);
  }, [activities]);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;

    const channel = supabase
      .channel(`activity-feed-${clientId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "activities", filter: `client_id=eq.${clientId}` },
        async (payload) => {
          const inserted = payload.new as {
            id: string;
            created_at: string;
            lead_id: string | null;
            channel: string | null;
            direction: string | null;
            content: string | null;
            type: string | null;
          };
          let leadName: string | null = null;
          if (inserted.lead_id) {
            const { data } = await supabase
              .from("leads")
              .select("name")
              .eq("lead_id", inserted.lead_id)
              .maybeSingle();
            leadName = (data as { name?: string | null } | null)?.name ?? null;
          }
          const next: ActivityRow = { ...inserted, lead_name: leadName };
          setActivityFeed((prev) => [next, ...prev].slice(0, 50));
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [clientId]);

  const filteredLeads = useMemo(() => {
    if (selectedChannel === "all") return recentLeads;
    return recentLeads.filter((l) => l.preferred_channel === selectedChannel);
  }, [recentLeads, selectedChannel]);

  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedLeads = filteredLeads.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const maxCount = Math.max(1, ...channels.map((c) => c.count));

  const today = format(new Date(), "EEEE, d MMM yyyy");
  const activeState = (status ?? "active").toLowerCase() === "active";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-medium text-[#0A0A0A]">Good morning, {businessName}</h1>
          <div className="mt-2 inline-flex items-center gap-2 text-[12px] text-[#555]">
            <span className={`h-2.5 w-2.5 rounded-full ${activeState ? "bg-[#16A34A]" : "bg-[#DC2626]"}`} />
            {activeState ? "Active" : "Paused"}
          </div>
        </div>
        <div className="text-[13px] text-[#666]">{today}</div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          ["New leads today", newLeadsToday],
          ["Messages sent today", messagesSentToday],
          ["Hot leads (score ≥ 70)", hotLeadCount],
          ["Site visits booked", visitsBookedToday],
        ].map(([label, value]) => (
          <div key={label} className="border border-[#E8E8E8] rounded-xl bg-white p-5">
            <div className="text-[11px] uppercase tracking-[0.14em] text-[#777]">{label}</div>
            <div className="mt-2 text-[30px] font-light text-[#0A0A0A]">{value}</div>
          </div>
        ))}
      </div>

      <section className="border border-[#E8E8E8] rounded-xl bg-white p-5">
        <div className="text-[11px] uppercase tracking-[0.14em] text-[#777]">Channel Breakdown</div>
        <div className="mt-4 space-y-3">
          {channels.map((bucket) => (
            <button
              key={bucket.channel}
              type="button"
              onClick={() => {
                setSelectedChannel((prev) => (prev === bucket.channel ? "all" : bucket.channel));
                setPage(1);
              }}
              className={`w-full text-left border rounded-lg p-3 transition-colors ${
                selectedChannel === bucket.channel ? "border-[#0A0A0A] bg-[#fafaf8]" : "border-[#E8E8E8] hover:bg-[#fafaf8]"
              }`}
            >
              <div className="flex items-center gap-3">
                <ChannelBadge channel={bucket.channel} />
                <div className="flex-1 h-2 bg-[#f1f1ef] rounded-full overflow-hidden">
                  <div className={`h-full ${channelBarColor(bucket.channel)}`} style={{ width: `${(bucket.count / maxCount) * 100}%` }} />
                </div>
                <span className="text-[12px] text-[#444] font-medium">{bucket.count}</span>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
        <div className="space-y-6">
          <div>
            <div className="text-[11px] uppercase tracking-[0.14em] text-[#777]">Hot Leads</div>
            <div className="mt-3 space-y-3">
              {hotLeads.map((lead) => (
                <div key={lead.lead_id} className="border border-[#E8E8E8] rounded-xl bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[14px] font-medium text-[#0A0A0A] truncate">{lead.name ?? "Lead"}</div>
                      <div className="mt-1 inline-flex items-center gap-2">
                        <ChannelBadge channel={lead.preferred_channel} />
                        <span className={`text-[12px] font-semibold ${scoreTextColor(lead.score ?? 0)}`}>{lead.score ?? 0}</span>
                      </div>
                    </div>
                    <ToggleModeButton
                      leadId={lead.lead_id}
                      mode={hotModes[lead.lead_id] ?? lead.mode}
                      onChanged={(next) => setHotModes((prev) => ({ ...prev, [lead.lead_id]: next }))}
                    />
                  </div>
                  <div className="mt-3 text-[12px] text-[#555]">
                    {lead.last_message_preview ?? "No messages yet"}
                  </div>
                  <div className="mt-1 text-[11px] text-[#888]">{lead.last_activity_at ? format(new Date(lead.last_activity_at), "hh:mm a") : "—"}</div>
                </div>
              ))}
              {hotLeads.length === 0 ? (
                <div className="border border-[#E8E8E8] rounded-xl bg-white p-5 text-[13px] text-[#777] text-center">
                  No hot leads found.
                </div>
              ) : null}
            </div>
          </div>

          <div className="border border-[#E8E8E8] rounded-xl bg-white overflow-hidden">
            <div className="px-4 py-3 border-b border-[#E8E8E8] text-[11px] uppercase tracking-[0.14em] text-[#777]">
              Recent Leads {selectedChannel !== "all" ? `(Filtered: ${selectedChannel})` : ""}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-[0.14em] text-[#777] border-b border-[#efefef]">
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Channel</th>
                    <th className="px-4 py-3">Score</th>
                    <th className="px-4 py-3">Stage</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Last Activity</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedLeads.map((lead) => (
                    <tr key={lead.lead_id} className="border-b border-[#f1f1f1] text-[13px]">
                      <td className="px-4 py-3 text-[#111]">{lead.name ?? "Lead"}</td>
                      <td className="px-4 py-3"><ChannelBadge channel={lead.preferred_channel} /></td>
                      <td className={`px-4 py-3 font-semibold ${scoreTextColor(lead.score ?? 0)}`}>{lead.score ?? 0}</td>
                      <td className="px-4 py-3 text-[#555]">{lead.stage ?? "—"}</td>
                      <td className="px-4 py-3 text-[#555]">{lead.status ?? "—"}</td>
                      <td className="px-4 py-3 text-[#666]">
                        {lead.last_activity_at ? format(new Date(lead.last_activity_at), "dd MMM, hh:mm a") : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          <ToggleModeButton
                            leadId={lead.lead_id}
                            mode={leadModes[lead.lead_id] ?? lead.mode}
                            onChanged={(next) => setLeadModes((prev) => ({ ...prev, [lead.lead_id]: next }))}
                          />
                          <Link href={`/dashboard/leads/${encodeURIComponent(lead.lead_id)}`} className="text-[#0A0A0A] hover:underline">
                            View
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 flex items-center justify-between">
              <span className="text-[12px] text-[#777]">
                Page {currentPage} of {totalPages}
              </span>
              <div className="inline-flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 text-[12px] border border-[#E8E8E8] rounded-lg hover:bg-[#fafaf8] transition-colors duration-150 disabled:opacity-50"
                >
                  Prev
                </button>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 text-[12px] border border-[#E8E8E8] rounded-lg hover:bg-[#fafaf8] transition-colors duration-150 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>

        <aside className="border border-[#E8E8E8] rounded-xl bg-white overflow-hidden h-fit">
          <div className="px-4 py-3 border-b border-[#E8E8E8] text-[11px] uppercase tracking-[0.14em] text-[#777]">
            Activity Feed
          </div>
          <div>
            {activityFeed.map((a) => (
              <ActivityItem key={a.id} activity={a} />
            ))}
            {activityFeed.length === 0 ? (
              <div className="p-5 text-center text-[13px] text-[#777]">No activity yet.</div>
            ) : null}
          </div>
        </aside>
      </section>
    </div>
  );
}

