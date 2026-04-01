import type { ReactNode } from "react";

type Props = {
  label: string;
  value: string | number;
  icon?: ReactNode;
  trend?: string;
};

export default function StatsCard({ label, value, icon, trend }: Props) {
  return (
    <div className="rounded-xl border border-[#1f2937] bg-[#111827] p-4">
      <div className="flex items-center justify-between">
        <div className="text-[12px] uppercase tracking-[0.12em] text-[#9ca3af]">{label}</div>
        {icon ? <div className="text-[#d1d5db]">{icon}</div> : null}
      </div>
      <div className="mt-2 text-[24px] font-semibold text-[#f9fafb]">{value}</div>
      {trend ? <div className="mt-1 text-[12px] text-[#9ca3af]">{trend}</div> : null}
    </div>
  );
}
