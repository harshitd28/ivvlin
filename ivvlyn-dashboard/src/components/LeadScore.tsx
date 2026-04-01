type Props = {
  score: number;
};

function scoreColor(score: number) {
  if (score <= 20) return "#9CA3AF";
  if (score <= 40) return "#3B82F6";
  if (score <= 69) return "#F59E0B";
  return "#EF4444";
}

export default function LeadScore({ score }: Props) {
  const safe = Math.max(0, Math.min(100, Number.isFinite(score) ? score : 0));
  const color = scoreColor(safe);
  const pct = (safe / 100) * 283;
  return (
    <div className="relative h-16 w-16">
      <svg viewBox="0 0 100 100" className="h-16 w-16 -rotate-90">
        <circle cx="50" cy="50" r="45" stroke="#1f2937" strokeWidth="8" fill="none" />
        <circle
          cx="50"
          cy="50"
          r="45"
          stroke={color}
          strokeWidth="8"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${pct} 283`}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-[14px] font-semibold">{safe}</div>
    </div>
  );
}
