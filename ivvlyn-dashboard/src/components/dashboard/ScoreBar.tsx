import type { Lead } from "@/lib/types";

type Props = {
  score: number;
};

function scoreColor(score: number) {
  if (score >= 90) return { color: "#4ADE80", bg: "#0F3A22" };
  if (score >= 70) return { color: "#16A34A", bg: "#10311f" };
  if (score >= 50) return { color: "#D97706", bg: "#2A1F0A" };
  return { color: "#888888", bg: "#2A2A2A" };
}

export default function ScoreBar({ score }: Props) {
  const c = scoreColor(score);
  const width = Math.max(0, Math.min(100, score));

  return (
    <div className="flex items-center gap-3">
      <div className="w-24 h-1.5 bg-[#F4F4F2] rounded-full overflow-hidden border border-[#E8E8E8]">
        <div className="h-full" style={{ width: `${width}%`, background: c.color }} />
      </div>
      <div className="text-[12px] font-medium" style={{ color: c.color }}>
        {score}
      </div>
    </div>
  );
}

