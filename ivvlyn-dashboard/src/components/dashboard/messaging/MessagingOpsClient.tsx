"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, RotateCcw } from "lucide-react";
import type { DeadJobRow } from "@/app/api/inbox/dead-jobs/route";
import type { MessagingInsights } from "@/lib/inbox/messaging-insights";
import { Button } from "@/components/ui/button";
import MessagingOpsCharts from "@/components/dashboard/messaging/MessagingOpsCharts";

export default function MessagingOpsClient() {
  const [jobs, setJobs] = useState<DeadJobRow[]>([]);
  const [insights, setInsights] = useState<MessagingInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refreshAll = useCallback(async () => {
    setError(null);
    const [deadRes, insRes] = await Promise.all([
      fetch("/api/inbox/dead-jobs", { credentials: "include" }),
      fetch("/api/inbox/messaging-insights", { credentials: "include" }),
    ]);

    const deadJson = (await deadRes.json().catch(() => ({}))) as {
      ok?: boolean;
      jobs?: DeadJobRow[];
      message?: string;
    };
    const insJson = (await insRes.json().catch(() => ({}))) as {
      ok?: boolean;
      insights?: MessagingInsights;
      message?: string;
    };

    const deadOk = deadRes.ok && deadJson.ok;
    const insOk = insRes.ok && insJson.ok && insJson.insights;

    setJobs(deadOk ? deadJson.jobs ?? [] : []);
    setInsights(insOk && insJson.insights ? insJson.insights : null);

    const parts: string[] = [];
    if (!deadOk) parts.push(deadJson.message ?? "Could not load dead-letter jobs");
    if (!insOk && insJson.message) parts.push(insJson.message);
    if (!insOk && !insJson.message && !insRes.ok) parts.push("Could not load messaging insights");
    setError(parts.length ? parts.join(" · ") : null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void refreshAll().finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [refreshAll]);

  async function requeue(jobId: string) {
    setBusyId(jobId);
    setError(null);
    const res = await fetch("/api/inbox/dead-jobs", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ job_id: jobId }),
    });
    const d = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string };
    if (!res.ok || !d.ok) {
      setError(d.message ?? "Requeue failed");
      setBusyId(null);
      return;
    }
    await refreshAll();
    setBusyId(null);
  }

  const qc = insights?.counts;

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-6 text-white">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.14em] text-[#666]">Messaging operations</p>
          <h1 className="mt-1 text-[22px] font-semibold">Health &amp; dead-letter queue</h1>
          <p className="mt-1 max-w-xl text-[13px] text-[#999]">
            Queue snapshot, webhook visibility, retryable failures, and jobs stuck in{" "}
            <strong className="text-[#ccc]">dead</strong> after max attempts (requeue resets and sends again).
          </p>
        </div>
        <Link
          href="/dashboard/conversations"
          className="text-[13px] text-[#888] underline-offset-4 hover:text-white hover:underline"
        >
          ← Back to inbox
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 border-[#333] bg-[#111] text-[12px] text-white hover:bg-[#1a1a1a]"
          onClick={() => {
            setLoading(true);
            void refreshAll().finally(() => setLoading(false));
          }}
          disabled={loading}
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : null}
          Refresh all
        </Button>
        {error ? <span className="text-[12px] text-red-400">{error}</span> : null}
      </div>

      {insights ? (
        <section className="space-y-3">
          <h2 className="text-[11px] font-medium uppercase tracking-wider text-[#777]">Charts</h2>
          <MessagingOpsCharts insights={insights} />
        </section>
      ) : null}

      {qc ? (
        <section className="rounded-xl border border-[#1f1f1f] bg-[#0a0a0a] p-4 text-[12px]">
          <h2 className="text-[11px] font-medium uppercase tracking-wider text-[#777]">Outbound queue</h2>
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-[#ccc]">
            <span>
              pending <strong className="text-white">{qc.pending}</strong>
            </span>
            <span>
              processing <strong className="text-white">{qc.processing}</strong>
            </span>
            <span>
              failed <strong className="text-white">{qc.failed}</strong>
            </span>
            <span>
              dead <strong className="text-white">{qc.dead}</strong>
            </span>
            <span title="Seconds since oldest pending job was scheduled">
              lag{" "}
              <strong className="text-white">
                {typeof insights?.pending_lag_seconds === "number" ? `${insights.pending_lag_seconds}s` : "—"}
              </strong>
            </span>
          </div>
        </section>
      ) : loading ? (
        <div className="flex items-center gap-2 text-[13px] text-[#777]">
          <Loader2 size={16} className="animate-spin" /> Loading insights…
        </div>
      ) : null}

      {insights && insights.recent_failed.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-[11px] font-medium uppercase tracking-wider text-[#777]">
            Recent job errors (pending retry, processing, or dead)
          </h2>
          <div className="overflow-hidden rounded-xl border border-[#1f1f1f] bg-[#0d0d0d]">
            <table className="w-full text-left text-[12px]">
              <thead className="border-b border-[#222] bg-[#0a0a0a] text-[10px] uppercase tracking-wide text-[#777]">
                <tr>
                  <th className="px-4 py-2 font-medium">Job id</th>
                  <th className="px-4 py-2 font-medium">Lead</th>
                  <th className="px-4 py-2 font-medium">State</th>
                  <th className="px-4 py-2 font-medium">Attempts</th>
                  <th className="px-4 py-2 font-medium">Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a1a1a]">
                {insights.recent_failed.map((j) => (
                  <tr key={j.id} className="text-[#ccc]">
                    <td className="px-4 py-2 font-mono text-[10px] text-[#888]">{j.id.slice(0, 8)}…</td>
                    <td className="px-4 py-2 font-mono text-[11px]">{j.lead_id}</td>
                    <td className="px-4 py-2 text-[#888]">{j.state ?? "—"}</td>
                    <td className="px-4 py-2">{j.attempts}</td>
                    <td className="max-w-lg px-4 py-2 text-amber-100/90">{j.last_error ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {insights && insights.webhook_events_24h.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-[11px] font-medium uppercase tracking-wider text-[#777]">
            Webhook delivery (24h)
          </h2>
          <div className="overflow-hidden rounded-xl border border-[#1f1f1f] bg-[#0d0d0d]">
            <table className="w-full text-left text-[12px]">
              <thead className="border-b border-[#222] bg-[#0a0a0a] text-[10px] uppercase tracking-wide text-[#777]">
                <tr>
                  <th className="px-4 py-2 font-medium">Time</th>
                  <th className="px-4 py-2 font-medium">Source</th>
                  <th className="px-4 py-2 font-medium">Kind</th>
                  <th className="px-4 py-2 font-medium">Outcome</th>
                  <th className="px-4 py-2 font-medium">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a1a1a]">
                {insights.webhook_events_24h.map((w) => (
                  <tr key={w.id} className="text-[#ccc]">
                    <td className="whitespace-nowrap px-4 py-2 text-[#888]">
                      {new Date(w.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-2">{w.source}</td>
                    <td className="px-4 py-2">{w.event_kind}</td>
                    <td className="px-4 py-2">
                      <span
                        className={
                          w.outcome === "ok"
                            ? "text-emerald-400/90"
                            : w.outcome === "skipped"
                              ? "text-amber-200/90"
                              : "text-red-400/90"
                        }
                      >
                        {w.outcome}
                      </span>
                    </td>
                    <td className="max-w-md truncate px-4 py-2 font-mono text-[10px] text-[#999]" title={JSON.stringify(w.detail)}>
                      {w.error_message ?? JSON.stringify(w.detail)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className="space-y-2">
        <h2 className="text-[11px] font-medium uppercase tracking-wider text-[#777]">Dead-letter jobs</h2>
        <div className="overflow-hidden rounded-xl border border-[#1f1f1f] bg-[#0d0d0d]">
          {loading && jobs.length === 0 ? (
            <div className="flex items-center gap-2 p-8 text-[13px] text-[#777]">
              <Loader2 size={16} className="animate-spin" /> Loading…
            </div>
          ) : jobs.length === 0 ? (
            <div className="p-8 text-[13px] text-[#666]">No dead-letter jobs for your workspace.</div>
          ) : (
            <table className="w-full text-left text-[12px]">
              <thead className="border-b border-[#222] bg-[#0a0a0a] text-[10px] uppercase tracking-wide text-[#777]">
                <tr>
                  <th className="px-4 py-2 font-medium">Lead</th>
                  <th className="px-4 py-2 font-medium">Channel</th>
                  <th className="px-4 py-2 font-medium">Attempts</th>
                  <th className="px-4 py-2 font-medium">Last error</th>
                  <th className="px-4 py-2 font-medium">Updated</th>
                  <th className="w-[120px] px-4 py-2 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a1a1a]">
                {jobs.map((j) => (
                  <tr key={j.id} className="text-[#ccc]">
                    <td className="px-4 py-3 font-mono text-[11px]">{j.lead_id}</td>
                    <td className="px-4 py-3">{j.channel}</td>
                    <td className="px-4 py-3">
                      {j.attempts}/{j.max_attempts}
                    </td>
                    <td className="max-w-md truncate px-4 py-3 text-amber-100/90" title={j.last_error ?? ""}>
                      {j.last_error ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-[#888]">{new Date(j.updated_at).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        disabled={busyId === j.id}
                        onClick={() => void requeue(j.id)}
                        className="inline-flex items-center gap-1 rounded-md border border-[#333] px-2 py-1 text-[11px] text-white hover:border-[#555] disabled:opacity-50"
                      >
                        {busyId === j.id ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <RotateCcw size={12} />
                        )}
                        Requeue
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
