"use client";

import { useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import type { Channel } from "@/lib/types";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import ChannelBadge from "@/components/shared/ChannelBadge";
import ModeBadge from "@/components/shared/ModeBadge";
import LeadScoreBar from "@/components/shared/LeadScoreBar";

type LeadData = {
  lead_id: string;
  name: string | null;
  phone: string | null;
  instagram_psid: string | null;
  channel: Channel;
  score: number | null;
  status: string | null;
  mode: "ai" | "human";
  budget: string | null;
  bhk_preference: string | null;
  location_preference: string | null;
  source: string | null;
  created_at: string;
  last_contact: string | null;
  follow_up_step: number | null;
  stage: string | null;
  dnd: boolean;
  preferred_lang: string | null;
  assigned_to: string | null;
};

type TimelineItem = {
  id: string;
  created_at: string;
  direction: string | null;
  channel: string | null;
  content: string | null;
  type: string | null;
};

type Props = {
  lead: LeadData;
  timeline: TimelineItem[];
  defaultTakenOverAt: string | null;
};

type LeadDetailUpdateBuilder = {
  update: (payload: { mode: "ai" | "human"; assigned_to: string | null }) => {
    eq: (column: string, value: string) => Promise<{ error: { message: string } | null }>;
  };
};

function ScoreGauge({ score }: { score: number }) {
  const safe = Math.max(0, Math.min(100, score));
  const ring = safe >= 70 ? "#DC2626" : safe >= 40 ? "#D97706" : "#3B82F6";
  const pct = (safe / 100) * 283;
  return (
    <div className="relative h-24 w-24">
      <svg viewBox="0 0 100 100" className="h-24 w-24 -rotate-90">
        <circle cx="50" cy="50" r="45" stroke="#ececec" strokeWidth="8" fill="none" />
        <circle
          cx="50"
          cy="50"
          r="45"
          stroke={ring}
          strokeWidth="8"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${pct} 283`}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-[20px] font-semibold">{safe}</div>
    </div>
  );
}

export default function LeadDetailClient({ lead, timeline, defaultTakenOverAt }: Props) {
  const [mode, setMode] = useState<"ai" | "human">(lead.mode);
  const [loadingMode, setLoadingMode] = useState(false);
  const [takenOverAt, setTakenOverAt] = useState<string | null>(defaultTakenOverAt);
  const [assignedTo, setAssignedTo] = useState<string | null>(lead.assigned_to);

  const score = typeof lead.score === "number" ? lead.score : 0;

  async function updateMode(nextMode: "ai" | "human") {
    const supabase = createSupabaseBrowserClient();
    if (!supabase || loadingMode) return;
    setLoadingMode(true);
    const atIso = new Date().toISOString();

    const leadsBuilder = supabase.from("leads") as unknown as LeadDetailUpdateBuilder;
    const { error } = await leadsBuilder
      .update({
        mode: nextMode,
        assigned_to: nextMode === "human" ? lead.phone ?? lead.instagram_psid ?? "unassigned" : null,
      })
      .eq("lead_id", lead.lead_id);

    if (!error) {
      setMode(nextMode);
      const assigned = nextMode === "human" ? lead.phone ?? lead.instagram_psid ?? "unassigned" : null;
      setAssignedTo(assigned);
      setTakenOverAt(nextMode === "human" ? atIso : null);

      void fetch("/webhook/takeover-handler", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead_id: lead.lead_id,
          mode: nextMode,
          assigned_to: assigned,
          timestamp: atIso,
        }),
      });
    }
    setLoadingMode(false);
  }

  return (
    <div className="space-y-6">
      <div className="border border-[#E8E8E8] rounded-xl bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-medium text-[#0A0A0A]">{lead.name ?? "Lead"}</h1>
            <div className="mt-2 text-[13px] text-[#555]">{lead.phone ?? lead.instagram_psid ?? "No phone/PSID"}</div>
            <div className="mt-3 inline-flex items-center gap-2">
              <ChannelBadge channel={lead.channel} />
              <span className="px-2.5 py-1 rounded-full text-[11px] border border-[#e5e7eb] bg-[#fafafa]">{lead.status ?? "status"}</span>
              <ModeBadge mode={mode} />
            </div>
          </div>
          <ScoreGauge score={score} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <div className="space-y-6">
          <section className="border border-[#E8E8E8] rounded-xl bg-white p-5">
            <div className="text-[11px] uppercase tracking-[0.14em] text-[#777]">Lead Info</div>
            <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3 text-[12px]">
              {[
                ["Budget", lead.budget],
                ["BHK preference", lead.bhk_preference],
                ["Location preference", lead.location_preference],
                ["Source", lead.source],
                ["Created at", format(new Date(lead.created_at), "dd MMM yyyy, hh:mm a")],
                ["Last contact", lead.last_contact ? formatDistanceToNow(new Date(lead.last_contact), { addSuffix: true }) : "—"],
                ["Follow-up step", lead.follow_up_step ? String(lead.follow_up_step) : "—"],
                ["Stage", lead.stage],
                ["DND", lead.dnd ? "Yes" : "No"],
                ["Preferred language", lead.preferred_lang],
              ].map(([k, v]) => (
                <div key={k} className="border border-[#efefef] rounded-lg p-3 bg-[#fcfcfb]">
                  <div className="text-[#777]">{k}</div>
                  <div className="mt-1 text-[#111] font-medium">{v || "—"}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="border border-[#E8E8E8] rounded-xl bg-white p-5">
            <div className="text-[11px] uppercase tracking-[0.14em] text-[#777] mb-4">Conversation Timeline</div>
            <div className="space-y-3">
              {timeline.length === 0 ? (
                <div className="text-[13px] text-[#777] text-center py-10">No conversation yet</div>
              ) : (
                timeline.map((item) => {
                  const inbound = item.direction === "inbound";
                  return (
                    <div key={item.id} className={`flex ${inbound ? "justify-start" : "justify-end"}`}>
                      <div
                        className={`max-w-[78%] rounded-xl px-4 py-3 text-[13px] border ${
                          inbound ? "bg-[#f3f7ff] border-[#dbeafe]" : "bg-[#f4fdf5] border-[#dcfce7]"
                        }`}
                      >
                        <div className="inline-flex items-center gap-2 mb-1">
                          <ChannelBadge channel={(item.channel as Channel) || "whatsapp"} />
                          <span className="text-[10px] text-[#777]">{item.type ?? "workflow"}</span>
                        </div>
                        <div className="text-[#111] whitespace-pre-line">{item.content ?? item.type ?? "Activity"}</div>
                        <div className="mt-1 text-[10px] text-[#777]">{format(new Date(item.created_at), "dd MMM, hh:mm a")}</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="border border-[#E8E8E8] rounded-xl bg-white p-5">
            <div className="text-[11px] uppercase tracking-[0.14em] text-[#777] mb-3">Mode</div>
            <div className="mb-4">
              <ModeBadge mode={mode} />
            </div>
            {mode === "human" ? (
              <div className="space-y-3 text-[12px] text-[#555]">
                <div>Taken over at: {takenOverAt ? format(new Date(takenOverAt), "dd MMM yyyy, hh:mm a") : "—"}</div>
                <div>Assigned to: {assignedTo ?? "—"}</div>
                <button
                  type="button"
                  disabled={loadingMode}
                  onClick={() => updateMode("ai")}
                  className="w-full px-3 py-2 rounded-lg bg-[#fff7ed] text-[#c2410c] border border-[#fed7aa] text-[13px] hover:bg-[#ffedd5] transition-colors duration-150"
                >
                  {loadingMode ? "Updating..." : "Hand Back to AI"}
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={loadingMode}
                onClick={() => updateMode("human")}
                className="w-full px-3 py-2 rounded-lg bg-[#eff6ff] text-[#1d4ed8] border border-[#bfdbfe] text-[13px] hover:bg-[#dbeafe] transition-colors duration-150"
              >
                {loadingMode ? "Updating..." : "Take Over This Lead"}
              </button>
            )}
          </section>

          <section className="border border-[#E8E8E8] rounded-xl bg-white p-5">
            <div className="text-[11px] uppercase tracking-[0.14em] text-[#777] mb-3">Score</div>
            <LeadScoreBar score={score} />
          </section>
        </aside>
      </div>
    </div>
  );
}

