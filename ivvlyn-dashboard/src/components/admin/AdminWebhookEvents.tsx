import Link from "next/link";

export type WebhookEventRow = {
  id: string;
  created_at: string;
  client_id: string | null;
  source: string;
  event_kind: string;
  outcome: string;
  error_message: string | null;
  detail: Record<string, unknown>;
};

type Props = {
  rows: WebhookEventRow[];
  scope: "orphan" | "all";
  loadError: string | null;
};

function truncateJson(obj: unknown, max = 280): string {
  const s = JSON.stringify(obj);
  if (s.length <= max) return s;
  return `${s.slice(0, max)}…`;
}

export default function AdminWebhookEvents({ rows, scope, loadError }: Props) {
  const qs = scope === "all" ? "?scope=all" : "";

  return (
    <div className="p-8 pt-14 space-y-4 max-w-[1200px]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[#0A0A0A] text-[20px] font-medium">Webhook delivery log</h1>
          <p className="text-[#555] text-[13px] mt-1">
            Rows without a tenant (<span className="text-[#0A0A0A]">client_id</span> null) are invisible to client dashboards;
            admins can review them here.
          </p>
        </div>
        <div className="flex rounded-lg border border-[#E8E8E8] bg-white p-0.5 text-[13px]">
          <Link
            href="/admin/webhooks"
            className={
              scope === "orphan"
                ? "rounded-md bg-[#F4F4F2] px-3 py-1.5 font-medium text-[#0A0A0A]"
                : "rounded-md px-3 py-1.5 text-[#555555] hover:text-[#0A0A0A]"
            }
          >
            Orphan only
          </Link>
          <Link
            href="/admin/webhooks?scope=all"
            className={
              scope === "all"
                ? "rounded-md bg-[#F4F4F2] px-3 py-1.5 font-medium text-[#0A0A0A]"
                : "rounded-md px-3 py-1.5 text-[#555555] hover:text-[#0A0A0A]"
            }
          >
            All recent
          </Link>
        </div>
      </div>

      {loadError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-900">{loadError}</div>
      ) : null}

      <div className="rounded-xl border border-[#E8E8E8] bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-[#FAFAF8] text-[11px] font-semibold uppercase tracking-wide text-[#666]">
              <tr>
                <th className="px-4 py-3 whitespace-nowrap">Time</th>
                <th className="px-4 py-3 whitespace-nowrap">Outcome</th>
                <th className="px-4 py-3 whitespace-nowrap">Source / kind</th>
                <th className="px-4 py-3 whitespace-nowrap">Client</th>
                <th className="px-4 py-3 min-w-[200px]">Error</th>
                <th className="px-4 py-3 min-w-[240px]">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ECECEA]">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[#888]">
                    No events in this view.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="align-top">
                    <td className="px-4 py-3 whitespace-nowrap text-[#333] tabular-nums">
                      {new Date(r.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={
                          r.outcome === "error"
                            ? "text-red-700 font-medium"
                            : r.outcome === "skipped"
                              ? "text-amber-700"
                              : "text-emerald-700"
                        }
                      >
                        {r.outcome}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-[#0A0A0A]">{r.source}</div>
                      <div className="text-[12px] text-[#666]">{r.event_kind}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-[12px] text-[#555] max-w-[120px] truncate" title={r.client_id ?? ""}>
                      {r.client_id ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-[12px] text-[#333] break-words max-w-[280px]">{r.error_message ?? "—"}</td>
                    <td className="px-4 py-3 font-mono text-[11px] text-[#555] break-all">{truncateJson(r.detail)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-[11px] text-[#888]">
        Showing up to 200 rows{scope === "orphan" ? " with no linked tenant" : ""}. Query:{" "}
        <code className="rounded bg-[#F4F4F2] px-1 py-0.5">/admin/webhooks{qs}</code>
      </p>
    </div>
  );
}
