import type { ReactNode } from "react";

type Props = {
  label: string;
  value: ReactNode;
  delta?: {
    text: string;
    kind: "up" | "down" | "neutral";
  };
};

export default function StatCard({ label, value, delta }: Props) {
  const deltaColor =
    delta?.kind === "up"
      ? "text-[#16A34A]"
      : delta?.kind === "down"
        ? "text-[#DC2626]"
        : "text-[#D97706]";

  return (
    <div className="bg-white border border-[#E8E8E8] rounded-xl px-6 py-5">
      <div className="text-[11px] uppercase tracking-[0.2em] text-[#555] font-semibold">{label}</div>
      <div className="mt-3 text-[32px] font-light leading-none text-[#0A0A0A]">{value}</div>
      {delta ? (
        <div className={`mt-3 text-[12px] font-medium ${deltaColor}`}>{delta.text}</div>
      ) : (
        <div className="mt-3 text-[12px] text-[#555] font-medium">&nbsp;</div>
      )}
    </div>
  );
}

