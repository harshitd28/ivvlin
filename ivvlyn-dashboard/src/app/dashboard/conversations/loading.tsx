export default function ConversationsLoading() {
  return (
    <div className="p-4 md:p-8 space-y-6 animate-pulse">
      <div className="text-[#0A0A0A] text-[20px] font-medium h-7 w-56 bg-white border border-[#E8E8E8] rounded-lg" />

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-4">
        <div className="border border-[#E8E8E8] rounded-xl bg-[#FAFAF8] p-4 space-y-3">
          <div className="h-10 bg-white rounded-lg" />
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="h-24 bg-white border border-[#E8E8E8] rounded-xl" />
          ))}
        </div>

        <div className="border border-[#E8E8E8] rounded-xl bg-[#FAFAF8] p-4 space-y-3">
          <div className="h-6 w-64 bg-white rounded" />
          {Array.from({ length: 8 }).map((_, idx) => (
            <div key={idx} className="h-10 bg-white rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

