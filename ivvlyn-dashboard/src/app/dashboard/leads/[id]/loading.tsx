export default function LeadDetailLoading() {
  return (
    <div className="p-4 md:p-8 space-y-6 animate-pulse">
      <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-4">
        <div className="border border-[#E8E8E8] rounded-xl bg-[#FAFAF8] p-5 space-y-3">
          <div className="h-8 w-64 bg-white rounded" />
          <div className="h-4 w-80 bg-white rounded" />
          <div className="h-4 w-72 bg-white rounded" />
          <div className="h-20 w-full bg-white rounded-lg" />
        </div>
        <div className="border border-[#E8E8E8] rounded-xl bg-[#FAFAF8] p-5 space-y-3">
          {Array.from({ length: 10 }).map((_, idx) => (
            <div key={idx} className="h-8 bg-white rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

