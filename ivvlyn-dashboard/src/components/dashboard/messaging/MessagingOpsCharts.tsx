"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MessagingInsights } from "@/lib/inbox/messaging-insights";

const PIE_COLORS = ["#6C5CE7", "#00CEC9", "#FDCB6E", "#FF7675"];

type Props = {
  insights: MessagingInsights | null;
};

export default function MessagingOpsCharts({ insights }: Props) {
  const qc = insights?.counts;
  const queueData = qc
    ? [
        { name: "pending", value: qc.pending },
        { name: "processing", value: qc.processing },
        { name: "failed", value: qc.failed },
        { name: "dead", value: qc.dead },
      ].filter((d) => d.value > 0)
    : [];

  const webhookRows = insights?.webhook_events_24h ?? [];
  const outcomeMap = new Map<string, number>();
  for (const w of webhookRows) {
    const k = w.outcome || "unknown";
    outcomeMap.set(k, (outcomeMap.get(k) ?? 0) + 1);
  }
  const webhookBarData = Array.from(outcomeMap.entries()).map(([outcome, count]) => ({
    outcome,
    count,
  }));

  if (queueData.length === 0 && webhookBarData.length === 0) {
    return (
      <p className="text-[12px] text-[#666]">
        No chart data yet — refresh once the queue or webhook log has activity.
      </p>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {queueData.length > 0 ? (
        <div className="rounded-xl border border-[#1f1f1f] bg-[#0a0a0a] p-4">
          <h3 className="text-[11px] font-medium uppercase tracking-wider text-[#777]">Outbound queue mix</h3>
          <div className="mt-3 h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={queueData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={72} label={false}>
                  {queueData.map((_, i) => (
                    <Cell key={pieCellKey(i)} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "#111", border: "1px solid #333", borderRadius: 8 }}
                  labelStyle={{ color: "#ccc" }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : null}

      {webhookBarData.length > 0 ? (
        <div className="rounded-xl border border-[#1f1f1f] bg-[#0a0a0a] p-4">
          <h3 className="text-[11px] font-medium uppercase tracking-wider text-[#777]">
            Webhook outcomes (24h, tenant)
          </h3>
          <div className="mt-3 h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={webhookBarData} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                <XAxis dataKey="outcome" tick={{ fill: "#888", fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fill: "#888", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: "#111", border: "1px solid #333", borderRadius: 8 }}
                  labelStyle={{ color: "#ccc" }}
                />
                <Bar dataKey="count" fill="#6C5CE7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function pieCellKey(i: number) {
  return `pie-${i}`;
}
