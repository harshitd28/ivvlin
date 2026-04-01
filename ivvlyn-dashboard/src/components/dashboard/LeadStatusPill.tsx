import type { LeadStatus } from "@/lib/types";

type Props = {
  status: LeadStatus;
};

export default function LeadStatusPill({ status }: Props) {
  if (status === "hot") {
    return (
      <span className="inline-flex items-center gap-2 text-[12px] bg-[#0D2818] text-[#16A34A] border border-[#10311f] rounded-full px-3 py-1">
        <span className="h-2 w-2 rounded-full bg-[#16A34A]" aria-hidden="true" />
        HOT
      </span>
    );
  }

  if (status === "warm") {
    return (
      <span className="inline-flex items-center gap-2 text-[12px] bg-[#2A1F0A] text-[#D97706] border border-[#3A2A0C] rounded-full px-3 py-1">
        <span className="h-2 w-2 rounded-full bg-[#D97706]" aria-hidden="true" />
        WARM
      </span>
    );
  }

  if (status === "cold") {
    return (
      <span className="inline-flex items-center gap-2 text-[12px] bg-[#0D1A2A] text-[#3B82F6] border border-[#12304f] rounded-full px-3 py-1">
        <span className="h-2 w-2 rounded-full bg-[#3B82F6]" aria-hidden="true" />
        COLD
      </span>
    );
  }

  if (status === "lost") {
    return (
      <span className="inline-flex items-center gap-2 text-[12px] bg-[#2A0D0D] text-[#DC2626] border border-[#3A0C0C] rounded-full px-3 py-1">
        <span className="h-2 w-2 rounded-full bg-[#DC2626]" aria-hidden="true" />
        LOST
      </span>
    );
  }

  if (status === "closed") {
    return (
      <span className="inline-flex items-center gap-2 text-[12px] bg-[#0F3A22] text-[#16A34A] border border-[#10311f] rounded-full px-3 py-1">
        <span className="h-2 w-2 rounded-full bg-[#16A34A]" aria-hidden="true" />
        CLOSED
      </span>
    );
  }

  // default "new"
  return (
    <span className="inline-flex items-center gap-2 text-[12px] bg-[#F4F4F2] text-[#555555] border border-[#E8E8E8] rounded-full px-3 py-1">
      <span className="h-2 w-2 rounded-full bg-[#888888]" aria-hidden="true" />
      NEW
    </span>
  );
}

