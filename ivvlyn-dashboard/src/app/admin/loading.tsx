export default function AdminLoading() {
  return (
    <div className="p-4 md:p-8 space-y-6 animate-pulse">
      <div className="h-7 w-56 bg-white border border-[#E8E8E8] rounded-lg" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div key={idx} className="h-[90px] bg-white border border-[#E8E8E8] rounded-xl" />
        ))}
      </div>
      <div className="h-[260px] bg-[#FAFAF8] border border-[#E8E8E8] rounded-xl" />
    </div>
  );
}

