import type { ReactNode } from "react";
import { Suspense } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { AdminContextProvider } from "@/components/admin/AdminContext";
import ClientContextBar from "@/components/admin/ClientContextBar";
import MobileAdminNav from "@/components/layout/MobileAdminNav";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();

  let clients: Array<import("@/lib/types").Client> = [];
  let userName = "Harshit";
  let userRole: import("@/lib/types").UserRole = "admin";

  if (supabase) {
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;

    if (session) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, full_name")
        .eq("id", session.user.id)
        .maybeSingle();

      userRole = ((profile as unknown as { role?: import("@/lib/types").UserRole | null } | null | undefined)?.role ??
        "client") as import("@/lib/types").UserRole;
      userName =
        (profile as unknown as { full_name?: string | null } | null | undefined)?.full_name ??
        userName;

      const { data: clientRows } = await supabase
        .from("clients")
        .select("id, name, business_name, industry, agent_type, status, city, plan, whatsapp_phone_id")
        .order("created_at", { ascending: false });

      clients = (clientRows ?? []) as Array<import("@/lib/types").Client>;
    }
  }

  return (
    <Suspense fallback={null}>
      <AdminContextProvider>
        <div className="min-h-screen bg-[#FAFAF8] text-[#0A0A0A]">
          <div className="hidden md:block">
            <AdminSidebar clients={clients} userName={userName} userRole={userRole} />
          </div>

          <MobileAdminNav clients={clients} userName={userName} userRole={userRole} />

          <div className="md:pl-[240px]">
            <div className="hidden md:block">
              <ClientContextBar clients={clients} />
            </div>
            <main className="pt-0 site-fade-up">{children}</main>
          </div>
        </div>
      </AdminContextProvider>
    </Suspense>
  );
}

