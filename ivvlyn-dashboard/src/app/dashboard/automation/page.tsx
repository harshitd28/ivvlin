import Link from "next/link";

export default function AutomationPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 p-8 pt-0 text-white">
      <div>
        <p className="text-[11px] uppercase tracking-[0.14em] text-[#666]">Automation</p>
        <h1 className="mt-1 text-[22px] font-semibold">Workflows &amp; integrations</h1>
        <p className="mt-2 text-[14px] text-[#999] leading-relaxed">
          Long-form journeys and a visual rule builder are on the roadmap. Today, Ivvlin is designed to work with{" "}
          <strong className="text-[#ccc]">n8n</strong>, <strong className="text-[#ccc]">Make</strong>, or your own workers calling
          dashboard APIs and webhooks.
        </p>
      </div>

      <section className="rounded-xl border border-[#1f1f1f] bg-[#0d0d0d] p-5 space-y-3">
        <h2 className="text-[13px] font-medium text-[#ccc]">Inbound when Meta is not on this app</h2>
        <p className="text-[13px] text-[#888] leading-relaxed">
          Forward WhatsApp Cloud events to <code className="rounded bg-[#111] px-1.5 py-0.5 text-[12px] text-emerald-300/90">POST /api/internal/ingest/whatsapp</code>{" "}
          with <code className="rounded bg-[#111] px-1.5 py-0.5 text-[12px]">Authorization: Bearer</code> using{" "}
          <code className="rounded bg-[#111] px-1.5 py-0.5 text-[12px]">INTERNAL_INGEST_SECRET</code>. Same idempotency keys as the
          native Meta webhook so duplicates do not land twice.
        </p>
        <p className="text-[12px] text-[#666]">
          Runbook: <code className="text-[#888]">docs/n8n-whatsapp-forward.md</code>
        </p>
      </section>

      <section className="rounded-xl border border-[#1f1f1f] bg-[#0d0d0d] p-5 space-y-3">
        <h2 className="text-[13px] font-medium text-[#ccc]">Automation ↔ dashboard state</h2>
        <p className="text-[13px] text-[#888] leading-relaxed">
          When an agent takes over in the inbox, <code className="rounded bg-[#111] px-1.5 py-0.5 text-[12px]">leads.mode</code>{" "}
          becomes <code className="rounded bg-[#111] px-1.5 py-0.5 text-[12px]">human</code>. External workflows should branch on that
          field (or call your CRM) so auto-replies pause. Optional:{" "}
          <code className="rounded bg-[#111] px-1.5 py-0.5 text-[12px]">POST /webhook/takeover-handler</code> with{" "}
          <code className="rounded bg-[#111] px-1.5 py-0.5 text-[12px]">WEBHOOK_SHARED_SECRET</code>.
        </p>
      </section>

      <section className="rounded-xl border border-[#1f1f1f] bg-[#0d0d0d] p-5 space-y-3">
        <h2 className="text-[13px] font-medium text-[#ccc]">Outbound &amp; campaigns</h2>
        <p className="text-[13px] text-[#888] leading-relaxed">
          All sends flow through <code className="rounded bg-[#111] px-1.5 py-0.5 text-[12px]">outbound_message_jobs</code>. Cron / worker
          drain is required in production — see <code className="text-[#888]">docs/cron-examples.md</code>.
        </p>
        <Link href="/dashboard/campaigns" className="inline-block text-[13px] text-[#6C5CE7] hover:underline">
          Open campaigns →
        </Link>
      </section>
    </div>
  );
}
