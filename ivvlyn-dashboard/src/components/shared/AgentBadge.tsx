import type { AgentType } from "@/lib/types";

type Props = {
  agentType: AgentType;
  label: string;
};

export default function AgentBadge({ agentType, label }: Props) {
  if (agentType === "vaani") {
    return <span className="inline-flex rounded-full px-3 py-1 text-[11px] font-medium bg-[#0D2818] text-[#16A34A] border border-[#10311f]">{label}</span>;
  }

  if (agentType === "nova") {
    return <span className="inline-flex rounded-full px-3 py-1 text-[11px] font-medium bg-[#0D1A2A] text-[#3B82F6] border border-[#12304f]">{label}</span>;
  }

  if (agentType === "kira") {
    return <span className="inline-flex rounded-full px-3 py-1 text-[11px] font-medium bg-[#2A1F0A] text-[#D97706] border border-[#3A2A0C]">{label}</span>;
  }

  if (agentType === "zane") {
    return <span className="inline-flex rounded-full px-3 py-1 text-[11px] font-medium bg-[#1E1035] text-[#A855F7] border border-[#34225b]">{label}</span>;
  }

  return <span className="inline-flex rounded-full px-3 py-1 text-[11px] font-medium bg-[#F4F4F2] text-[#888] border border-[#E8E8E8]">{label}</span>;
}

