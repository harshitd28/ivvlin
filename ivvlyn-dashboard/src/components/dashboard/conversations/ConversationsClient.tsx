"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import type { Channel } from "@/lib/types";
import type { ThreadMessage } from "@/components/dashboard/ConversationThread";
import ConversationThread from "@/components/dashboard/ConversationThread";
import InboxTeamPanel, { type TeamMember } from "@/components/dashboard/conversations/InboxTeamPanel";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { rowToThreadMessage, type ConversationRowInput } from "@/lib/conversations/thread-map";
import { isLatestConversationResolved, leadNeedsReply } from "@/lib/inbox/lead-filters";
import type { MessagingInsights } from "@/lib/inbox/messaging-insights";
import type { OutboundJobQueueCounts } from "@/lib/inbox/messaging-queue-counts";

export type InboxQueueFilter =
  | "all"
  | "unassigned"
  | "mine"
  | "pinned"
  | "open"
  | "resolved"
  | "unread"
  | "human"
  | "automation";

type LeadThreadListItem = {
  lead_id: string;
  lead_name: string | null;
  phone: string | null;
  email: string | null;
  channel: Channel;
  preview: string | null;
  created_at: string;
  score: number | null;
  mode: "ai" | "human";
  assigned_to_user_id: string | null;
  inbox_starred: boolean;
  first_response_due_at: string | null;
  inbox_locked_until: string | null;
  inbox_locked_by: string | null;
  last_customer_message_at: string | null;
  last_agent_response_at: string | null;
  latest_conversation_status: string | null;
};

type Props = {
  clientId: string;
  items: LeadThreadListItem[];
  activeLeadId: string | null;
  threadMessages: ThreadMessage[];
  team: TeamMember[];
  currentUserId: string | null;
  inboxFilter: InboxQueueFilter;
  /** Server-provided queue + lag + webhook/dead samples (service role + tenant). */
  messagingInsights?: MessagingInsights | null;
};

export function parseInboxFilter(raw: string | undefined): InboxQueueFilter {
  const set: InboxQueueFilter[] = [
    "all",
    "unassigned",
    "mine",
    "pinned",
    "open",
    "resolved",
    "unread",
    "human",
    "automation",
  ];
  return raw && set.includes(raw as InboxQueueFilter) ? (raw as InboxQueueFilter) : "all";
}

export function buildConversationsPath(leadId: string | null, filter: InboxQueueFilter) {
  const p = new URLSearchParams();
  if (leadId) p.set("leadId", leadId);
  if (filter !== "all") p.set("filter", filter);
  const qs = p.toString();
  return qs ? `/dashboard/conversations?${qs}` : "/dashboard/conversations";
}

export default function ConversationsClient({
  clientId,
  items,
  activeLeadId,
  threadMessages,
  team,
  currentUserId,
  inboxFilter,
  messagingInsights = null,
}: Props) {
  const router = useRouter();

  const [listItems, setListItems] = useState(items);
  const [query, setQuery] = useState("");
  const [channelTab, setChannelTab] = useState<"all" | "whatsapp" | "instagram">("all");
  const [queueFilter, setQueueFilter] = useState<InboxQueueFilter>(inboxFilter);
  const [activeId, setActiveId] = useState<string | null>(activeLeadId);
  const [threadByLead, setThreadByLead] = useState<Record<string, ThreadMessage[]>>(() =>
    activeLeadId ? { [activeLeadId]: threadMessages } : {}
  );
  const [loadingThread, setLoadingThread] = useState(false);
  const [liveInsights, setLiveInsights] = useState<MessagingInsights | null>(() => messagingInsights ?? null);

  useEffect(() => {
    setLiveInsights(messagingInsights ?? null);
  }, [messagingInsights]);

  const refreshMessagingInsights = useCallback(async () => {
    if (clientId === "demo-client" || !currentUserId) return;
    const res = await fetch("/api/inbox/messaging-insights", { credentials: "include" });
    const d = (await res.json().catch(() => ({}))) as { ok?: boolean; insights?: MessagingInsights };
    if (res.ok && d.ok && d.insights) setLiveInsights(d.insights);
  }, [clientId, currentUserId]);

  useEffect(() => {
    if (clientId === "demo-client" || !currentUserId) return;
    const id = window.setInterval(() => void refreshMessagingInsights(), 45_000);
    const t0 = window.setTimeout(() => void refreshMessagingInsights(), 8_000);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(t0);
    };
  }, [clientId, currentUserId, refreshMessagingInsights]);

  useEffect(() => {
    setListItems(items);
  }, [items]);

  useEffect(() => {
    setQueueFilter(inboxFilter);
  }, [inboxFilter]);

  useEffect(() => {
    setActiveId(activeLeadId);
    if (activeLeadId) {
      setThreadByLead((prev) => ({ ...prev, [activeLeadId]: threadMessages }));
    }
  }, [activeLeadId, threadMessages]);

  useEffect(() => {
    if (clientId === "demo-client" || !currentUserId) return;
    const ping = () => void fetch("/api/inbox/presence", { method: "POST", credentials: "include" }).catch(() => null);
    ping();
    const id = window.setInterval(ping, 60_000);
    return () => window.clearInterval(id);
  }, [clientId, currentUserId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = listItems;
    if (channelTab !== "all") list = list.filter((i) => i.channel === channelTab);
    if (queueFilter === "unassigned") list = list.filter((i) => !i.assigned_to_user_id);
    if (queueFilter === "mine" && currentUserId) list = list.filter((i) => i.assigned_to_user_id === currentUserId);
    if (queueFilter === "mine" && !currentUserId) list = [];
    if (queueFilter === "open") {
      list = list.filter((i) => !isLatestConversationResolved(i.latest_conversation_status));
    }
    if (queueFilter === "resolved") {
      list = list.filter((i) => isLatestConversationResolved(i.latest_conversation_status));
    }
    if (queueFilter === "unread") {
      list = list.filter((i) => leadNeedsReply(i));
    }
    if (queueFilter === "pinned") {
      list = list.filter((i) => i.inbox_starred);
    }
    if (queueFilter === "human") list = list.filter((i) => i.mode === "human");
    if (queueFilter === "automation") list = list.filter((i) => i.mode === "ai");
    if (!q.length) return list;
    return list.filter((i) => (i.lead_name ?? "").toLowerCase().includes(q) || (i.preview ?? "").toLowerCase().includes(q));
  }, [listItems, query, channelTab, queueFilter, currentUserId]);

  const active = listItems.find((i) => i.lead_id === activeId) ?? null;
  const activeThread = activeId ? threadByLead[activeId] ?? [] : [];

  function navigateFilter(next: InboxQueueFilter) {
    setQueueFilter(next);
    router.replace(buildConversationsPath(activeId, next));
  }

  async function openLead(leadId: string) {
    setActiveId(leadId);
    router.replace(buildConversationsPath(leadId, queueFilter));

    if (threadByLead[leadId]) return;
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    setLoadingThread(true);
    const { data } = await supabase
      .from("conversations")
      .select(
        "id, lead_id, channel, direction, sender, content, message, timestamp, created_at, metadata, conversation_status, status, lifecycle_state, client_id"
      )
      .eq("client_id", clientId)
      .eq("lead_id", leadId)
      .order("timestamp", { ascending: true })
      .order("created_at", { ascending: true })
      .limit(120);
    const mapped = (data ?? []).map((row) => rowToThreadMessage(row as ConversationRowInput));
    setThreadByLead((prev) => ({ ...prev, [leadId]: mapped }));
    setLoadingThread(false);
  }

  function refreshLeadData() {
    router.refresh();
  }

  const qc: OutboundJobQueueCounts | null = liveInsights?.counts ?? null;
  const lagSec = liveInsights?.pending_lag_seconds;
  const queueAttention =
    qc &&
    (qc.failed > 0 ||
      qc.dead > 0 ||
      qc.pending > 15 ||
      qc.processing > 5 ||
      (typeof lagSec === "number" && lagSec > 120));

  return (
    <div className="h-screen w-full p-4">
      {qc ? (
        <div
          className={`mb-3 rounded-lg border px-3 py-2 text-[11px] ${
            queueAttention
              ? "border-amber-900/50 bg-amber-950/25 text-amber-100/90"
              : "border-[#1f1f1f] bg-[#0a0a0a] text-[#9a9a9a]"
          }`}
        >
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className={queueAttention ? "font-medium text-amber-50/95" : "text-[#ccc]"}>Outbound queue</span>
            <span>
              pending <strong className="font-medium text-white">{qc.pending}</strong>
            </span>
            <span>
              processing <strong className="font-medium text-white">{qc.processing}</strong>
            </span>
            <span>
              failed <strong className="font-medium text-white">{qc.failed}</strong>
            </span>
            <span>
              dead <strong className="font-medium text-white">{qc.dead}</strong>
            </span>
            {typeof lagSec === "number" ? (
              <span title="Age of oldest pending job">
                lag <strong className="font-medium text-white">{lagSec}s</strong>
              </span>
            ) : (
              <span className="text-[#666]">lag —</span>
            )}
            <Link
              href="/dashboard/messaging"
              className="ml-auto rounded border border-[#333] px-2 py-0.5 text-[10px] text-[#ccc] hover:border-[#555] hover:text-white"
            >
              DLQ &amp; webhooks
            </Link>
          </div>
          {liveInsights &&
          (liveInsights.recent_failed.length > 0 ||
            liveInsights.webhook_events_24h.some((w) => w.outcome !== "ok")) ? (
            <details className="mt-2 border-t border-[#2a2a2a] pt-2 text-[10px] text-[#aaa]">
              <summary className="cursor-pointer text-[#888]">Recent failures &amp; webhook skips</summary>
              <ul className="mt-1 space-y-1 font-mono">
                {liveInsights.recent_failed.slice(0, 4).map((j) => (
                  <li key={j.id}>
                    job {j.id.slice(0, 8)}… lead {j.lead_id}{" "}
                    {j.last_error ? <span className="text-amber-200/90">— {j.last_error.slice(0, 120)}</span> : null}
                  </li>
                ))}
                {liveInsights.webhook_events_24h
                  .filter((w) => w.outcome !== "ok")
                  .slice(0, 6)
                  .map((w) => (
                    <li key={w.id}>
                      {w.source} {w.event_kind} ({w.outcome})
                      {w.error_message ? ` — ${w.error_message.slice(0, 80)}` : ""}
                    </li>
                  ))}
              </ul>
            </details>
          ) : null}
        </div>
      ) : null}
      <div className="grid h-[calc(100vh-2rem)] grid-cols-1 gap-4 lg:grid-cols-[360px_1fr]">
        <div className="overflow-hidden rounded-xl border border-[#1A1A1A] bg-[#0D0D0D]">
          <div className="border-b border-[#1A1A1A] p-4">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or message"
              className="h-10 rounded-lg border border-[#1F1F1F] bg-[#111111] text-white placeholder:text-[#666]"
            />

            <div className="mt-4 space-y-3">
              <Tabs value={channelTab} onValueChange={(v) => setChannelTab(v as typeof channelTab)}>
                <TabsList className="bg-transparent h-auto p-0">
                  <TabsTrigger value="all" className="px-3 py-2 text-[13px] text-[#999] data-[state=active]:text-white">
                    All
                  </TabsTrigger>
                  <TabsTrigger value="whatsapp" className="px-3 py-2 text-[13px] text-[#999] data-[state=active]:text-white">
                    WhatsApp
                  </TabsTrigger>
                  <TabsTrigger value="instagram" className="px-3 py-2 text-[13px] text-[#999] data-[state=active]:text-white">
                    Instagram
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <Tabs value={queueFilter} onValueChange={(v) => navigateFilter(v as InboxQueueFilter)}>
                <TabsList className="bg-transparent h-auto p-0 flex-wrap gap-1">
                  <TabsTrigger value="all" className="px-3 py-2 text-[12px] text-[#888] data-[state=active]:text-white">
                    All
                  </TabsTrigger>
                  <TabsTrigger value="unassigned" className="px-3 py-2 text-[12px] text-[#888] data-[state=active]:text-white">
                    Unassigned
                  </TabsTrigger>
                  <TabsTrigger value="mine" className="px-3 py-2 text-[12px] text-[#888] data-[state=active]:text-white">
                    Mine
                  </TabsTrigger>
                  <TabsTrigger value="pinned" className="px-3 py-2 text-[12px] text-[#888] data-[state=active]:text-white">
                    Pinned
                  </TabsTrigger>
                  <TabsTrigger value="open" className="px-3 py-2 text-[12px] text-[#888] data-[state=active]:text-white">
                    Open
                  </TabsTrigger>
                  <TabsTrigger value="resolved" className="px-3 py-2 text-[12px] text-[#888] data-[state=active]:text-white">
                    Resolved
                  </TabsTrigger>
                  <TabsTrigger value="unread" className="px-3 py-2 text-[12px] text-[#888] data-[state=active]:text-white">
                    Unread
                  </TabsTrigger>
                  <TabsTrigger value="human" className="px-3 py-2 text-[12px] text-[#888] data-[state=active]:text-white">
                    Human
                  </TabsTrigger>
                  <TabsTrigger value="automation" className="px-3 py-2 text-[12px] text-[#888] data-[state=active]:text-white">
                    AI
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          <ScrollArea className="h-[calc(100vh_-_260px)]">
            <div className="divide-y divide-[#1E1E1E]">
              {filtered.length === 0 ? (
                <div className="p-5 text-[#555] text-[13px]">No conversations in this view.</div>
              ) : (
                filtered.map((i) => (
                  <button
                    key={i.lead_id}
                    className={`w-full px-4 py-3 text-left transition-colors ${
                      i.lead_id === activeId ? "bg-[#161616]" : "bg-transparent hover:bg-[#121212]"
                    }`}
                    onClick={() => void openLead(i.lead_id)}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 flex-1 items-center gap-1.5">
                        {i.inbox_starred ? (
                          <Star size={12} className="shrink-0 text-amber-400 fill-amber-400" aria-hidden />
                        ) : null}
                        <div className="truncate text-[13px] font-medium text-white">{i.lead_name ?? "Lead"}</div>
                        <span
                          className={`shrink-0 rounded px-1.5 py-px text-[9px] font-medium uppercase tracking-wide border ${
                            i.mode === "human"
                              ? "border-sky-800/80 text-sky-200/95 bg-sky-950/35"
                              : "border-[#333] text-[#777]"
                          }`}
                          title={i.mode === "human" ? "Manual / human takeover" : "Automation (AI) mode"}
                        >
                          {i.mode === "human" ? "Human" : "AI"}
                        </span>
                        {leadNeedsReply(i) ? (
                          <span className="h-2 w-2 shrink-0 rounded-full bg-sky-500" title="Needs reply" aria-hidden />
                        ) : null}
                      </div>
                      <div className="whitespace-nowrap text-[11px] text-[#888]">
                        {typeof i.score === "number" ? i.score : "—"}
                      </div>
                    </div>
                    <div className="mt-1 truncate text-[12px] text-[#777]">{i.preview ?? "—"}</div>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        <div className="flex min-h-0 flex-col gap-4 lg:flex-row">
          <div className="min-h-0 flex-1 rounded-xl border border-[#1A1A1A] bg-[#0D0D0D] p-4">
            <ConversationThread
              clientId={clientId}
              lead={
                active
                  ? {
                      lead_id: active.lead_id,
                      lead_name: active.lead_name,
                      phone: active.phone,
                      email: active.email,
                      channel: active.channel,
                      last_customer_message_at: active.last_customer_message_at,
                    }
                  : null
              }
              messages={activeThread}
              mode={active?.mode ?? "ai"}
              loading={loadingThread}
              onMessageSent={(leadId, preview) => {
                setListItems((prev) => prev.map((x) => (x.lead_id === leadId ? { ...x, preview } : x)));
              }}
              onMessagingActivity={() => void refreshMessagingInsights()}
              onLeadUpdated={refreshLeadData}
            />
          </div>
          <div className="w-full shrink-0 lg:w-[300px]">
            <InboxTeamPanel
              clientId={clientId}
              leadId={active?.lead_id ?? null}
              currentUserId={currentUserId}
              team={team}
              assignedToUserId={active?.assigned_to_user_id ?? null}
              inboxStarred={active?.inbox_starred ?? false}
              latestConversationStatus={active?.latest_conversation_status ?? null}
              firstResponseDueAt={active?.first_response_due_at ?? null}
              inboxLockedUntil={active?.inbox_locked_until ?? null}
              inboxLockedBy={active?.inbox_locked_by ?? null}
              onLeadUpdated={refreshLeadData}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
