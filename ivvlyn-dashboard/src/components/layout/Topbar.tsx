import { Bell } from "lucide-react";

type Props = {
  clientName: string;
};

export default function Topbar({ clientName }: Props) {
  const dateText = new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(new Date());

  return (
    <header className="sticky top-0 z-30 h-14 border-b border-[#1A1A1A] bg-black">
      <div className="mx-auto flex h-full w-full max-w-[1400px] items-center justify-between px-6">
        <div>
          <p className="text-[15px] font-normal text-white">Dashboard</p>
          <p className="text-[11px] text-[#555]">Good morning, {clientName} — {dateText}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-[11px] text-[#555]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
            All systems operational
          </div>
          <button
            type="button"
            className="relative text-[#555] transition-colors duration-150 hover:text-white"
            aria-label="Notifications"
          >
            <Bell size={16} />
            <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[9px] text-black">
              3
            </span>
          </button>
          <div className="flex items-center gap-2">
            <p className="text-[12px] text-white">{clientName}</p>
            <span className="rounded border border-white px-2 py-0.5 text-[9px] uppercase tracking-[0.08em] text-white">
              Premium
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
