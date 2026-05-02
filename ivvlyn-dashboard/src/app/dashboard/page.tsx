import VaaniHeroCard from "@/components/dashboard/VaaniHeroCard";
import StatCard from "@/components/dashboard/StatCard";
import LeadPipeline from "@/components/dashboard/LeadPipeline";
import LiveInbox from "@/components/dashboard/LiveInbox";
import SiteVisitsTable from "@/components/dashboard/SiteVisitsTable";
import LeadSources from "@/components/dashboard/LeadSources";
import AIActivity from "@/components/dashboard/AIActivity";
import CRMSync from "@/components/dashboard/CRMSync";
import ActivityTimeline from "@/components/dashboard/ActivityTimeline";
import {
  activities,
  aiActivity,
  briefingItems,
  crmSync,
  dashboardStats,
  leadSources,
  leads,
  pipeline,
  siteVisits,
} from "@/lib/mock-data";
import type { DashboardStat } from "@/lib/mock-data";
import type { OutboundJobQueueCounts } from "@/lib/inbox/messaging-queue-counts";
import { fetchOutboundJobCounts } from "@/lib/inbox/messaging-queue-counts";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { Button } from "@/components/ui/button";

function statsFromQueueCounts(q: OutboundJobQueueCounts): DashboardStat[] {
  const attention = q.failed > 0 || q.dead > 0 || q.pending > 15 || q.processing > 5;
  return [
    {
      label: "Outbound · Pending",
      value: q.pending,
      trend: attention ? "Review queue if counts stay high" : "Jobs waiting to send",
      trendUp: !attention,
    },
    {
      label: "Outbound · Processing",
      value: q.processing,
      trend: "Currently sending",
      trendUp: q.processing <= 5,
    },
    {
      label: "Outbound · Failed",
      value: q.failed,
      trend: q.failed > 0 ? "Retry or inspect failures" : "No failed jobs",
      trendUp: q.failed === 0,
      valueColor: q.failed > 0 ? "#F59E0B" : undefined,
    },
    {
      label: "Outbound · Dead",
      value: q.dead,
      trend: q.dead > 0 ? "Exceeded retries — manual fix" : "None stuck",
      trendUp: q.dead === 0,
      valueColor: q.dead > 0 ? "#EF4444" : undefined,
    },
  ];
}

export default async function ClientHomePage() {
  let queueCounts: OutboundJobQueueCounts | null = null;
  const supabase = await createSupabaseServerClient();
  if (supabase) {
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;
    if (session) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("client_id")
        .eq("id", session.user.id)
        .maybeSingle();
      const clientId = (profile as { client_id?: string | null } | null)?.client_id ?? null;
      const svc = createServiceRoleClient();
      if (svc && clientId) {
        queueCounts = await fetchOutboundJobCounts(svc, clientId);
      }
    }
  }

  const statsForCards = queueCounts ? statsFromQueueCounts(queueCounts) : dashboardStats;

  return (
    <div className="space-y-8">
      <VaaniHeroCard briefingItems={briefingItems} delay={0} />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {statsForCards.map((stat, index) => (
          <StatCard key={stat.label} stat={stat} delay={0.08 * (index + 1)} />
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <LeadPipeline pipeline={pipeline} delay={0.16} />
        <LiveInbox leads={leads} delay={0.24} />
      </div>

      <SiteVisitsTable visits={siteVisits} delay={0.32} />

      <div className="grid gap-6 lg:grid-cols-3">
        <LeadSources sources={leadSources} delay={0.4} />
        <AIActivity activity={aiActivity} delay={0.48} />
        <CRMSync crmSync={crmSync} delay={0.56} />
      </div>

      <ActivityTimeline items={activities} delay={0.64} />

      <div className="flex justify-end">
        <Button className="h-9 rounded-md border border-[#6C5CE7] bg-transparent px-4 text-[12px] text-white hover:bg-[#6C5CE7]">
          View Hot Leads
        </Button>
      </div>
    </div>
  );
}
