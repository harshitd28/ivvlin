import { Bot, UserRound } from "lucide-react";

type Props = {
  mode: "ai" | "human";
};

export default function ModeBadge({ mode }: Props) {
  if (mode === "human") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] bg-[#fff7ed] text-[#c2410c] border-[#fed7aa]">
        <UserRound className="h-3 w-3" />
        HUMAN
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] bg-[#eff6ff] text-[#1d4ed8] border-[#bfdbfe]">
      <Bot className="h-3 w-3" />
      AI
    </span>
  );
}

