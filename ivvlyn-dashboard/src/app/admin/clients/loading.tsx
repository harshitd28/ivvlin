export default function AdminClientsLoading() {
  return (
    <div className="p-8 pt-0 space-y-5 animate-pulse">
      <div className="h-7 w-40 bg-white border border-[#E8E8E8] rounded-lg" />
      <div className="border border-[#E8E8E8] rounded-xl bg-white p-4 space-y-3">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div key={idx} className="h-9 bg-[#f5f5f3] rounded" />
        ))}
      </div>
    </div>
  );
}

