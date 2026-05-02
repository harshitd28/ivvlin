export default function DashboardLoading() {
  return (
    <div className="space-y-8">
      <div className="h-[220px] animate-pulse rounded-xl border border-[#1A1A1A] bg-[#0D0D0D]" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div key={idx} className="h-[172px] animate-pulse rounded-xl border border-[#1A1A1A] bg-[#0D0D0D]" />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="h-[290px] animate-pulse rounded-xl border border-[#1A1A1A] bg-[#0D0D0D]" />
        <div className="h-[290px] animate-pulse rounded-xl border border-[#1A1A1A] bg-[#0D0D0D]" />
      </div>

      <div className="h-[320px] animate-pulse rounded-xl border border-[#1A1A1A] bg-[#0D0D0D]" />
    </div>
  );
}

