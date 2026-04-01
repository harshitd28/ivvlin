import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AdminClientsPage() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return <div className="p-8 pt-0 text-[#555]">Configure Supabase env vars to load clients.</div>;
  }

  const { data: clientsRows } = await supabase
    .from("clients")
    .select("id, business_name, email, status, created_at")
    .order("created_at", { ascending: false });

  const clients = (clientsRows ?? []) as Array<{
    id: string;
    business_name: string;
    email: string;
    status: string | null;
  }>;

  return (
    <div className="p-8 pt-0 space-y-5">
      <div className="flex items-center justify-between sticky top-0 z-20 bg-[#FAFAF8] py-2">
        <h1 className="text-[#0A0A0A] text-[22px] font-medium">Clients</h1>
        <Link href="/admin/clients/new" className="h-9 px-3 inline-flex items-center rounded-lg text-[13px] bg-[#0A0A0A] text-white hover:bg-[#202020] transition-colors duration-150">
          Add Client
        </Link>
      </div>
      <div className="border border-[#E8E8E8] rounded-xl bg-white overflow-hidden">
        {clients.length === 0 ? (
          <div className="p-5 text-[13px] text-[#777] text-center">No clients found.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-[0.14em] text-[#777] border-b border-[#efefef]">
                <th className="px-4 py-3">Business</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Open</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr key={client.id} className="border-b border-[#f4f4f4] last:border-b-0 text-[13px]">
                  <td className="px-4 py-3">{client.business_name}</td>
                  <td className="px-4 py-3 text-[#555]">{client.email}</td>
                  <td className="px-4 py-3 text-[#555]">{client.status ?? "active"}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/admin?clientId=${encodeURIComponent(client.id)}`} className="text-[#0A0A0A] hover:underline">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

