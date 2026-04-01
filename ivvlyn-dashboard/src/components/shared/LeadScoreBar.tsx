type Props = {
  score: number;
};

function scoreColor(score: number) {
  if (score <= 20) return "bg-[#9CA3AF] text-[#6B7280]";
  if (score <= 40) return "bg-[#60A5FA] text-[#2563EB]";
  if (score <= 69) return "bg-[#F59E0B] text-[#B45309]";
  return "bg-[#EF4444] text-[#B91C1C]";
}

export default function LeadScoreBar({ score }: Props) {
  const safe = Math.max(0, Math.min(100, Number.isFinite(score) ? score : 0));
  const color = scoreColor(safe);
  const fillClass = color.split(" ")[0];
  const textClass = color.split(" ")[1];

  return (
    <div className="flex items-center gap-2 min-w-[130px]">
      <div className="h-1.5 rounded-full bg-[#ececec] flex-1 overflow-hidden">
        <div className={`h-full ${fillClass}`} style={{ width: `${safe}%` }} />
      </div>
      <span className={`text-[12px] font-semibold ${textClass}`}>{safe}</span>
    </div>
  );
}

