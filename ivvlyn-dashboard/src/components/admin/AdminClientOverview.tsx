import Link from "next/link";
import { format } from "date-fns";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Props = {
  clientId: string;
};

export default async function AdminClientOverview({ clientId }: Props) {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return (
      <div className="p-8 pt-0">
        <p className="text-[#555] text-[13px]">Configure Supabase to load client overview.</p>
      </div>
    );
  }

  const { data: clientRow, error: clientErr } = await supabase
    .from("clients")
    .select("id, name, business_name, industry, status, city, whatsapp_phone_id, created_at")
    .eq("id", clientId)
    .maybeSingle();

  if (clientErr || !clientRow) {
    return (
      <div className="p-8 pt-0 space-y-2">
        <h1 className="text-[#0A0A0A] text-[22px] font-medium">Client not found</h1>
        <p className="text-[#555] text-[13px]">Check the client id or pick another tenant from the sidebar switcher.</p>
        <Link href="/admin" className="text-[13px] text-[#0A0A0A] underline underline-offset-4">
          ← All clients
        </Link>
      </div>
    );
  }

  const client = clientRow as {
    id: string;
    name: string;
    business_name: string;
    industry: string;
    status: string | null;
    city: string | null;
    whatsapp_phone_id: string | null;
    created_at: string;
  };

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

  const [leadsTotal, leadsToday, hotLeads, campaignsRecent, pendingJobs] = await Promise.all([
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("client_id", clientId),
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("client_id", clientId)
      .gte("created_at", startOfToday.toISOString())
      .lt("created_at", startOfTomorrow.toISOString()),
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("client_id", clientId)
      .gte("score", 70),
    supabase
      .from("campaigns")
      .select("id, name, state, stats_total_targets, stats_enqueued, stats_failed, completed_at, created_at")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("outbound_message_jobs")
      .select("id", { count: "exact", head: true })
      .eq("client_id", clientId)
      .eq("state", "pending"),
  ]);

  const visitsUpcoming = await supabase
    .from("visits")
    .select("id", { count: "exact", head: true })
    .eq("client_id", clientId)
    .gte("visit_date", format(new Date(), "yyyy-MM-dd"));

  const visitsCount = visitsUpcoming.error ? 0 : num(visitsUpcoming.count);

  const qs = `?clientId=${encodeURIComponent(clientId)}`;

  return (
    <div className="p-8 pt-0 space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.14em] text-[#888]">Tenant overview</p>
          <h1 className="text-[#0A0A0A] text-[22px] font-medium">{client.business_name || client.name}</h1>
          <p className="mt-1 text-[13px] text-[#555]">
            {client.industry}
            {client.city ? ` · ${client.city}` : ""}
            {client.status ? ` · ${client.status}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-[13px]">
          <Link
            href={`/admin/leads${qs}`}
            className="rounded-lg border border-[#E8E8E8] bg-white px-3 py-1.5 hover:bg-[#F4F4F2]"
          >
            Leads
          </Link>
          <Link
            href={`/admin/conversations${qs}`}
            className="rounded-lg border border-[#E8E8E8] bg-white px-3 py-1.5 hover:bg-[#F4F4F2]"
          >
            Conversations
          </Link>
          <Link
            href={`/admin/webhooks`}
            className="rounded-lg border border-[#E8E8E8] bg-white px-3 py-1.5 hover:bg-[#F4F4F2]"
          >
            Webhooks
          </Link>
          <Link href="/admin" className="rounded-lg px-3 py-1.5 text-[#555] hover:text-[#0A0A0A]">
            ← All clients
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Total leads" value={num(leadsTotal.count)} />
        <Stat label="New today" value={num(leadsToday.count)} />
        <Stat label="Hot (≥70)" value={num(hotLeads.count)} />
        <Stat label="Queue pending" value={num(pendingJobs.count)} />
        <Stat label="Visits from today" value={visitsCount} />
        <Stat label="WA phone id" valueShort={client.whatsapp_phone_id ? "Set" : "—"} />
      </div>

      <section className="space-y-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#888]">Recent campaigns</h2>
        <div className="rounded-xl border border-[#E8E8E8] bg-white divide-y divide-[#ECECEA]">
          {(campaignsRecent.data ?? []).length === 0 ? (
            <div className="p-4 text-[13px] text-[#888]">No campaigns for this tenant.</div>
          ) : (
            (campaignsRecent.data ?? []).map((row) => {
              const r = row as {
                id: string;
                name: string;
                state: string;
                stats_total_targets: number;
                stats_enqueued: number;
                stats_failed: number;
              };
              return (
                <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-[13px]">
                  <div>
                    <div className="font-medium text-[#0A0A0A]">{r.name}</div>
                    <div className="text-[11px] text-[#888]">
                      {r.state} · targets {r.stats_total_targets} · queued {r.stats_enqueued} · failed {r.stats_failed}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}

function num(c: number | null | undefined) {
  return typeof c === "number" ? c : 0;
}

function Stat({
  label,
  value,
  valueShort,
}: {
  label: string;
  value?: number;
  valueShort?: string;
}) {
  return (
    <div className="rounded-xl border border-[#E8E8E8] bg-[#FAFAF8] px-3 py-3">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-[#888]">{label}</div>
      <div className="mt-1 text-[18px] font-medium tabular-nums text-[#0A0A0A]">
        {valueShort !== undefined ? valueShort : value ?? 0}
      </div>
    </div>
  );
}
