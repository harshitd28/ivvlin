export default function AnalyticsLoading() {
  return (
    <div className="p-4 md:p-8 space-y-6 animate-pulse">
      <div className="flex items-center justify-between gap-4">
        <div className="h-7 w-56 bg-white border border-[#E8E8E8] rounded-lg" />
        <div className="h-10 w-52 bg-white border border-[#E8E8E8] rounded-lg" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="h-[260px] bg-[#FAFAF8] border border-[#E8E8E8] rounded-xl" />
        <div className="h-[260px] bg-[#FAFAF8] border border-[#E8E8E8] rounded-xl" />
      </div>

      <div className="h-[320px] bg-[#FAFAF8] border border-[#E8E8E8] rounded-xl" />

      <div className="h-[220px] bg-[#FAFAF8] border border-[#E8E8E8] rounded-xl" />
    </div>
  );
}

