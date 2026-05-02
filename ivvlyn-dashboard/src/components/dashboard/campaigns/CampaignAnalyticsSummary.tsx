"use client";

type Row = {
  id: string;
  state: string;
  stats_total_targets: number;
  stats_enqueued: number;
  stats_failed: number;
};

type Props = {
  campaigns: Row[];
};

export default function CampaignAnalyticsSummary({ campaigns }: Props) {
  if (campaigns.length === 0) return null;

  const completed = campaigns.filter((c) => c.state === "completed" || c.state === "failed");
  const sumTargets = completed.reduce((s, c) => s + (c.stats_total_targets || 0), 0);
  const sumEnq = completed.reduce((s, c) => s + (c.stats_enqueued || 0), 0);
  const sumFail = completed.reduce((s, c) => s + (c.stats_failed || 0), 0);
  const deliveryPct = sumTargets > 0 ? Math.round((sumEnq / sumTargets) * 1000) / 10 : null;
  const failPct = sumEnq + sumFail > 0 ? Math.round((sumFail / (sumEnq + sumFail)) * 1000) / 10 : null;

  return (
    <div className="rounded-xl border border-[#1A1A1A] bg-[#0D0D0D] p-4">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-[#666]">Broadcast analytics (sent runs)</div>
      <p className="mt-1 text-[12px] text-[#888]">
        Based on completed or failed campaign runs in this list. Schedule / draft rows are excluded.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg bg-[#111] px-3 py-2 text-center">
          <div className="text-[20px] font-medium text-white">{completed.length}</div>
          <div className="text-[10px] text-[#888]">finished runs</div>
        </div>
        <div className="rounded-lg bg-[#111] px-3 py-2 text-center">
          <div className="text-[20px] font-medium text-white">{sumTargets.toLocaleString()}</div>
          <div className="text-[10px] text-[#888]">recipients targeted</div>
        </div>
        <div className="rounded-lg bg-[#111] px-3 py-2 text-center">
          <div className="text-[20px] font-medium text-emerald-400/90">{deliveryPct !== null ? `${deliveryPct}%` : "—"}</div>
          <div className="text-[10px] text-[#888]">jobs queued ÷ targets</div>
        </div>
        <div className="rounded-lg bg-[#111] px-3 py-2 text-center">
          <div className="text-[20px] font-medium text-red-300/90">{failPct !== null ? `${failPct}%` : "—"}</div>
          <div className="text-[10px] text-[#888]">fail share (fail ÷ queued+fail)</div>
        </div>
      </div>
    </div>
  );
}
