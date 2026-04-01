"use client";

import { formatDistanceToNow } from "date-fns";
import type { Channel } from "@/lib/types";
import ChannelBadge from "@/components/shared/ChannelBadge";

type ActivityRow = {
  id: string;
  created_at: string;
  lead_name: string | null;
  channel: string | null;
  direction: string | null;
  content: string | null;
  type: string | null;
};

type Props = {
  activity: ActivityRow;
};

function asChannel(value: string | null): Channel {
  if (value === "instagram" || value === "facebook" || value === "sms" || value === "email") return value;
  return "whatsapp";
}

export default function ActivityItem({ activity }: Props) {
  const directionColor =
    activity.direction === "outbound" ? "text-[#15803d]" : activity.direction === "inbound" ? "text-[#2563EB]" : "text-[#555]";
  const timeAgo = formatDistanceToNow(new Date(activity.created_at), { addSuffix: true });
  return (
    <div className="px-4 py-3 border-b border-[#eeeeee] last:border-b-0">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2">
            <ChannelBadge channel={asChannel(activity.channel)} />
            <span className="text-[12px] text-[#111] font-medium truncate">{activity.lead_name ?? "Lead"}</span>
          </div>
          <div className={`text-[12px] mt-1 ${directionColor}`}>
            {activity.content ?? activity.type ?? "Activity update"}
          </div>
        </div>
        <div className="text-[11px] text-[#777] whitespace-nowrap">{timeAgo}</div>
      </div>
    </div>
  );
}

