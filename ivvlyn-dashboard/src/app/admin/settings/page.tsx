import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function envOk(name: string): boolean {
  const v = process.env[name];
  return typeof v === "string" && v.trim().length > 0;
}

export default async function AdminSettingsPage() {
  const flags = [
    { key: "META_VERIFY_TOKEN", label: "Meta webhook verify token", ok: envOk("META_VERIFY_TOKEN") },
    { key: "META_APP_SECRET", label: "Meta app secret (signature)", ok: envOk("META_APP_SECRET") },
    { key: "SUPABASE_SERVICE_ROLE_KEY", label: "Supabase service role", ok: envOk("SUPABASE_SERVICE_ROLE_KEY") },
    { key: "CRON_SECRET", label: "Cron / internal job auth", ok: envOk("CRON_SECRET") },
    { key: "INTERNAL_INGEST_SECRET", label: "Internal ingest (n8n forward)", ok: envOk("INTERNAL_INGEST_SECRET") },
    { key: "REDIS_URL", label: "Redis (queue fast-lane + webhook RL)", ok: envOk("REDIS_URL") },
    { key: "WEBHOOK_SHARED_SECRET", label: "Takeover webhook secret (optional)", ok: envOk("WEBHOOK_SHARED_SECRET") },
  ];

  const supabase = await createSupabaseServerClient();
  let auditRows: Array<{
    id: string;
    created_at: string;
    action: string;
    resource_type: string;
    resource_id: string | null;
    client_id: string | null;
    detail: Record<string, unknown>;
  }> = [];

  if (supabase) {
    const { data } = await supabase
      .from("audit_events")
      .select("id, created_at, action, resource_type, resource_id, client_id, detail")
      .order("created_at", { ascending: false })
      .limit(40);
    auditRows = (data ?? []) as typeof auditRows;
  }

  return (
    <div className="p-8 pt-0 space-y-8">
      <div>
        <h1 className="text-[#0A0A0A] text-[22px] font-medium">Admin settings</h1>
        <p className="text-[#555] text-[13px] mt-2">
          Environment readiness (values are never shown). Manage secrets in your host dashboard (e.g. Vercel → Settings →
          Environment Variables).
        </p>
      </div>

      <section className="rounded-xl border border-[#E8E8E8] bg-white p-5 space-y-3">
        <h2 className="text-[#0A0A0A] text-[15px] font-medium">Production checks</h2>
        <ul className="divide-y divide-[#ECECEA]">
          {flags.map((f) => (
            <li key={f.key} className="flex flex-wrap items-center justify-between gap-2 py-2 text-[13px]">
              <span className="text-[#333]">{f.label}</span>
              <span className={f.ok ? "text-emerald-700 font-medium" : "text-amber-800"}>{f.ok ? "Set" : "Missing"}</span>
            </li>
          ))}
        </ul>
        <p className="text-[12px] text-[#888]">
          Optional tuning: <code className="rounded bg-[#F4F4F2] px-1">META_WEBHOOK_RATE_PER_MIN</code> (default 400/min per IP
          when <code className="rounded bg-[#F4F4F2] px-1">REDIS_URL</code> is set).
        </p>
      </section>

      <section className="rounded-xl border border-[#E8E8E8] bg-white p-5 space-y-3">
        <h2 className="text-[#0A0A0A] text-[15px] font-medium">Runbooks</h2>
        <ul className="list-disc pl-5 space-y-1 text-[13px] text-[#444]">
          <li>
            <Link href="/admin/webhooks" className="text-[#0A0A0A] underline underline-offset-2">
              Webhook delivery log
            </Link>{" "}
            (orphan rows + export API)
          </li>
          <li>
            Cron snippets: <code className="rounded bg-[#F4F4F2] px-1">docs/cron-examples.md</code>
          </li>
          <li>
            n8n forward: <code className="rounded bg-[#F4F4F2] px-1">docs/n8n-whatsapp-forward.md</code>
          </li>
        </ul>
      </section>

      <section className="rounded-xl border border-[#E8E8E8] bg-white p-5 space-y-3">
        <h2 className="text-[#0A0A0A] text-[15px] font-medium">Audit trail (recent)</h2>
        {auditRows.length === 0 ? (
          <p className="text-[13px] text-[#888]">
            No rows yet — apply migration <code className="rounded bg-[#F4F4F2] px-1">20260515120000_audit_events.sql</code> and
            perform inbox or campaign actions.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[12px]">
              <thead className="text-[10px] uppercase tracking-wide text-[#888]">
                <tr>
                  <th className="py-1 pr-3">Time</th>
                  <th className="py-1 pr-3">Action</th>
                  <th className="py-1 pr-3">Resource</th>
                  <th className="py-1 pr-3">Client</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ECECEA]">
                {auditRows.map((r) => (
                  <tr key={r.id}>
                    <td className="py-2 whitespace-nowrap text-[#555]">{new Date(r.created_at).toLocaleString()}</td>
                    <td className="py-2 font-mono text-[11px]">{r.action}</td>
                    <td className="py-2">
                      {r.resource_type}
                      {r.resource_id ? (
                        <span className="text-[#888]"> · {r.resource_id.slice(0, 8)}…</span>
                      ) : null}
                    </td>
                    <td className="py-2 font-mono text-[10px] text-[#888] max-w-[100px] truncate" title={r.client_id ?? ""}>
                      {r.client_id ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-dashed border-[#DDD] bg-[#FAFAF8] p-5">
        <h2 className="text-[#0A0A0A] text-[15px] font-medium">Billing &amp; AI keys</h2>
        <p className="text-[13px] text-[#555] mt-1">
          Stripe and third-party API keys stay in environment / vault — not stored in this UI. Use your host secrets and
          rotation policy.
        </p>
      </section>
    </div>
  );
}
