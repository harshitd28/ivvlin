export default function DashboardLoading() {
  return (
    <div className="p-4 md:p-8 space-y-6 animate-pulse">
      <div className="space-y-3">
        <div className="h-6 w-56 bg-white border border-[#E8E8E8] rounded-lg" />
        <div className="h-4 w-80 bg-white border border-[#E8E8E8] rounded-lg" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div key={idx} className="h-[90px] bg-white border border-[#E8E8E8] rounded-xl p-5" />
        ))}
      </div>

      <div className="border border-[#E8E8E8] rounded-xl p-5 bg-[#FAFAF8]">
        <div className="h-3 w-56 bg-white rounded" />
        <div className="mt-4 space-y-3">
          <div className="h-5 bg-white rounded" />
          <div className="h-5 bg-white rounded" />
          <div className="h-5 bg-white rounded" />
        </div>
      </div>
    </div>
  );
}

