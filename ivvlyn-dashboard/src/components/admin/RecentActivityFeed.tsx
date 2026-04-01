import { formatDistanceToNow } from "date-fns";
import type { Client } from "@/lib/types";

type ActivityRow = {
  id: string;
  created_at: string;
  type: string | null;
  channel: string | null;
  direction: string | null;
  clientBusinessName: string | null;
  leadName: string | null;
};

type Props = {
  items: ActivityRow[];
  clients: Client[];
};

function channelDot(channel: string | null | undefined) {
  const ch = (channel ?? "").toLowerCase();
  if (ch.includes("instagram")) return "bg-[#3B82F6]";
  if (ch.includes("whatsapp")) return "bg-[#16A34A]";
  return "bg-[#2A2A2A]";
}

export default function RecentActivityFeed({ items }: Props) {
  return (
    <div className="mt-6">
      <div className="text-[#555] text-[11px] uppercase tracking-[0.2em] font-semibold">
        RECENT ACROSS ALL CLIENTS
      </div>
      <div className="mt-4 divide-y divide-[#1E1E1E] border border-[#1E1E1E] rounded-xl overflow-hidden">
        {items.length === 0 ? (
          <div className="p-5 text-[#555] text-[13px]">No activity yet.</div>
        ) : (
          items.map((a) => {
            const timeAgo = formatDistanceToNow(new Date(a.created_at), { addSuffix: false });
            return (
              <div key={a.id} className="flex items-start gap-3 px-4 py-3">
                <div className={`h-3.5 w-3.5 rounded-full mt-1 ${channelDot(a.channel)}`} aria-hidden="true" />
                <div className="flex-1 min-w-0">
                  <div className="text-[#0A0A0A] text-[13px] font-medium truncate">
                    {(a.clientBusinessName ?? "Client") + " · " + (a.leadName ?? "Lead")}
                  </div>
                  <div className="text-[#555] text-[12px] mt-1">
                    {(a.type ?? "Activity").slice(0, 80)}
                  </div>
                </div>
                <div className="text-[#444] text-[11px] shrink-0 whitespace-nowrap">
                  {timeAgo} ago
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

