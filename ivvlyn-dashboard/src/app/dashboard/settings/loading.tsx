export default function SettingsLoading() {
  return (
    <div className="p-4 md:p-8 space-y-6 animate-pulse">
      <div className="h-7 w-56 bg-white border border-[#E8E8E8] rounded-lg" />
      <div className="h-10 w-64 bg-white border border-[#E8E8E8] rounded-xl" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div key={idx} className="h-16 bg-[#FAFAF8] border border-[#E8E8E8] rounded-xl" />
        ))}
      </div>
    </div>
  );
}

