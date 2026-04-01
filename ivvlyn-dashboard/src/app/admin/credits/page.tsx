import Link from "next/link";
import { endOfMonth, format, parse } from "date-fns";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import CreditsMonthSelect from "@/components/admin/CreditsMonthSelect";

type Search = {
  month?: string;
};

type CreditLog = {
  id: string;
  client_id: string | null;
  log_type: string | null;
  channel: string | null;
  tokens_used: number | null;
  created_at: string;
};

function monthKey(d: Date) {
  return format(d, "yyyy-MM");
}

function monthLabel(d: Date) {
  return format(d, "MMMM yyyy");
}

function planPriceINR(plan: string | null) {
  if (!plan) return 0;
  const p = plan.toLowerCase();
  if (p.includes("starter")) return 19999;
  if (p.includes("growth")) return 39999;
  if (p.includes("enterprise")) return 79999;
  return 29999;
}

export default async function AdminCreditsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const resolved = await searchParams;
  const now = new Date();
  const selected = resolved.month && /^\d{4}-\d{2}$/.test(resolved.month) ? resolved.month : monthKey(now);
  const selectedDate = parse(`${selected}-01`, "yyyy-MM-dd", new Date());
  const monthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
  const monthEnd = endOfMonth(monthStart);

  const monthOptions = Array.from({ length: 6 }).map((_, idx) => {
    const d = new Date(now.getFullYear(), now.getMonth() - idx, 1);
    return monthKey(d);
  });

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return <div className="p-8 pt-0 text-[#555]">Configure Supabase env vars to load credit usage.</div>;
  }

  const { data: clientsRows } = await supabase
    .from("clients")
    .select("id, business_name, status, plan")
    .order("business_name", { ascending: true });

  const clients = (clientsRows ?? []) as Array<{
    id: string;
    business_name: string;
    status: string | null;
    plan: string | null;
  }>;

  const untyped = supabase as unknown as {
    from: (table: string) => {
      select: (fields: string) => {
        gte: (field: string, value: string) => {
          lte: (field: string, value: string) => Promise<{ data: CreditLog[] | null; error: { message: string } | null }>;
        };
      };
    };
  };

  const { data: logsData, error: logsError } = await untyped
    .from("credit_logs")
    .select("id, client_id, log_type, channel, tokens_used, created_at")
    .gte("created_at", monthStart.toISOString())
    .lte("created_at", monthEnd.toISOString());

  const logs = (logsData ?? []) as CreditLog[];

  const grouped = new Map<
    string,
    {
      claudeCalls: number;
      tokens: number;
      wa: number;
      sms: number;
      email: number;
      totalMessages: number;
      entries: CreditLog[];
    }
  >();

  for (const c of clients) {
    grouped.set(c.id, { claudeCalls: 0, tokens: 0, wa: 0, sms: 0, email: 0, totalMessages: 0, entries: [] });
  }

  for (const log of logs) {
    if (!log.client_id || !grouped.has(log.client_id)) continue;
    const g = grouped.get(log.client_id)!;
    g.entries.push(log);
    if ((log.log_type ?? "").toLowerCase().includes("claude")) {
      g.claudeCalls += 1;
      g.tokens += Number(log.tokens_used ?? 0);
    }
    if (log.channel === "whatsapp") g.wa += 1;
    if (log.channel === "sms") g.sms += 1;
    if (log.channel === "email") g.email += 1;
    if (log.channel === "whatsapp" || log.channel === "sms" || log.channel === "email") g.totalMessages += 1;
  }

  const clientStats = clients.map((client) => {
    const g = grouped.get(client.id)!;
    const claudeCost = g.tokens * 0.0008;
    const waCost = g.wa * 0.5;
    const smsCost = g.sms * 0.2;
    const totalCost = claudeCost + waCost + smsCost;
    const planPrice = planPriceINR(client.plan);
    const margin = planPrice - totalCost;
    const messageUtil = Math.min(100, g.totalMessages === 0 ? 0 : Math.round((g.totalMessages / 1000) * 100));
    const claudeUtil = Math.min(100, g.claudeCalls === 0 ? 0 : Math.round((g.claudeCalls / 1000) * 100));
    return { client, g, claudeCost, waCost, smsCost, totalCost, planPrice, margin, messageUtil, claudeUtil };
  });

  const totals = clientStats.reduce(
    (acc, item) => {
      acc.revenue += item.planPrice;
      acc.costs += item.totalCost;
      acc.margin += item.margin;
      return acc;
    },
    { revenue: 0, costs: 0, margin: 0 }
  );

  return (
    <div className="p-8 pt-0 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 sticky top-0 z-20 bg-[#FAFAF8] py-2">
        <h1 className="text-[#0A0A0A] text-[22px] font-medium">Credit Usage — {monthLabel(monthStart)}</h1>
        <CreditsMonthSelect value={selected} options={monthOptions} />
      </div>

      {logsError ? (
        <div className="rounded-xl border border-[#fed7aa] bg-[#fff7ed] p-4 text-[13px] text-[#9a3412]">
          `credit_logs` is not available yet: {logsError.message}
        </div>
      ) : null}

      <div className="space-y-4">
        {clientStats.map(({ client, g, claudeCost, waCost, smsCost, totalCost, planPrice, margin, messageUtil, claudeUtil }) => {
          return (
            <section key={client.id} className="border border-[#E8E8E8] rounded-xl bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-[16px] text-[#111] font-medium">{client.business_name}</div>
                  <div className="text-[12px] text-[#666] mt-1">Status: {client.status ?? "active"}</div>
                </div>
                <div className={`text-[13px] font-medium ${margin >= 0 ? "text-[#15803d]" : "text-[#b91c1c]"}`}>
                  Estimated margin: ₹{margin.toFixed(2)}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-[13px]">
                <div className="space-y-1">
                  <div>Claude API calls: {g.claudeCalls} / unlimited</div>
                  <div>WhatsApp messages: {g.wa} sent</div>
                  <div>SMS sent: {g.sms}</div>
                  <div>Emails sent: {g.email}</div>
                </div>
                <div className="space-y-1">
                  <div>Claude cost: ₹{claudeCost.toFixed(2)}</div>
                  <div>WA cost: ₹{waCost.toFixed(2)}</div>
                  <div>SMS cost: ₹{smsCost.toFixed(2)}</div>
                  <div className="font-medium text-[#111]">Total cost: ₹{totalCost.toFixed(2)}</div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.14em] text-[#777] mb-2">Claude calls bar</div>
                  <div className="h-2 rounded-full bg-[#efefef] overflow-hidden">
                    <div className="h-full bg-[#6366f1]" style={{ width: `${claudeUtil}%` }} />
                  </div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-[0.14em] text-[#777] mb-2">Messages bar</div>
                  <div className="h-2 rounded-full bg-[#efefef] overflow-hidden">
                    <div className="h-full bg-[#16a34a]" style={{ width: `${messageUtil}%` }} />
                  </div>
                </div>
              </div>

              <div className="mt-4 text-[13px]">
                Plan price: ₹{planPrice.toFixed(2)}/month
              </div>

              <div className="mt-4">
                <Link
                  href={`/admin/credits/logs?month=${selected}&clientId=${encodeURIComponent(client.id)}`}
                  className="text-[13px] text-[#0A0A0A] hover:underline"
                >
                  View Detailed Logs
                </Link>
              </div>
            </section>
          );
        })}
      </div>

      <section className="border border-[#E8E8E8] rounded-xl bg-white p-5 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.14em] text-[#777]">Total revenue</div>
          <div className="text-[18px] text-[#111] mt-1">₹{totals.revenue.toFixed(2)}</div>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-[0.14em] text-[#777]">Total estimated costs</div>
          <div className="text-[18px] text-[#111] mt-1">₹{totals.costs.toFixed(2)}</div>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-[0.14em] text-[#777]">Total estimated margin</div>
          <div className={`text-[18px] mt-1 ${totals.margin >= 0 ? "text-[#15803d]" : "text-[#b91c1c]"}`}>₹{totals.margin.toFixed(2)}</div>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-[0.14em] text-[#777]">Margin %</div>
          <div className="text-[18px] text-[#111] mt-1">
            {totals.revenue > 0 ? ((totals.margin / totals.revenue) * 100).toFixed(2) : "0.00"}%
          </div>
        </div>
      </section>
    </div>
  );
}

