import Link from "next/link";
import { endOfMonth, format, parse } from "date-fns";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import CreditsMonthSelect from "@/components/admin/CreditsMonthSelect";
import AdminActionToast from "@/components/admin/AdminActionToast";

type Search = {
  month?: string;
  clientId?: string;
  page?: string;
  channel?: string;
  logType?: string;
  notice?: string;
};

type CreditLog = {
  id: string;
  client_id: string | null;
  log_type: string | null;
  channel: string | null;
  tokens_used: number | null;
  created_at: string;
};

const PAGE_SIZE = 50;

function monthKey(d: Date) {
  return format(d, "yyyy-MM");
}

export default async function CreditLogsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const resolved = await searchParams;
  const now = new Date();
  const selected = resolved.month && /^\d{4}-\d{2}$/.test(resolved.month) ? resolved.month : monthKey(now);
  const selectedDate = parse(`${selected}-01`, "yyyy-MM-dd", new Date());
  const monthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
  const monthEnd = endOfMonth(monthStart);
  const page = Math.max(1, Number.parseInt(resolved.page ?? "1", 10) || 1);
  const clientId = resolved.clientId ?? "all";
  const channel = resolved.channel ?? "all";
  const logType = resolved.logType && resolved.logType.trim().length ? resolved.logType.trim() : "all";
  const notice = resolved.notice ?? "";

  const monthOptions = Array.from({ length: 6 }).map((_, idx) => {
    const d = new Date(now.getFullYear(), now.getMonth() - idx, 1);
    return monthKey(d);
  });

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return <div className="p-8 pt-0 text-[#555]">Configure Supabase env vars to load credit logs.</div>;
  }

  const { data: clientsRows } = await supabase
    .from("clients")
    .select("id, business_name")
    .order("business_name", { ascending: true });

  const clients = (clientsRows ?? []) as Array<{ id: string; business_name: string }>;
  const clientMap = new Map(clients.map((c) => [c.id, c.business_name]));

  const untyped = supabase as unknown as {
    from: (table: string) => {
      select: (fields: string, options?: { count?: "exact"; head?: boolean }) => {
        gte: (field: string, value: string) => {
          lte: (field: string, value: string) => {
            eq: (field: string, value: string) => unknown;
            range: (from: number, to: number) => Promise<{ data: CreditLog[] | null; error: { message: string } | null }>;
          };
        };
      };
    };
  };

  let countBuilder = untyped
    .from("credit_logs")
    .select("id", { count: "exact", head: true })
    .gte("created_at", monthStart.toISOString())
    .lte("created_at", monthEnd.toISOString()) as unknown as {
    eq: (field: string, value: string) => typeof countBuilder;
  };

  let dataBuilder = untyped
    .from("credit_logs")
    .select("id, client_id, log_type, channel, tokens_used, created_at")
    .gte("created_at", monthStart.toISOString())
    .lte("created_at", monthEnd.toISOString()) as unknown as {
    eq: (field: string, value: string) => typeof dataBuilder;
    range: (from: number, to: number) => Promise<{ data: CreditLog[] | null; error: { message: string } | null }>;
  };

  if (clientId !== "all") {
    countBuilder = countBuilder.eq("client_id", clientId);
    dataBuilder = dataBuilder.eq("client_id", clientId);
  }
  if (channel !== "all") {
    countBuilder = countBuilder.eq("channel", channel);
    dataBuilder = dataBuilder.eq("channel", channel);
  }
  if (logType !== "all") {
    countBuilder = countBuilder.eq("log_type", logType);
    dataBuilder = dataBuilder.eq("log_type", logType);
  }

  const [{ count }, rowsRes] = await Promise.all([
    countBuilder as unknown as Promise<{ count: number | null }>,
    dataBuilder.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1),
  ]);

  let summaryBuilder = untyped
    .from("credit_logs")
    .select("channel, tokens_used, created_at")
    .gte("created_at", monthStart.toISOString())
    .lte("created_at", monthEnd.toISOString()) as unknown as {
    eq: (field: string, value: string) => typeof summaryBuilder;
    then: (onfulfilled: (value: { data: Array<{ channel: string | null; tokens_used: number | null; created_at: string }> | null }) => unknown) => unknown;
  };
  if (clientId !== "all") summaryBuilder = summaryBuilder.eq("client_id", clientId);
  if (channel !== "all") summaryBuilder = summaryBuilder.eq("channel", channel);
  if (logType !== "all") summaryBuilder = summaryBuilder.eq("log_type", logType);
  const summaryRes = (await (summaryBuilder as unknown as Promise<{
    data: Array<{ channel: string | null; tokens_used: number | null; created_at: string }> | null;
  }>)) ?? { data: [] };
  const summaryRows = summaryRes.data ?? [];

  const rows = (rowsRes.data ?? []) as CreditLog[];
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const totalTokens = summaryRows.reduce((acc, row) => acc + Number(row.tokens_used ?? 0), 0);
  const channelCounts = new Map<string, number>();
  for (const row of summaryRows) {
    const ch = row.channel ?? "unknown";
    channelCounts.set(ch, (channelCounts.get(ch) ?? 0) + 1);
  }
  const topChannels = Array.from(channelCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const daily = new Map<string, number>();
  for (const row of summaryRows) {
    const day = format(new Date(row.created_at), "d");
    daily.set(day, (daily.get(day) ?? 0) + 1);
  }
  const dayList = Array.from({ length: monthEnd.getDate() }).map((_, i) => String(i + 1));
  const maxDaily = Math.max(1, ...dayList.map((d) => daily.get(d) ?? 0));

  function hrefFor(nextPage: number) {
    const query = new URLSearchParams();
    query.set("month", selected);
    if (clientId !== "all") query.set("clientId", clientId);
    if (channel !== "all") query.set("channel", channel);
    if (logType !== "all") query.set("logType", logType);
    query.set("page", String(nextPage));
    return `/admin/credits/logs?${query.toString()}`;
  }

  const exportQuery = new URLSearchParams();
  exportQuery.set("month", selected);
  if (clientId !== "all") exportQuery.set("clientId", clientId);
  if (channel !== "all") exportQuery.set("channel", channel);
  if (logType !== "all") exportQuery.set("logType", logType);

  const toastMessage =
    notice === "applied"
      ? "Filters applied."
      : notice === "cleared"
        ? "Filters cleared."
        : "";

  return (
    <div className="p-8 pt-0 space-y-6">
      {toastMessage ? <AdminActionToast message={toastMessage} kind="success" /> : null}

      <div className="sticky top-0 z-20 bg-[#FAFAF8] pt-2 pb-3 -mt-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-[#0A0A0A] text-[22px] font-medium">Detailed Credit Logs</h1>
          <div className="inline-flex items-center gap-2">
            <a
              href={`/api/admin/credits/logs/export?${exportQuery.toString()}`}
              className="h-9 px-3 inline-flex items-center rounded-lg border border-[#e5e5e5] text-[13px] text-[#333] hover:bg-[#fafaf8] transition-colors duration-150"
            >
              Export CSV
            </a>
            <CreditsMonthSelect value={selected} options={monthOptions} />
          </div>
        </div>
      </div>

      <form className="border border-[#E8E8E8] rounded-xl bg-white p-4 grid grid-cols-1 md:grid-cols-5 gap-3" method="GET">
        <input type="hidden" name="month" value={selected} />
        <input type="hidden" name="notice" value="applied" />
        <select name="clientId" defaultValue={clientId} className="h-9 rounded-lg border border-[#e5e5e5] px-3 text-[13px]">
          <option value="all">All clients</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.business_name}</option>
          ))}
        </select>
        <select name="channel" defaultValue={channel} className="h-9 rounded-lg border border-[#e5e5e5] px-3 text-[13px]">
          <option value="all">All channels</option>
          <option value="whatsapp">WhatsApp</option>
          <option value="instagram">Instagram</option>
          <option value="facebook">Facebook</option>
          <option value="sms">SMS</option>
          <option value="email">Email</option>
        </select>
        <input name="logType" defaultValue={logType === "all" ? "" : logType} placeholder="Log type (optional)" className="h-9 rounded-lg border border-[#e5e5e5] px-3 text-[13px]" />
        <div className="inline-flex items-center gap-2">
          <button type="submit" className="h-9 px-3 rounded-lg bg-[#0A0A0A] text-white text-[13px] hover:bg-[#202020] transition-colors duration-150">Apply</button>
          <Link
            href={`/admin/credits/logs?month=${selected}&notice=cleared`}
            className="h-9 px-3 inline-flex items-center rounded-lg border border-[#e5e5e5] text-[13px] text-[#333] hover:bg-[#fafaf8] transition-colors duration-150"
          >
            Clear
          </Link>
        </div>
      </form>

      <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="border border-[#E8E8E8] rounded-xl bg-white p-4">
          <div className="text-[11px] uppercase tracking-[0.14em] text-[#777]">Matching logs</div>
          <div className="mt-2 text-[24px] font-light text-[#111]">{total}</div>
        </div>
        <div className="border border-[#E8E8E8] rounded-xl bg-white p-4">
          <div className="text-[11px] uppercase tracking-[0.14em] text-[#777]">Tokens used</div>
          <div className="mt-2 text-[24px] font-light text-[#111]">{totalTokens.toLocaleString()}</div>
        </div>
        <div className="border border-[#E8E8E8] rounded-xl bg-white p-4 md:col-span-2">
          <div className="text-[11px] uppercase tracking-[0.14em] text-[#777] mb-2">Top channels</div>
          <div className="space-y-2">
            {topChannels.length ? (
              topChannels.map(([name, value]) => (
                <div key={name} className="flex items-center gap-2">
                  <div className="text-[12px] text-[#555] min-w-[90px] capitalize">{name}</div>
                  <div className="h-2 rounded-full bg-[#efefef] flex-1 overflow-hidden">
                    <div className="h-full bg-[#3b82f6]" style={{ width: `${(value / topChannels[0][1]) * 100}%` }} />
                  </div>
                  <div className="text-[12px] text-[#333] min-w-[24px] text-right">{value}</div>
                </div>
              ))
            ) : (
              <div className="text-[12px] text-[#777]">No channel data.</div>
            )}
          </div>
        </div>
      </section>

      <section className="border border-[#E8E8E8] rounded-xl bg-white p-4">
        <div className="text-[11px] uppercase tracking-[0.14em] text-[#777] mb-3">Daily log volume</div>
        <div className="flex items-end gap-1 h-24 overflow-x-auto">
          {dayList.map((d) => {
            const value = daily.get(d) ?? 0;
            const h = Math.max(4, Math.round((value / maxDaily) * 100));
            return (
              <div key={d} className="flex flex-col items-center justify-end min-w-[18px]">
                <div className="w-3 rounded-sm bg-[#60a5fa]" style={{ height: `${h}%` }} title={`${d}: ${value}`} />
                <div className="mt-1 text-[10px] text-[#888]">{d}</div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="border border-[#E8E8E8] rounded-xl bg-white overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-[0.14em] text-[#777] border-b border-[#efefef]">
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Channel</th>
                <th className="px-4 py-3">Tokens</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-[#f4f4f4] last:border-b-0 text-[13px]">
                  <td className="px-4 py-3 text-[#666]">{format(new Date(row.created_at), "dd MMM yyyy, hh:mm a")}</td>
                  <td className="px-4 py-3">{row.client_id ? (clientMap.get(row.client_id) ?? row.client_id) : "—"}</td>
                  <td className="px-4 py-3">{row.log_type ?? "—"}</td>
                  <td className="px-4 py-3">{row.channel ?? "—"}</td>
                  <td className="px-4 py-3">{row.tokens_used ?? 0}</td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-[13px] text-[#777]">No logs found.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className="md:hidden p-3 space-y-3">
          {rows.length === 0 ? (
            <div className="px-4 py-10 text-center text-[13px] text-[#777]">No logs found.</div>
          ) : (
            rows.map((row) => (
              <div key={row.id} className="border border-[#efefef] rounded-xl p-3 bg-white">
                <div className="text-[13px] text-[#111] font-medium">
                  {row.client_id ? (clientMap.get(row.client_id) ?? row.client_id) : "—"}
                </div>
                <div className="mt-1 text-[12px] text-[#666]">{format(new Date(row.created_at), "dd MMM yyyy, hh:mm a")}</div>
                <div className="mt-2 text-[12px] text-[#555]">
                  Type: {row.log_type ?? "—"} · Channel: {row.channel ?? "—"}
                </div>
                <div className="mt-1 text-[12px] text-[#333]">Tokens: {row.tokens_used ?? 0}</div>
              </div>
            ))
          )}
        </div>
        <div className="px-4 py-3 flex items-center justify-between border-t border-[#efefef]">
          <div className="text-[12px] text-[#666]">Page {page} of {totalPages}</div>
          <div className="inline-flex items-center gap-2">
            <Link
              href={hrefFor(Math.max(1, page - 1))}
              aria-disabled={page <= 1}
              className={`px-3 py-1.5 rounded-lg border text-[12px] ${page <= 1 ? "pointer-events-none opacity-40 border-[#eee]" : "border-[#e5e5e5]"}`}
            >
              Prev
            </Link>
            <Link
              href={hrefFor(Math.min(totalPages, page + 1))}
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

