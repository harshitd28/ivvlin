"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Channel } from "@/lib/types";
import type { ThreadMessage } from "@/components/dashboard/ConversationThread";
import ConversationThread from "@/components/dashboard/ConversationThread";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

type LeadThreadListItem = {
  lead_id: string;
  lead_name: string | null;
  channel: Channel;
  preview: string | null;
  created_at: string;
  score: number | null;
  mode: "ai" | "human";
};

type Props = {
  items: LeadThreadListItem[];
  activeLeadId: string | null;
  threadMessages: ThreadMessage[];
};

export default function ConversationsClient({ items, activeLeadId, threadMessages }: Props) {
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [channelTab, setChannelTab] = useState<"all" | "whatsapp" | "instagram">("all");
  const active = items.find((i) => i.lead_id === activeLeadId) ?? null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = items;
    if (channelTab !== "all") list = list.filter((i) => i.channel === channelTab);
    if (!q.length) return list;
    return list.filter((i) => (i.lead_name ?? "").toLowerCase().includes(q) || (i.preview ?? "").toLowerCase().includes(q));
  }, [items, query, channelTab]);

  return (
    <div className="pt-0 p-0">
      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-4">
        <div className="border border-[#E8E8E8] rounded-xl bg-[#FAFAF8] overflow-hidden">
          <div className="p-4 border-b border-[#E8E8E8]">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or message"
              className="h-10 rounded-lg bg-transparent border border-[#E8E8E8]"
            />

            <div className="mt-4">
              <Tabs value={channelTab} onValueChange={(v) => setChannelTab(v as typeof channelTab)}>
                <TabsList className="bg-transparent h-auto p-0">
                  <TabsTrigger value="all" className="px-3 py-2 text-[13px]">All</TabsTrigger>
                  <TabsTrigger value="whatsapp" className="px-3 py-2 text-[13px]">WhatsApp</TabsTrigger>
                  <TabsTrigger value="instagram" className="px-3 py-2 text-[13px]">Instagram</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          <ScrollArea className="h-[calc(100vh_-_260px)]">
            <div className="divide-y divide-[#1E1E1E]">
              {filtered.length === 0 ? (
                <div className="p-5 text-[#555] text-[13px]">No conversations found.</div>
              ) : (
                filtered.map((i) => (
                  <button
                    key={i.lead_id}
                    className={`w-full text-left px-4 py-3 hover:bg-white transition-colors ${
                      i.lead_id === activeLeadId ? "bg-[#F4F4F2]" : "bg-transparent"
                    }`}
                    onClick={() => router.push(`/dashboard/conversations?leadId=${encodeURIComponent(i.lead_id)}`)}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-[#0A0A0A] text-[13px] font-medium truncate flex-1">
                        {i.lead_name ?? "Lead"}
                      </div>
                      <div className="text-[#888] text-[11px] whitespace-nowrap">
                        {typeof i.score === "number" ? i.score : "—"}
                      </div>
                    </div>
                    <div className="text-[#555] text-[12px] mt-1 truncate">
                      {i.preview ?? "—"}
                    </div>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        <div className="border border-[#E8E8E8] rounded-xl bg-[#FAFAF8] p-4">
          <ConversationThread messages={threadMessages} mode={active?.mode ?? "ai"} />
        </div>
      </div>
    </div>
  );
}

