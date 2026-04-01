import type { Client } from "@/lib/types";

type Props = {
  status: Client["status"];
};

export default function StatusPill({ status }: Props) {
  if (status === "active") {
    return (
      <span className="inline-flex items-center gap-2 text-[13px] bg-[#0D2818] text-[#16A34A] rounded-full px-3 py-1 border border-[#10311f]">
        <span className="h-2 w-2 rounded-full bg-[#16A34A]" aria-hidden="true" />
        <span>LIVE</span>
      </span>
    );
  }

  if (status === "paused") {
    return (
      <span className="inline-flex items-center gap-2 text-[13px] bg-[#F4F4F2] text-[#555555] rounded-full px-3 py-1 border border-[#E8E8E8]">
        <span className="h-2 w-2 rounded-full bg-[#888888]" aria-hidden="true" />
        <span>PAUSED</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2 text-[13px] bg-[#2A1F0A] text-[#D97706] rounded-full px-3 py-1 border border-[#3A2A0C]">
      <span className="h-2 w-2 rounded-full bg-[#D97706]" aria-hidden="true" />
      <span>ISSUE</span>
    </span>
  );
}

