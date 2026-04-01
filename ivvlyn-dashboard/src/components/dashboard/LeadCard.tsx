import type { Lead, Channel, Visit } from "@/lib/types";
import { CalendarDays, MessageSquareText } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type Props = {
  lead: Lead;
  channel: Channel;
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
  visit: Visit | null;
};

function scoreColor(score: number) {
  if (score >= 90) return "#4ADE80";
  if (score >= 70) return "#16A34A";
  if (score >= 50) return "#D97706";
  return "#888888";
}

function channelLabel(channel: Channel) {
  if (channel === "instagram") return "IG";
  return "WA";
}

export default function LeadCard({ lead, channel, lastMessagePreview, lastMessageAt, visit }: Props) {
  const score = typeof lead.score === "number" ? lead.score : 0;
  const border = scoreColor(score);

  const timeAgo = lastMessageAt
    ? formatDistanceToNow(new Date(lastMessageAt), { addSuffix: false })
    : "—";

  const pills: Array<{ label: string; value: string | null | undefined }> = [
    { label: "Budget", value: lead.budget },
    { label: "BHK", value: lead.bhk_preference },
    { label: "Location", value: lead.location_preference },
  ];

  return (
    <div className="bg-white border border-[#E8E8E8] rounded-xl px-5 py-4 transition-all hover:-translate-y-0.5">
      <div className="border-l-4" style={{ borderLeftColor: border }}>
        <div className="pl-4">
          <div className="flex items-start justify-between gap-3">
            <div className="text-[#0A0A0A] text-[14px] font-medium truncate">{lead.name ?? "Lead"}</div>
            <div className="inline-flex items-center justify-center bg-[#0D2818] text-[#16A34A] border border-[#10311f] rounded-full px-3 py-1">
              <span className="text-[13px] font-medium">{score}</span>
            </div>
          </div>

          <div className="mt-2 flex items-start justify-between gap-3">
            <div className="text-[#555] text-[12px]">
              <span className="inline-flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${channel === "instagram" ? "bg-[#A855F7]" : "bg-[#16A34A]"}`} aria-hidden="true" />
                <span>
                  Last message: {lastMessagePreview ? lastMessagePreview : "No messages yet"}
                </span>
              </span>
            </div>
            <div className="text-[#444] text-[11px] whitespace-nowrap">{timeAgo} ago</div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {pills.map((p) =>
              p.value ? (
                <span key={p.label} className="text-[11px] text-[#555] border border-[#E8E8E8] rounded-full px-3 py-1">
                  {p.value}
                </span>
              ) : null
            )}
          </div>

          {visit ? (
            <div className="mt-3 inline-flex items-center gap-2 text-[#16A34A] text-[12px]">
              <CalendarDays className="h-4 w-4" />
              <span>
                Visit: {visit.visit_date} {visit.visit_time ? `· ${visit.visit_time}` : ""} · {visit.property ?? "Property"}
              </span>
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-3">
            <a
              href={`/dashboard/conversations?leadId=${encodeURIComponent(lead.lead_id)}`}
              className="text-[13px] text-[#0A0A0A] font-medium hover:underline underline-offset-4"
            >
              View Conversation →
            </a>
            {lead.phone ? (
              <a
                href={`https://wa.me/${lead.phone.replace(/\\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[13px] text-[#16A34A] font-medium hover:underline underline-offset-4"
              >
                Open WhatsApp →
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

