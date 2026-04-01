export default function AdminCreditsLoading() {
  return (
    <div className="p-8 pt-0 space-y-5 animate-pulse">
      <div className="h-7 w-64 bg-white border border-[#E8E8E8] rounded-lg" />
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, idx) => (
          <div key={idx} className="border border-[#E8E8E8] rounded-xl bg-white p-5 space-y-3">
            <div className="h-5 w-48 bg-[#f3f3f1] rounded" />
            <div className="h-4 w-full bg-[#f7f7f5] rounded" />
            <div className="h-4 w-3/4 bg-[#f7f7f5] rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

