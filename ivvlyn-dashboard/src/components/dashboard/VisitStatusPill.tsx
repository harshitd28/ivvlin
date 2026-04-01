import type { VisitStatus } from "@/lib/types";

type Props = {
  status: VisitStatus;
};

export default function VisitStatusPill({ status }: Props) {
  if (status === "scheduled") {
    return (
      <span className="inline-flex items-center gap-2 text-[12px] bg-[#2A1F0A] text-[#D97706] border border-[#3A2A0C] rounded-full px-3 py-1">
        <span className="h-2 w-2 rounded-full bg-[#D97706]" aria-hidden="true" />
        Scheduled
      </span>
    );
  }

  if (status === "confirmed") {
    return (
      <span className="inline-flex items-center gap-2 text-[12px] bg-[#0D2818] text-[#16A34A] border border-[#10311f] rounded-full px-3 py-1">
        <span className="h-2 w-2 rounded-full bg-[#16A34A]" aria-hidden="true" />
        Confirmed
      </span>
    );
  }

  if (status === "completed") {
    return (
      <span className="inline-flex items-center gap-2 text-[12px] bg-[#F4F4F2] text-[#555555] border border-[#E8E8E8] rounded-full px-3 py-1">
        <span className="h-2 w-2 rounded-full bg-[#888888]" aria-hidden="true" />
        Completed
      </span>
    );
  }

  if (status === "no_show") {
    return (
      <span className="inline-flex items-center gap-2 text-[12px] bg-[#2A0D0D] text-[#DC2626] border border-[#3A0C0C] rounded-full px-3 py-1">
        <span className="h-2 w-2 rounded-full bg-[#DC2626]" aria-hidden="true" />
        No-show
      </span>
    );
  }

  // cancelled
  return (
    <span className="inline-flex items-center gap-2 text-[12px] bg-[#2A0D0D] text-[#DC2626] border border-[#3A0C0C] rounded-full px-3 py-1">
      <span className="h-2 w-2 rounded-full bg-[#DC2626]" aria-hidden="true" />
      Cancelled
    </span>
  );
}

