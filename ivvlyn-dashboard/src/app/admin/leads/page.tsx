import Link from "next/link";
import { format } from "date-fns";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import AdminActionToast from "@/components/admin/AdminActionToast";
import SelectedLeadsCount from "@/components/admin/SelectedLeadsCount";
import ChannelBadge from "@/components/shared/ChannelBadge";
import LeadScoreBar from "@/components/shared/LeadScoreBar";
import SelectAllLeadsCheckbox from "@/components/admin/SelectAllLeadsCheckbox";
import type { Channel } from "@/lib/types";

type Search = {
  clientId?: string;
  page?: string;
  channel?: string;
  scoreBand?: string;
  stage?: string;
  q?: string;
  bulk?: string;
};

const PAGE_SIZE = 20;

export default async function AdminLeadsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const resolved = await searchParams;
  const clientId = resolved.clientId ?? null;
  const page = Math.max(1, Number.parseInt(resolved.page ?? "1", 10) || 1);
  const channel = resolved.channel ?? "all";
  const scoreBand = resolved.scoreBand ?? "all";
  const stage = resolved.stage ?? "all";
  const q = (resolved.q ?? "").trim();
  const bulk = resolved.bulk ?? "";

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return <div className="p-8 pt-0 text-[#555]">Configure Supabase env vars to load leads.</div>;
  }

  let countQuery = supabase.from("leads").select("id", { count: "exact", head: true });
  let dataQuery = supabase
    .from("leads")
    .select("id, lead_id, client_id, name, preferred_channel, score, stage, status, mode, created_at")
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  if (clientId) {
    countQuery = countQuery.eq("client_id", clientId);
    dataQuery = dataQuery.eq("client_id", clientId);
  }

  if (channel !== "all") {
    countQuery = countQuery.eq("preferred_channel", channel);
    dataQuery = dataQuery.eq("preferred_channel", channel);
  }

  if (scoreBand === "hot") {
    countQuery = countQuery.gte("score", 70);
    dataQuery = dataQuery.gte("score", 70);
  } else if (scoreBand === "warm") {
    countQuery = countQuery.gte("score", 40).lt("score", 70);
    dataQuery = dataQuery.gte("score", 40).lt("score", 70);
  } else if (scoreBand === "cold") {
    countQuery = countQuery.lt("score", 40);
    dataQuery = dataQuery.lt("score", 40);
  }

  if (stage !== "all") {
    countQuery = countQuery.eq("stage", stage);
    dataQuery = dataQuery.eq("stage", stage);
  }

  if (q) {
    countQuery = countQuery.or(`name.ilike.%${q}%,lead_id.ilike.%${q}%`);
    dataQuery = dataQuery.or(`name.ilike.%${q}%,lead_id.ilike.%${q}%`);
  }

  const [{ count }, rowsRes] = await Promise.all([countQuery, dataQuery]);
  const rows = (rowsRes.data ?? []) as Array<{
    id: string;
    lead_id: string;
    client_id: string;
    name: string | null;
    preferred_channel: Channel;
    score: number | null;
    stage: string | null;
    status: string | null;
    mode: "ai" | "human";
    created_at: string;
  }>;

  const clientIds = Array.from(new Set(rows.map((r) => r.client_id)));
  const clientMap = new Map<string, string>();
  if (clientIds.length) {
    const { data: clientRows } = await supabase
      .from("clients")
      .select("id, business_name")
      .in("id", clientIds);
    for (const c of (clientRows ?? []) as Array<{ id: string; business_name: string }>) {
      clientMap.set(c.id, c.business_name);
    }
  }

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function pageHref(nextPage: number) {
    const query = new URLSearchParams();
    if (clientId) query.set("clientId", clientId);
    if (channel !== "all") query.set("channel", channel);
    if (scoreBand !== "all") query.set("scoreBand", scoreBand);
    if (stage !== "all") query.set("stage", stage);
    if (q) query.set("q", q);
    query.set("page", String(nextPage));
    return `/admin/leads?${query.toString()}`;
  }

  const currentQuery = new URLSearchParams();
  if (clientId) currentQuery.set("clientId", clientId);
  if (channel !== "all") currentQuery.set("channel", channel);
  if (scoreBand !== "all") currentQuery.set("scoreBand", scoreBand);
  if (stage !== "all") currentQuery.set("stage", stage);
  if (q) currentQuery.set("q", q);
  currentQuery.set("page", String(page));
  const redirectTo = `/admin/leads?${currentQuery.toString()}`;
  const filteredRedirect = `/admin/leads?${currentQuery.toString()}`;
  const exportQuery = new URLSearchParams();
  if (clientId) exportQuery.set("clientId", clientId);
  if (channel !== "all") exportQuery.set("channel", channel);
  if (scoreBand !== "all") exportQuery.set("scoreBand", scoreBand);
  if (stage !== "all") exportQuery.set("stage", stage);
  if (q) exportQuery.set("q", q);

  const toastMessage =
    bulk === "ok"
      ? "Bulk mode update applied."
      : bulk === "ok_single"
        ? "Lead mode updated."
        : bulk === "ok_assign"
          ? "Bulk owner assignment applied."
          : bulk === "ok_all"
            ? "Action applied to all filtered leads."
            : bulk === "none"
              ? "Select at least one lead before bulk update."
              : bulk === "missing_owner"
                ? "Enter owner value before assigning."
                : bulk === "forbidden"
                  ? "Only admin users can run bulk mode updates."
                  : bulk
                    ? "Could not apply bulk update."
                    : "";
  const toastKind = bulk === "ok" || bulk === "ok_single" || bulk === "ok_assign" || bulk === "ok_all" ? "success" : "error";

  return (
    <div className="p-8 pt-0 space-y-5">
      {toastMessage ? <AdminActionToast message={toastMessage} kind={toastKind} /> : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[#0A0A0A] text-[22px] font-medium">All Leads</h1>
        <div className="inline-flex items-center gap-3">
          <div className="text-[12px] text-[#666]">{total} total</div>
          <a
            href={`/api/admin/leads/export?${exportQuery.toString()}`}
            className="h-9 px-3 inline-flex items-center rounded-lg border border-[#e5e5e5] text-[13px] text-[#333] hover:bg-[#fafaf8] transition-colors duration-150"
          >
            Export CSV
          </a>
        </div>
      </div>

      <form className="border border-[#E8E8E8] rounded-xl bg-white p-4 grid grid-cols-1 md:grid-cols-6 gap-3" method="GET">
        {clientId ? <input type="hidden" name="clientId" value={clientId} /> : null}
        <input
          name="q"
          defaultValue={q}
          placeholder="Search lead name or ID"
          className="md:col-span-2 h-9 rounded-lg border border-[#e5e5e5] px-3 text-[13px]"
        />
        <select name="channel" defaultValue={channel} className="h-9 rounded-lg border border-[#e5e5e5] px-3 text-[13px]">
          <option value="all">All channels</option>
          <option value="whatsapp">WhatsApp</option>
          <option value="instagram">Instagram</option>
          <option value="facebook">Facebook</option>
          <option value="sms">SMS</option>
          <option value="email">Email</option>
        </select>
        <select name="scoreBand" defaultValue={scoreBand} className="h-9 rounded-lg border border-[#e5e5e5] px-3 text-[13px]">
          <option value="all">All scores</option>
          <option value="hot">Hot (70+)</option>
          <option value="warm">Warm (40-69)</option>
          <option value="cold">Cold (&lt;40)</option>
        </select>
        <select name="stage" defaultValue={stage} className="h-9 rounded-lg border border-[#e5e5e5] px-3 text-[13px]">
          <option value="all">All stages</option>
          <option value="new">new</option>
          <option value="contacted">contacted</option>
          <option value="qualified">qualified</option>
          <option value="visit_scheduled">visit_scheduled</option>
          <option value="visited">visited</option>
          <option value="negotiating">negotiating</option>
          <option value="closed_won">closed_won</option>
          <option value="closed_lost">closed_lost</option>
        </select>
        <div className="inline-flex items-center gap-2">
          <button type="submit" className="h-9 px-3 rounded-lg bg-[#0A0A0A] text-white text-[13px] hover:bg-[#202020] transition-colors duration-150">
            Apply
          </button>
          <Link
            href={clientId ? `/admin/leads?clientId=${encodeURIComponent(clientId)}` : "/admin/leads"}
            className="h-9 px-3 inline-flex items-center rounded-lg border border-[#e5e5e5] text-[13px] text-[#333] hover:bg-[#fafaf8] transition-colors duration-150"
          >
            Clear
          </Link>
        </div>
      </form>

      <div className="border border-[#E8E8E8] rounded-xl bg-white overflow-hidden">
        <div className="hidden md:flex px-4 py-3 border-b border-[#efefef] flex-wrap items-center justify-between gap-2 sticky top-0 bg-white z-20">
          <div className="text-[12px] text-[#666] inline-flex items-center gap-2">
            Bulk actions for selected rows (current page) ·
            <SelectedLeadsCount tableId="admin-leads-bulk-table" />
          </div>
          <div className="inline-flex items-center gap-2 flex-wrap">
            <form id="bulk-mode-form" action="/api/admin/leads/bulk-mode" method="POST" className="inline-flex items-center gap-2 flex-wrap">
              <input type="hidden" name="scope" value="selected" />
              <input type="hidden" name="redirectTo" value={redirectTo} />
              <button type="submit" name="mode" value="human" className="px-3 py-1.5 rounded-lg border border-[#fed7aa] bg-[#fff7ed] text-[#c2410c] text-[12px] hover:bg-[#ffedd5] transition-colors duration-150">
                Set HUMAN
              </button>
              <button type="submit" name="mode" value="ai" className="px-3 py-1.5 rounded-lg border border-[#bfdbfe] bg-[#eff6ff] text-[#1d4ed8] text-[12px] hover:bg-[#dbeafe] transition-colors duration-150">
                Set AI
              </button>
              <input
                type="text"
                name="assignedTo"
                placeholder="Owner phone/email"
                className="h-8 rounded-lg border border-[#e5e5e5] px-2.5 text-[12px] min-w-[170px]"
              />
              <button
                type="submit"
                name="action"
                value="assign"
                className="px-3 py-1.5 rounded-lg border border-[#e5e5e5] bg-white text-[#333] text-[12px] hover:bg-[#fafaf8] transition-colors duration-150"
              >
                Assign Owner
              </button>
            </form>
            <form action="/api/admin/leads/bulk-mode" method="POST" className="inline-flex items-center gap-2">
              <input type="hidden" name="scope" value="filtered" />
              <input type="hidden" name="redirectTo" value={filteredRedirect} />
              {clientId ? <input type="hidden" name="clientId" value={clientId} /> : null}
              {channel !== "all" ? <input type="hidden" name="channel" value={channel} /> : null}
              {scoreBand !== "all" ? <input type="hidden" name="scoreBand" value={scoreBand} /> : null}
              {stage !== "all" ? <input type="hidden" name="stage" value={stage} /> : null}
              {q ? <input type="hidden" name="q" value={q} /> : null}
              <button type="submit" name="mode" value="human" className="px-3 py-1.5 rounded-lg border border-dashed border-[#f0b88f] text-[#c2410c] text-[12px] hover:bg-[#fff7ed] transition-colors duration-150">
                Set HUMAN (All Filtered)
              </button>
              <button type="submit" name="mode" value="ai" className="px-3 py-1.5 rounded-lg border border-dashed border-[#a7c4f7] text-[#1d4ed8] text-[12px] hover:bg-[#eff6ff] transition-colors duration-150">
                Set AI (All Filtered)
              </button>
            </form>
          </div>
        </div>
        <div className="hidden md:block overflow-x-auto">
          <table id="admin-leads-bulk-table" className="w-full min-w-[1060px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-[0.14em] text-[#777] border-b border-[#efefef]">
                <th className="px-4 py-3">
                  <SelectAllLeadsCheckbox tableId="admin-leads-bulk-table" />
                </th>
                <th className="px-4 py-3">Lead</th>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Channel</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Stage</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Mode</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((lead) => (
                <tr key={lead.id} className="border-b border-[#f4f4f4] last:border-b-0 text-[13px]">
                  <td className="px-4 py-3">
                    <input form="bulk-mode-form" type="checkbox" name="leadIds" value={lead.lead_id} className="h-4 w-4 rounded border-[#d4d4d4]" />
                  </td>
                  <td className="px-4 py-3 text-[#111]">{lead.name ?? lead.lead_id}</td>
                  <td className="px-4 py-3 text-[#555]">{clientMap.get(lead.client_id) ?? lead.client_id}</td>
                  <td className="px-4 py-3"><ChannelBadge channel={lead.preferred_channel} /></td>
                  <td className="px-4 py-3 w-[170px]"><LeadScoreBar score={lead.score ?? 0} /></td>
                  <td className="px-4 py-3 text-[#555]">{lead.stage ?? "—"}</td>
                  <td className="px-4 py-3 text-[#555]">{lead.status ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[11px] px-2 py-1 rounded-full border ${lead.mode === "human" ? "bg-[#fff7ed] text-[#c2410c] border-[#fed7aa]" : "bg-[#eff6ff] text-[#1d4ed8] border-[#bfdbfe]"}`}>
                      {lead.mode.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#666]">{format(new Date(lead.created_at), "dd MMM yyyy, hh:mm a")}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-2">
                      <form action="/api/admin/leads/set-mode" method="POST" className="inline">
                        <input type="hidden" name="leadId" value={lead.lead_id} />
                        <input type="hidden" name="mode" value={lead.mode === "ai" ? "human" : "ai"} />
                        <input type="hidden" name="redirectTo" value={redirectTo} />
                        <button type="submit" className="text-[12px] px-2.5 py-1 rounded-lg border border-[#e5e5e5] hover:bg-[#fafaf8] transition-colors duration-150">
                          {lead.mode === "ai" ? "Set HUMAN" : "Set AI"}
                        </button>
                      </form>
                      <Link href={`/dashboard/leads/${encodeURIComponent(lead.lead_id)}`} className="text-[#0A0A0A] hover:underline">
                        Open
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-[13px] text-[#777]">
                    No leads found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className="md:hidden p-3 space-y-3">
          {rows.length === 0 ? (
            <div className="px-4 py-10 text-center text-[13px] text-[#777]">No leads found.</div>
          ) : (
            rows.map((lead) => (
              <div key={lead.id} className="border border-[#efefef] rounded-xl p-3 bg-white">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[14px] font-medium text-[#111] truncate">{lead.name ?? lead.lead_id}</div>
                    <div className="text-[12px] text-[#666] truncate mt-1">{clientMap.get(lead.client_id) ?? lead.client_id}</div>
                  </div>
                  <span className={`text-[11px] px-2 py-1 rounded-full border ${lead.mode === "human" ? "bg-[#fff7ed] text-[#c2410c] border-[#fed7aa]" : "bg-[#eff6ff] text-[#1d4ed8] border-[#bfdbfe]"}`}>
                    {lead.mode.toUpperCase()}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <ChannelBadge channel={lead.preferred_channel} />
                  <div className="flex-1"><LeadScoreBar score={lead.score ?? 0} /></div>
                </div>
                <div className="mt-2 text-[12px] text-[#666]">
                  {lead.stage ?? "—"} · {lead.status ?? "—"} · {format(new Date(lead.created_at), "dd MMM, hh:mm a")}
                </div>
                <div className="mt-3 inline-flex items-center gap-2">
                  <form action="/api/admin/leads/set-mode" method="POST" className="inline">
                    <input type="hidden" name="leadId" value={lead.lead_id} />
                    <input type="hidden" name="mode" value={lead.mode === "ai" ? "human" : "ai"} />
                    <input type="hidden" name="redirectTo" value={redirectTo} />
                    <button type="submit" className="text-[12px] px-2.5 py-1 rounded-lg border border-[#e5e5e5] hover:bg-[#fafaf8] transition-colors duration-150">
                      {lead.mode === "ai" ? "Set HUMAN" : "Set AI"}
                    </button>
                  </form>
                  <Link href={`/dashboard/leads/${encodeURIComponent(lead.lead_id)}`} className="text-[12px] px-2.5 py-1 rounded-lg border border-[#e5e5e5] hover:bg-[#fafaf8] transition-colors duration-150">
                    Open
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="px-4 py-3 flex items-center justify-between border-t border-[#efefef]">
          <div className="text-[12px] text-[#666]">Page {page} of {totalPages}</div>
          <div className="inline-flex items-center gap-2">
            <Link
              href={pageHref(Math.max(1, page - 1))}
              aria-disabled={page <= 1}
              className={`px-3 py-1.5 rounded-lg border text-[12px] ${page <= 1 ? "pointer-events-none opacity-40 border-[#eee]" : "border-[#e5e5e5]"}`}
            >
              Prev
            </Link>
            <Link
              href={pageHref(Math.min(totalPages, page + 1))}
              aria-disabled={page >= totalPages}
              className={`px-3 py-1.5 rounded-lg border text-[12px] ${page >= totalPages ? "pointer-events-none opacity-40 border-[#eee]" : "border-[#e5e5e5]"}`}
            >
              Next
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

