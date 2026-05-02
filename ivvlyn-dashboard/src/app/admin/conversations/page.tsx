import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Search = { clientId?: string };

export default async function AdminConversationsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const resolved = await searchParams;
  const filterClientId = typeof resolved.clientId === "string" && resolved.clientId ? resolved.clientId : null;

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return <div className="p-8 pt-0 text-[#555]">Configure Supabase to load conversations.</div>;
  }

  const { data: clientRows } = await supabase
    .from("clients")
    .select("id, business_name, name")
    .order("created_at", { ascending: false });

  let cq = supabase
    .from("conversations")
    .select("id, lead_id, channel, direction, content, timestamp, client_id, conversation_status")
    .order("timestamp", { ascending: false })
    .limit(150);

  if (filterClientId) cq = cq.eq("client_id", filterClientId);

  const { data: convRows, error } = await cq;

  const clientMap = new Map((clientRows ?? []).map((c) => [c.id as string, c]));

  const rows = (convRows ?? []) as Array<{
    id: string;
    lead_id: string;
    channel: string | null;
    direction: string | null;
    content: string | null;
    timestamp: string;
    client_id: string | null;
    conversation_status: string | null;
  }>;

  return (
    <div className="p-8 pt-0 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[#0A0A0A] text-[22px] font-medium">Conversations (message log)</h1>
          <p className="text-[#555] text-[13px] mt-1">
            Recent rows from <code className="rounded bg-[#F4F4F2] px-1">conversations</code> across tenants. Filter by client for
            support.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center text-[13px]">
          <Link
            href="/admin/conversations"
            className={`rounded-lg px-2 py-1 ${!filterClientId ? "bg-[#F4F4F2] font-medium" : "text-[#555]"}`}
          >
            All
          </Link>
          {(clientRows ?? []).slice(0, 24).map((c) => (
            <Link
              key={c.id as string}
              href={`/admin/conversations?clientId=${encodeURIComponent(c.id as string)}`}
              className={`rounded-lg px-2 py-1 truncate max-w-[140px] ${
                filterClientId === c.id ? "bg-[#F4F4F2] font-medium" : "text-[#555] hover:text-[#0A0A0A]"
              }`}
            >
              {(c.business_name as string) || (c.name as string)}
            </Link>
          ))}
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-900">{error.message}</div>
      ) : null}

      <div className="rounded-xl border border-[#E8E8E8] bg-white overflow-hidden">
        <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="sticky top-0 bg-[#FAFAF8] text-[11px] font-semibold uppercase tracking-wide text-[#666]">
              <tr>
                <th className="px-4 py-2">Time</th>
                <th className="px-4 py-2">Client</th>
                <th className="px-4 py-2">Lead id</th>
                <th className="px-4 py-2">Dir</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2 min-w-[240px]">Preview</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ECECEA]">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[#888]">
                    No rows.
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const cl = r.client_id ? clientMap.get(r.client_id) : null;
                  const cn = cl
                    ? ((cl as { business_name?: string; name?: string }).business_name ||
                        (cl as { name?: string }).name)
                    : r.client_id ?? "—";
                  const preview = (r.content ?? "").replace(/\s+/g, " ").slice(0, 120);
                  return (
                    <tr key={r.id} className="align-top">
                      <td className="px-4 py-2 whitespace-nowrap text-[#555] text-[12px]">
                        {new Date(r.timestamp).toLocaleString()}
                      </td>
                      <td className="px-4 py-2 max-w-[140px] truncate text-[12px]" title={cn}>
                        {cn}
                      </td>
                      <td className="px-4 py-2 font-mono text-[11px]">{r.lead_id}</td>
                      <td className="px-4 py-2 text-[12px]">{r.direction ?? "—"}</td>
                      <td className="px-4 py-2 text-[12px]">{r.conversation_status ?? "—"}</td>
                      <td className="px-4 py-2 text-[12px] text-[#444]">{preview || "—"}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
