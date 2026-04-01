export default function VisitsLoading() {
  return (
    <div className="p-4 md:p-8 space-y-6 animate-pulse">
      <div className="h-7 w-56 bg-white border border-[#E8E8E8] rounded-lg" />
      <div className="border border-[#E8E8E8] rounded-xl p-5 bg-[#FAFAF8]">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-9 w-24 bg-white rounded-lg" />
          <div className="h-9 w-24 bg-white rounded-lg" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 12 }).map((_, idx) => (
            <div key={idx} className="h-20 bg-white rounded-xl border border-[#E8E8E8]" />
          ))}
        </div>
      </div>
    </div>
  );
}

