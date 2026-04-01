import type { ReactNode } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import ClientSidebar from "@/components/dashboard/ClientSidebar";
import MobileClientNav from "@/components/layout/MobileClientNav";
import type { Client as ClientType, UserRole } from "@/lib/types";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await createSupabaseServerClient();

  let userName = "Client";
  let userEmail = "client@example.com";
  let userRole: UserRole = "client";
  let businessName = "Your business";
  let agentLabel = "Vaani";
  let agentType: ClientType["agent_type"] = "vaani";

  if (supabase) {
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;

    if (session) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, full_name, email, client_id")
        .eq("id", session.user.id)
        .maybeSingle();

      userRole = ((profile as unknown as { role?: UserRole | null } | null | undefined)?.role ?? "client") as UserRole;
      userName = ((profile as unknown as { full_name?: string | null } | null | undefined)?.full_name ?? userName) as string;
      userEmail = ((profile as unknown as { email?: string | null } | null | undefined)?.email ?? userEmail) as string;

      const clientId = (profile as unknown as { client_id?: string | null } | null | undefined)?.client_id;

      if (typeof clientId === "string" && clientId.length) {
        const { data: clientRow } = await supabase
          .from("clients")
          .select("business_name, agent_type, industry")
          .eq("id", clientId)
          .maybeSingle();

        if (clientRow) {
          const typed = clientRow as unknown as {
            business_name?: string | null;
            agent_type?: ClientType["agent_type"] | null;
            industry?: string | null;
          };

          businessName = typed.business_name ?? businessName;
          agentType = typed.agent_type ?? agentType;
          agentLabel = agentRowLabel(agentType, typed.industry ?? "");
        }
      }
    }
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#0A0A0A]">
      <div className="hidden md:block">
        <ClientSidebar
          businessName={businessName}
          agentLabel={agentLabel}
          agentType={agentType}
          userName={userName}
          userEmail={userEmail}
          userRole={userRole}
        />
      </div>

      <MobileClientNav
        businessName={businessName}
        agentLabel={agentLabel}
        agentType={agentType}
        userName={userName}
        userEmail={userEmail}
        userRole={userRole}
      />

      <div className="md:pl-[240px]">
        <main className="p-4 md:p-8 site-fade-up">{children}</main>
      </div>
    </div>
  );
}

function agentRowLabel(agentType: ClientType["agent_type"], industry: string) {
  const agent =
    agentType === "vaani"
      ? "Vaani"
      : agentType === "nova"
        ? "Nova"
        : agentType === "kira"
          ? "Kira"
          : agentType === "zane"
            ? "Zane"
            : "Custom";
  return `${agent} · ${industry || "Industry"}`;
}

