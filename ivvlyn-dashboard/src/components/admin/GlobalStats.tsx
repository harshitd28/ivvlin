import StatCard from "@/components/shared/StatCard";

type Props = {
  totalClients: number;
  leadsToday: number;
  leadsDeltaText: string;
  messagesToday: number;
  visitsToday: number;
};

export default function GlobalStats({
  totalClients,
  leadsToday,
  leadsDeltaText,
  messagesToday,
  visitsToday,
}: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard label="TOTAL CLIENTS" value={totalClients} />
      <StatCard label="LEADS TODAY" value={leadsToday} delta={{ text: leadsDeltaText, kind: "up" }} />
      <StatCard label="MESSAGES SENT" value={messagesToday} />
      <StatCard label="VISITS TODAY" value={visitsToday} />
    </div>
  );
}

