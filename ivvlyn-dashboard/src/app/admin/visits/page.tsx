import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Visit } from "@/lib/types";
import VisitCalendar from "@/components/dashboard/VisitCalendar";

type Search = { clientId?: string };

export default async function AdminVisitsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const resolved = await searchParams;
  const filterClientId = typeof resolved.clientId === "string" && resolved.clientId ? resolved.clientId : null;

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return <div className="p-8 pt-0 text-[#555]">Configure Supabase to load visits.</div>;
  }

  const { data: clientRows } = await supabase
    .from("clients")
    .select("id, business_name, name")
    .order("created_at", { ascending: false });

  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - 7);
  const end = new Date(now);
  end.setDate(end.getDate() + 60);
  const startKey = start.toISOString().slice(0, 10);
  const endKey = end.toISOString().slice(0, 10);

  let vq = supabase
    .from("visits")
    .select("id, lead_id, lead_name, visit_date, visit_time, property, status, reminder_sent, notes, client_id")
    .gte("visit_date", startKey)
    .lte("visit_date", endKey)
    .order("visit_date", { ascending: true });

  if (filterClientId) vq = vq.eq("client_id", filterClientId);

  const { data: visitsRows, error: visitsErr } = await vq;

  const visits = (visitsErr ? [] : visitsRows ?? []) as Visit[];

  const clientMap = new Map((clientRows ?? []).map((c) => [c.id as string, c]));

  return (
    <div className="p-8 pt-0 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[#0A0A0A] text-[22px] font-medium">Site visits (all tenants)</h1>
          <p className="text-[#555] text-[13px] mt-1">
            Operational calendar across clients. Filter by tenant when debugging one workspace.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center text-[13px]">
          <span className="text-[#888]">Client:</span>
          <Link
            href="/admin/visits"
            className={`rounded-lg px-2 py-1 ${!filterClientId ? "bg-[#F4F4F2] font-medium" : "text-[#555] hover:text-[#0A0A0A]"}`}
          >
            All
          </Link>
          {(clientRows ?? []).slice(0, 24).map((c) => (
            <Link
              key={c.id as string}
              href={`/admin/visits?clientId=${encodeURIComponent(c.id as string)}`}
              className={`rounded-lg px-2 py-1 truncate max-w-[140px] ${
                filterClientId === c.id ? "bg-[#F4F4F2] font-medium" : "text-[#555] hover:text-[#0A0A0A]"
              }`}
              title={(c.business_name as string) || (c.name as string)}
            >
              {(c.business_name as string) || (c.name as string)}
            </Link>
          ))}
        </div>
      </div>

      {visitsErr ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[13px] text-amber-900">
          Could not load visits (table missing or RLS). {visitsErr.message}
        </div>
      ) : null}

      <div className="rounded-xl border border-[#E8E8E8] bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-[#FAFAF8] text-[11px] font-semibold uppercase tracking-wide text-[#666]">
              <tr>
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Client</th>
                <th className="px-4 py-2">Lead</th>
                <th className="px-4 py-2">Property</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ECECEA]">
              {visits.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-[#888]">
                    No visits in this window.
                  </td>
                </tr>
              ) : (
                visits.map((v) => {
                  const cl = clientMap.get(v.client_id);
                  const cn = cl ? ((cl as { business_name?: string; name?: string }).business_name || (cl as { name?: string }).name) : v.client_id;
                  return (
                    <tr key={v.id}>
                      <td className="px-4 py-2 whitespace-nowrap">
                        {v.visit_date}
                        {v.visit_time ? ` · ${v.visit_time}` : ""}
                      </td>
                      <td className="px-4 py-2 max-w-[160px] truncate" title={cn}>
                        {cn}
                      </td>
                      <td className="px-4 py-2">{v.lead_name ?? v.lead_id ?? "—"}</td>
                      <td className="px-4 py-2 max-w-[200px] truncate">{v.property ?? "—"}</td>
                      <td className="px-4 py-2">{v.status}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#888] mb-3">Calendar</h2>
        <VisitCalendar visits={visits} />
      </div>
    </div>
  );
}
