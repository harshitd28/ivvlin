import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Channel } from "@/lib/types";
import type { ThreadMessage } from "@/components/dashboard/ConversationThread";
import type { TeamMember } from "@/components/dashboard/conversations/InboxTeamPanel";
import ConversationsClient, { parseInboxFilter } from "@/components/dashboard/conversations/ConversationsClient";
import DashboardRealtime from "@/components/dashboard/realtime/DashboardRealtime";
import { leads as demoLeads } from "@/lib/mock-data";
import { rowToThreadMessage, type ConversationRowInput } from "@/lib/conversations/thread-map";
import { fetchMessagingInsights, type MessagingInsights } from "@/lib/inbox/messaging-insights";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export default async function ConversationsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return (
      <div className="p-8 text-white">
        <div className="text-[20px] font-medium">Conversations</div>
        <div className="text-[13px] mt-2 text-[#999]">Configure Supabase env vars to load real data.</div>
      </div>
    );
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData.session;
  if (!session) {
    return (
      <div className="p-8 text-white">
        <div className="text-[20px] font-medium">Conversations</div>
        <div className="text-[13px] mt-2 text-[#999]">Please sign in again.</div>
      </div>
    );
  }

  const resolved = searchParams ? await searchParams : undefined;
  const leadIdParam = resolved?.leadId;
  const activeLeadId = typeof leadIdParam === "string" ? leadIdParam : null;
  const filterRaw = resolved?.filter;
  const filterStr = typeof filterRaw === "string" ? filterRaw : "all";
  const inboxFilter = parseInboxFilter(filterStr);

  const { data: profile } = await supabase
    .from("profiles")
    .select("client_id")
    .eq("id", session.user.id)
    .maybeSingle();

  const typedProfile = profile as unknown as { client_id?: string | null } | null;
  const clientId = typedProfile?.client_id ?? null;

  const emptyTeam: TeamMember[] = [];

  if (!clientId) {
    const demoItems = demoLeads.map((l) => ({
      lead_id: l.id,
      lead_name: l.name,
      phone: l.phone ?? null,
      email: l.email ?? null,
      channel: "whatsapp" as const,
      preview: l.lastMessage,
      created_at: new Date().toISOString(),
      score: l.score,
      mode: "ai" as const,
      assigned_to_user_id: null as string | null,
      inbox_starred: false,
      first_response_due_at: null as string | null,
      inbox_locked_until: null as string | null,
      inbox_locked_by: null as string | null,
      last_customer_message_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      last_agent_response_at: null as string | null,
      latest_conversation_status: null as string | null,
    }));
    const resolvedDemoLeadId = activeLeadId ?? demoItems[0]?.lead_id ?? null;
    const demoThread: ThreadMessage[] = resolvedDemoLeadId
      ? [
          {
            id: `demo-in-${resolvedDemoLeadId}`,
            created_at: "2026-04-30T09:00:00.000Z",
            direction: "inbound",
            message: "Hi, can I get details and price?",
            is_automated: false,
            channel: "whatsapp",
            status: "read",
          },
          {
            id: `demo-out-${resolvedDemoLeadId}`,
            created_at: "2026-04-30T09:01:00.000Z",
            direction: "outbound",
            message: "Absolutely. Sharing brochure and availability now.",
            is_automated: true,
            channel: "whatsapp",
            status: "delivered",
          },
        ]
      : [];
    return (
      <ConversationsClient
        clientId="demo-client"
        items={demoItems}
        activeLeadId={resolvedDemoLeadId}
        threadMessages={demoThread}
        team={emptyTeam}
        currentUserId={null}
        inboxFilter={inboxFilter}
      />
    );
  }

  const { data: teamRows } = await supabase
    .from("profiles")
    .select("id, full_name, email, inbox_last_seen_at")
    .eq("client_id", clientId)
    .order("full_name", { ascending: true });

  const team = (teamRows ?? []) as TeamMember[];

  // Fetch "latest message per lead" list
  const { data: convRows } = await supabase
    .from("conversations")
    .select("lead_id, content, message, timestamp, created_at, direction, channel, metadata, conversation_status")
    .eq("client_id", clientId)
    .order("timestamp", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(200);

  const convTyped = (convRows ?? []) as unknown as Array<{
    lead_id: string | null;
    content?: string | null;
    message?: string | null;
    timestamp?: string | null;
    created_at: string;
    channel: Channel;
    direction: "inbound" | "outbound";
    metadata?: Record<string, unknown> | null;
    conversation_status?: string | null;
  }>;

  const latestByLead = new Map<
    string,
    {
      preview: string | null;
      created_at: string;
      channel: Channel;
      mode: "ai" | "human";
      conversation_status: string | null;
    }
  >();

  const leadIds: string[] = [];
  for (const c of convTyped) {
    if (!c.lead_id) continue;
    if (latestByLead.has(c.lead_id)) continue;
    latestByLead.set(c.lead_id, {
      preview: (c.content ?? c.message) ?? null,
      created_at: c.timestamp ?? c.created_at,
      channel: c.channel,
      mode: "ai",
      conversation_status: c.conversation_status ?? null,
    });
    leadIds.push(c.lead_id);
  }

  const leadSelect =
    "lead_id, name, phone, email, score, mode, channel, assigned_to_user_id, inbox_status, first_response_due_at, sla_breached_at, last_customer_message_at, last_agent_response_at";

  const { data: leadRows } = leadIds.length
    ? await supabase.from("leads").select(leadSelect).eq("client_id", clientId).in("lead_id", leadIds)
    : { data: [] as unknown[] };

  const leadsTyped = (leadRows ?? []) as unknown as Array<{
    lead_id: string;
    name: string | null;
    phone: string | null;
    email: string | null;
    score: number | null;
    mode: "ai" | "human";
    channel: Channel;
    assigned_to_user_id: string | null;
    inbox_status: string | null;
    first_response_due_at: string | null;
    sla_breached_at: string | null;
    last_customer_message_at: string | null;
    last_agent_response_at: string | null;
  }>;

  const leadMetaById = new Map<
    string,
    {
      lead_name: string | null;
      phone: string | null;
      email: string | null;
      score: number | null;
      mode: "ai" | "human";
      channel: Channel;
      assigned_to_user_id: string | null;
      inbox_starred: boolean;
      first_response_due_at: string | null;
      inbox_locked_until: string | null;
      inbox_locked_by: string | null;
      last_customer_message_at: string | null;
      last_agent_response_at: string | null;
    }
  >();
  for (const l of leadsTyped) {
    leadMetaById.set(l.lead_id, {
      lead_name: l.name,
      phone: l.phone,
      email: l.email,
      score: l.score,
      mode: l.mode,
      channel: l.channel,
      assigned_to_user_id: l.assigned_to_user_id ?? null,
      inbox_starred: l.inbox_status === "pinned",
      first_response_due_at: l.first_response_due_at ?? null,
      inbox_locked_until: null,
      inbox_locked_by: null,
      last_customer_message_at: l.last_customer_message_at ?? null,
      last_agent_response_at: l.last_agent_response_at ?? null,
    });
  }

  const items = Array.from(latestByLead.entries())
    .map(([leadId, latest]) => {
      const meta = leadMetaById.get(leadId);
      return {
        lead_id: leadId,
        lead_name: meta?.lead_name ?? null,
        phone: meta?.phone ?? null,
        email: meta?.email ?? null,
        channel: meta?.channel ?? latest.channel,
        preview: latest.preview,
        created_at: latest.created_at,
        score: meta?.score ?? null,
        mode: meta?.mode ?? "ai",
        assigned_to_user_id: meta?.assigned_to_user_id ?? null,
        inbox_starred: meta?.inbox_starred ?? false,
        first_response_due_at: meta?.first_response_due_at ?? null,
        inbox_locked_until: meta?.inbox_locked_until ?? null,
        inbox_locked_by: meta?.inbox_locked_by ?? null,
        last_customer_message_at: meta?.last_customer_message_at ?? null,
        last_agent_response_at: meta?.last_agent_response_at ?? null,
        latest_conversation_status: latest.conversation_status ?? null,
      };
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  let hydratedItems = items;
  if (hydratedItems.length === 0) {
    const { data: recentLeadRows } = await supabase
      .from("leads")
      .select(`${leadSelect}, created_at`)
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })
      .limit(30);

    const recentLeads = (recentLeadRows ?? []) as Array<{
      lead_id: string;
      name: string | null;
      phone: string | null;
      email: string | null;
      score: number | null;
      mode: "ai" | "human";
      channel: Channel;
      created_at: string;
      assigned_to_user_id: string | null;
      inbox_status: string | null;
      first_response_due_at: string | null;
      sla_breached_at: string | null;
      last_customer_message_at: string | null;
      last_agent_response_at: string | null;
    }>;

    hydratedItems = recentLeads.map((l) => ({
      lead_id: l.lead_id,
      lead_name: l.name,
      phone: l.phone,
      email: l.email,
      channel: l.channel,
      preview: null,
      created_at: l.created_at,
      score: l.score,
      mode: l.mode,
      assigned_to_user_id: l.assigned_to_user_id ?? null,
      inbox_starred: l.inbox_status === "pinned",
      first_response_due_at: l.first_response_due_at ?? null,
      inbox_locked_until: null,
      inbox_locked_by: null,
      last_customer_message_at: l.last_customer_message_at ?? null,
      last_agent_response_at: l.last_agent_response_at ?? null,
      latest_conversation_status: null,
    }));
  }

  const resolvedActiveLeadId = activeLeadId ?? (hydratedItems[0]?.lead_id ?? null);

  let threadMessages: ThreadMessage[] = [];
  if (resolvedActiveLeadId) {
    const { data: threadRows } = await supabase
      .from("conversations")
      .select(
        "id, content, message, timestamp, created_at, direction, channel, metadata, conversation_status, sender, status, lifecycle_state"
      )
      .eq("client_id", clientId)
      .eq("lead_id", resolvedActiveLeadId)
      .order("timestamp", { ascending: true })
      .order("created_at", { ascending: true })
      .limit(120);

    threadMessages = (threadRows ?? []).map((r) =>
      rowToThreadMessage(r as ConversationRowInput)
    ) as ThreadMessage[];
  }

  let messagingInsights: MessagingInsights | null = null;
  const svc = createServiceRoleClient();
  if (svc && clientId) {
    try {
      messagingInsights = await fetchMessagingInsights(svc, clientId);
    } catch {
      messagingInsights = null;
    }
  }

  return (
    <>
      <DashboardRealtime clientId={clientId} />
      <ConversationsClient
        clientId={clientId}
        items={hydratedItems}
        activeLeadId={resolvedActiveLeadId}
        threadMessages={threadMessages}
        team={team}
        currentUserId={session.user.id}
        inboxFilter={inboxFilter}
        messagingInsights={messagingInsights}
      />
    </>
  );
}
