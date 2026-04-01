export default function LeadsLoading() {
  return (
    <div className="p-4 md:p-8 space-y-6 animate-pulse">
      <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
        <div className="h-10 w-56 bg-white border border-[#E8E8E8] rounded-xl" />
        <div className="flex gap-3">
          <div className="h-10 w-52 bg-white border border-[#E8E8E8] rounded-xl" />
          <div className="h-10 w-64 bg-white border border-[#E8E8E8] rounded-xl" />
        </div>
      </div>

      <div className="border border-[#E8E8E8] rounded-xl overflow-hidden">
        <div className="grid grid-cols-7 gap-0 px-4 py-3 border-b border-[#1E1E1E]">
          {Array.from({ length: 7 }).map((_, idx) => (
            <div key={idx} className="h-4 bg-white rounded" />
          ))}
        </div>
        <div className="divide-y divide-[#1E1E1E]">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="h-14 px-4 py-2 grid grid-cols-7 items-center">
              {Array.from({ length: 7 }).map((__, j) => (
                <div key={j} className="h-3 bg-white rounded w-full" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

