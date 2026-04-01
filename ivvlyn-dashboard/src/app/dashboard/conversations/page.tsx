import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Channel, Lead, Visit } from "@/lib/types";
import type { ThreadMessage } from "@/components/dashboard/ConversationThread";
import ConversationsClient from "@/components/dashboard/conversations/ConversationsClient";
import DashboardRealtime from "@/components/dashboard/realtime/DashboardRealtime";

export default async function ConversationsPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return (
      <div className="p-8">
        <div className="text-[#0A0A0A] text-[20px] font-medium">Conversations</div>
        <div className="text-[#555] text-[13px] mt-2">Configure Supabase env vars to load real data.</div>
      </div>
    );
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData.session;
  if (!session) {
    return (
      <div className="p-8">
        <div className="text-[#0A0A0A] text-[20px] font-medium">Conversations</div>
        <div className="text-[#555] text-[13px] mt-2">Please sign in again.</div>
      </div>
    );
  }

  const resolved = searchParams ? await searchParams : undefined;
  const leadIdParam = resolved?.leadId;
  const activeLeadId = typeof leadIdParam === "string" ? leadIdParam : null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("client_id")
    .eq("id", session.user.id)
    .maybeSingle();

  const typedProfile = profile as unknown as { client_id?: string | null } | null;
  const clientId = typedProfile?.client_id ?? null;

  if (!clientId) {
    return (
      <div className="p-8">
        <div className="text-[#0A0A0A] text-[20px] font-medium">Conversations</div>
        <div className="text-[#555] text-[13px] mt-2">No client linked to this account.</div>
      </div>
    );
  }

  // Fetch "latest message per lead" list
  const { data: convRows } = await supabase
    .from("conversations")
    .select("lead_id, lead_id, message, created_at, direction, channel, is_automated")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(200);

  const convTyped = (convRows ?? []) as unknown as Array<{
    lead_id: string | null;
    message: string;
    created_at: string;
    channel: Channel;
    is_automated: boolean;
    direction: "inbound" | "outbound";
  }>;

  const latestByLead = new Map<
    string,
    { preview: string | null; created_at: string; channel: Channel; mode: "ai" | "human" }
  >();

  const leadIds: string[] = [];
  for (const c of convTyped) {
    if (!c.lead_id) continue;
    if (latestByLead.has(c.lead_id)) continue;
    latestByLead.set(c.lead_id, {
      preview: c.message ?? null,
      created_at: c.created_at,
      channel: c.channel,
      mode: "ai",
    });
    leadIds.push(c.lead_id);
  }

  // Fetch lead metadata for list rendering (name, score, mode, etc.)
  const { data: leadRows } = leadIds.length
    ? await supabase
        .from("leads")
        .select("lead_id, name, score, mode, channel")
        .eq("client_id", clientId)
        .in("lead_id", leadIds)
    : { data: [] as unknown[] };

  const leadsTyped = (leadRows ?? []) as unknown as Array<{
    lead_id: string;
    name: string | null;
    score: number | null;
    mode: "ai" | "human";
    channel: Channel;
  }>;

  const leadMetaById = new Map<string, { lead_name: string | null; score: number | null; mode: "ai" | "human"; channel: Channel }>();
  for (const l of leadsTyped) {
    leadMetaById.set(l.lead_id, {
      lead_name: l.name,
      score: l.score,
      mode: l.mode,
      channel: l.channel,
    });
  }

  const items = Array.from(latestByLead.entries())
    .map(([leadId, latest]) => {
      const meta = leadMetaById.get(leadId);
      return {
        lead_id: leadId,
        lead_name: meta?.lead_name ?? null,
        channel: meta?.channel ?? latest.channel,
        preview: latest.preview,
        created_at: latest.created_at,
        score: meta?.score ?? null,
        mode: meta?.mode ?? "ai",
      };
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const resolvedActiveLeadId = activeLeadId ?? (items[0]?.lead_id ?? null);

  // Full thread for active lead
  let threadMessages: ThreadMessage[] = [];
  if (resolvedActiveLeadId) {
    const { data: threadRows } = await supabase
      .from("conversations")
      .select("id, created_at, direction, message, is_automated, channel")
      .eq("client_id", clientId)
      .eq("lead_id", resolvedActiveLeadId)
      .order("created_at", { ascending: true })
      .limit(120);

    const threadTyped = (threadRows ?? []) as unknown as Array<ThreadMessage>;
    threadMessages = threadTyped;
  }

  return (
    <>
      <DashboardRealtime clientId={clientId} />
      <ConversationsClient items={items} activeLeadId={resolvedActiveLeadId} threadMessages={threadMessages} />
    </>
  );
}

