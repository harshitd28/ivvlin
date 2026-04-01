import type { Channel } from "@/lib/types";

type Props = {
  channel: Channel;
};

export default function ChannelBadge({ channel }: Props) {
  if (channel === "instagram") {
    return (
      <span className="inline-flex items-center gap-2 text-[12px] bg-[#0D1A2A] text-[#3B82F6] border border-[#12304f] rounded-full px-3 py-1">
        <span className="h-2.5 w-2.5 rounded-full bg-[#3B82F6]" aria-hidden="true" />
        IG
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2 text-[12px] bg-[#0D2818] text-[#16A34A] border border-[#10311f] rounded-full px-3 py-1">
      <span className="h-2.5 w-2.5 rounded-full bg-[#16A34A]" aria-hidden="true" />
      WA
    </span>
  );
}

