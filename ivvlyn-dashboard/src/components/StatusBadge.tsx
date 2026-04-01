type Status = "hot" | "warm" | "cold" | "lost" | "new" | "closed" | string;

type Props = {
  status: Status;
};

const styles: Record<string, string> = {
  hot: "bg-red-500/15 text-red-300 border-red-500/30",
  warm: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  cold: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  lost: "bg-gray-500/15 text-gray-300 border-gray-500/30",
  new: "bg-white/10 text-gray-100 border-white/20",
  closed: "bg-green-500/15 text-green-300 border-green-500/30",
};

export default function StatusBadge({ status }: Props) {
  const key = String(status || "").toLowerCase();
  const cls = styles[key] ?? "bg-white/10 text-gray-100 border-white/20";
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-wide ${cls}`}>
      {key || "new"}
    </span>
  );
}
