import { formatDistanceToNow, format } from "date-fns";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Lead, Visit, Channel } from "@/lib/types";
import ScoreBar from "@/components/dashboard/ScoreBar";
import ChannelBadge from "@/components/dashboard/ChannelBadge";
import LeadStatusPill from "@/components/dashboard/LeadStatusPill";
import ConversationThread, { type ThreadMessage } from "@/components/dashboard/ConversationThread";
import DashboardRealtime from "@/components/dashboard/realtime/DashboardRealtime";

export default async function LeadDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return (
      <div className="p-8 pt-14">
        <h1 className="text-[#0A0A0A] text-[20px] font-medium">Lead detail</h1>
        <p className="text-[#555] text-[13px] mt-2">Configure Supabase env vars to load real data.</p>
      </div>
    );
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData.session;

  if (!session) {
    return (
      <div className="p-8 pt-14">
        <h1 className="text-[#0A0A0A] text-[20px] font-medium">Lead detail</h1>
        <p className="text-[#555] text-[13px] mt-2">Please sign in again.</p>
      </div>
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("client_id")
    .eq("id", session.user.id)
    .maybeSingle();

  const typedProfile = profile as unknown as { client_id?: string | null } | null;
  const clientId = typedProfile?.client_id ?? null;
  if (!clientId) {
    return (
      <div className="p-8 pt-14">
        <h1 className="text-[#0A0A0A] text-[20px] font-medium">Lead detail</h1>
        <p className="text-[#555] text-[13px] mt-2">No client linked to this account.</p>
      </div>
    );
  }

  const leadId = params.id;

  const { data: leadRow } = await supabase
    .from("leads")
    .select(
      "lead_id, name, phone, email, score, status, stage, channel, source, budget, bhk_preference, location_preference, created_at, last_reply_at, last_contact, mode, intent"
    )
    .eq("client_id", clientId)
    .eq("lead_id", leadId)
    .maybeSingle();

  const lead = (leadRow ?? null) as unknown as Lead | null;

  if (!lead) {
    return (
      <div className="p-8 pt-14">
        <h1 className="text-[#0A0A0A] text-[20px] font-medium">Lead detail</h1>
        <p className="text-[#555] text-[13px] mt-2">Lead not found.</p>
      </div>
    );
  }

  const { data: conversationsRows } = await supabase
    .from("conversations")
    .select("id, created_at, direction, message, is_automated, channel")
    .eq("client_id", clientId)
    .eq("lead_id", leadId)
    .order("created_at", { ascending: true })
    .limit(80);

  const conversations = (conversationsRows ?? []) as unknown as Array<{
    id: string;
    created_at: string;
    direction: "inbound" | "outbound";
    message: string;
    is_automated: boolean;
    channel: Channel;
  }>;
  const threadMessages = conversations as unknown as ThreadMessage[];

  const { data: visitRow } = await supabase
    .from("visits")
    .select("id, lead_id, visit_date, visit_time, property, status, reminder_sent")
    .eq("client_id", clientId)
    .eq("lead_id", leadId)
    .order("visit_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  const visit = (visitRow ?? null) as unknown as Visit | null;

  const score = typeof lead.score === "number" ? lead.score : 0;

  return (
    <>
      <DashboardRealtime clientId={clientId} />
      <div className="pt-0 p-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-[#0A0A0A] text-[20px] font-medium">{lead.name ?? "Lead"}</div>
          <div className="text-[#555] text-[13px] mt-1">
            <span className="inline-flex items-center gap-2">
              <ChannelBadge channel={lead.channel} />
            </span>
            <span className="ml-3">Phone: {lead.phone ?? "—"}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <LeadStatusPill status={lead.status} />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="border border-[#E8E8E8] rounded-xl p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-[#0A0A0A] text-[48px] font-light leading-none">{score}</div>
              <div className="text-[#555] text-[11px] uppercase tracking-[0.2em] font-semibold mt-2">Lead Score</div>
            </div>
            <div className="pt-2">
              <ScoreBar score={score} />
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <div className="text-[#555] text-[12px]">
              Stage: <span className="text-[#0A0A0A]">{lead.stage}</span>
            </div>
            {visit ? (
              <div className="text-[#16A34A] text-[12px] font-medium inline-flex items-center gap-2">
                <span>Visit:</span> <span>{visit.visit_date} {visit.visit_time ? `· ${visit.visit_time}` : ""}</span>
              </div>
            ) : null}
          </div>

          <div className="mt-5">
            <div className="text-[#555] text-[11px] uppercase tracking-[0.2em] font-semibold">Interest</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {lead.budget ? (
                <span className="text-[11px] text-[#555] border border-[#E8E8E8] rounded-full px-3 py-1">
                  {lead.budget}
                </span>
              ) : null}
              {lead.bhk_preference ? (
                <span className="text-[11px] text-[#555] border border-[#E8E8E8] rounded-full px-3 py-1">
                  {lead.bhk_preference}
                </span>
              ) : null}
              {lead.location_preference ? (
                <span className="text-[11px] text-[#555] border border-[#E8E8E8] rounded-full px-3 py-1">
                  {lead.location_preference}
                </span>
              ) : null}
              {!lead.budget && !lead.bhk_preference && !lead.location_preference ? (
                <span className="text-[#888] text-[12px]">No details yet.</span>
              ) : null}
            </div>
          </div>

          <div className="mt-5">
            <div className="text-[#555] text-[11px] uppercase tracking-[0.2em] font-semibold">Timeline</div>
            <div className="mt-3 text-[#555] text-[13px] space-y-2">
              <div>Created: {lead.created_at ? format(new Date(lead.created_at), "MMM d, yyyy") : "—"}</div>
              <div>
                First replied:{" "}
                {lead.last_reply_at ? formatDistanceToNow(new Date(lead.last_reply_at), { addSuffix: false }) + " ago" : "—"}
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            {lead.phone ? (
              <a
                href={`https://wa.me/${lead.phone.replace(/\\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[13px] text-[#16A34A] font-medium hover:underline underline-offset-4"
              >
                Open WhatsApp →
              </a>
            ) : null}
            <button className="text-[13px] text-[#888] hover:underline underline-offset-4">Mark as Closed</button>
            <button className="text-[13px] text-[#888] hover:underline underline-offset-4">Mark as Lost</button>
          </div>
        </div>

        <div>
          <ConversationThread messages={threadMessages} mode={lead.mode} />
        </div>
      </div>
      </div>
    </>
  );
}


