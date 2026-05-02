"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Megaphone, Play, Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import CampaignAnalyticsSummary from "@/components/dashboard/campaigns/CampaignAnalyticsSummary";

type CampaignRow = {
  id: string;
  name: string;
  channel: string;
  state: string;
  scheduled_for: string | null;
  started_at: string | null;
  completed_at: string | null;
  stats_total_targets: number;
  stats_enqueued: number;
  stats_failed: number;
  created_at: string;
  message_body: string;
  audience_filter: unknown;
  send_kind?: string;
  template_name?: string | null;
  template_language?: string | null;
  template_body_params?: unknown;
  template_extras?: Record<string, unknown> | null;
};

export default function CampaignsClient() {
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [sendKind, setSendKind] = useState<"text" | "template">("text");
  const [messageBody, setMessageBody] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [templateLanguage, setTemplateLanguage] = useState("en_US");
  const [templateParamsRaw, setTemplateParamsRaw] = useState("");
  const [templateExtrasRaw, setTemplateExtrasRaw] = useState("{}");
  const [minScore, setMinScore] = useState("");
  const [unassignedOnly, setUnassignedOnly] = useState(false);
  const [requirePhone, setRequirePhone] = useState(true);
  const [scheduledFor, setScheduledFor] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/campaigns", { credentials: "include" });
    const d = (await res.json().catch(() => ({}))) as { ok?: boolean; campaigns?: CampaignRow[]; message?: string };
    setLoading(false);
    if (!res.ok || !d.ok) {
      setError(
        d.message ??
          "Could not load campaigns. Apply migrations through `20260505120000_campaigns_whatsapp_templates.sql` (see docs/supabase-pending-work.md)."
      );
      setCampaigns([]);
      return;
    }
    setCampaigns(d.campaigns ?? []);
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(t);
  }, [load]);

  function audienceFilter() {
    const min = minScore.trim() === "" ? undefined : Number(minScore);
    return {
      ...(Number.isFinite(min) ? { min_score: min } : {}),
      unassigned_only: unassignedOnly || undefined,
      require_phone: requirePhone,
    };
  }

  function templateBodyParams(): string[] {
    return templateParamsRaw
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  async function create(intent: "draft" | "schedule" | "send_now") {
    if (!name.trim()) return;
    if (sendKind === "text" && !messageBody.trim()) return;
    if (sendKind === "template" && !templateName.trim()) return;

    let template_extras: Record<string, unknown> | undefined;
    if (sendKind === "template") {
      const trimmed = templateExtrasRaw.trim();
      if (trimmed === "" || trimmed === "{}") {
        template_extras = undefined;
      } else {
        try {
          const parsed = JSON.parse(trimmed) as unknown;
          if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
            setError("Template extras must be a JSON object (e.g. {\"template_header_media_kind\":\"image\", …}).");
            return;
          }
          template_extras = parsed as Record<string, unknown>;
        } catch {
          setError("Template extras: invalid JSON.");
          return;
        }
      }
    }

    setSaving(true);
    setError(null);
    const res = await fetch("/api/campaigns", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        send_kind: sendKind,
        message_body: messageBody.trim(),
        template_name: sendKind === "template" ? templateName.trim() : null,
        template_language: sendKind === "template" ? templateLanguage.trim() || "en_US" : null,
        template_body_params: sendKind === "template" ? templateBodyParams() : [],
        ...(sendKind === "template" && template_extras !== undefined ? { template_extras } : {}),
        audience_filter: audienceFilter(),
        scheduled_for: intent === "schedule" && scheduledFor ? new Date(scheduledFor).toISOString() : null,
        intent,
      }),
    });
    const d = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string; launch?: unknown };
    setSaving(false);
    if (!res.ok || !d.ok) {
      setError(d.message ?? "Save failed");
      return;
    }
    if (intent === "send_now") {
      setName("");
      setMessageBody("");
      setTemplateName("");
      setTemplateParamsRaw("");
      setTemplateExtrasRaw("{}");
      setScheduledFor("");
    }
    await load();
  }

  async function launch(id: string) {
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/campaigns/${encodeURIComponent(id)}/launch`, {
      method: "POST",
      credentials: "include",
    });
    const d = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string };
    setSaving(false);
    if (!res.ok || !d.ok) {
      setError(d.message ?? "Launch failed");
      return;
    }
    await load();
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-[13px] text-[#888]">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading campaigns…
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)]">
      <div className="space-y-3">
        <CampaignAnalyticsSummary
          campaigns={campaigns.map((c) => ({
            id: c.id,
            state: c.state,
            stats_total_targets: c.stats_total_targets,
            stats_enqueued: c.stats_enqueued,
            stats_failed: c.stats_failed,
          }))}
        />
        <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-[#666]">
          <Megaphone size={14} />
          Recent
        </div>
        {error ? <div className="rounded-lg border border-red-500/30 bg-red-950/20 px-3 py-2 text-[13px] text-red-200">{error}</div> : null}
        <div className="space-y-2">
          {campaigns.length === 0 ? (
            <div className="rounded-xl border border-[#1A1A1A] bg-[#0D0D0D] p-6 text-[13px] text-[#666]">No campaigns yet.</div>
          ) : (
            campaigns.map((c) => (
              <div key={c.id} className="rounded-xl border border-[#1A1A1A] bg-[#0D0D0D] p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="text-[14px] font-medium text-white">{c.name}</div>
                    <div className="mt-1 text-[11px] text-[#666]">
                      {c.state}
                      {c.send_kind === "template" ? ` · template: ${c.template_name ?? "?"}` : " · text"}
                      {c.send_kind === "template" &&
                      c.template_extras &&
                      Object.keys(c.template_extras).length > 0
                        ? " · rich template"
                        : ""}
                      {c.scheduled_for ? ` · scheduled ${c.scheduled_for}` : ""}
                    </div>
                  </div>
                  {(c.state === "draft" || c.state === "scheduled") && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={saving}
                      className="border-[#333] text-white"
                      onClick={() => void launch(c.id)}
                    >
                      <Play size={14} className="mr-1" />
                      Send now
                    </Button>
                  )}
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px] text-[#888]">
                  <div className="rounded-lg bg-[#111] py-2">
                    <div className="text-white text-[15px] font-medium">{c.stats_total_targets}</div>
                    targets
                  </div>
                  <div className="rounded-lg bg-[#111] py-2">
                    <div className="text-emerald-400 text-[15px] font-medium">{c.stats_enqueued}</div>
                    queued
                  </div>
                  <div className="rounded-lg bg-[#111] py-2">
                    <div className="text-red-300 text-[15px] font-medium">{c.stats_failed}</div>
                    failed
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="rounded-xl border border-[#1A1A1A] bg-[#0D0D0D] p-5 space-y-4">
        <div className="text-[12px] font-semibold uppercase tracking-wider text-[#666]">New campaign</div>
        <div className="space-y-1">
          <label className="text-[11px] text-[#777]">Name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} className="border-[#2a2a2a] bg-[#111] text-white" />
        </div>

        <div className="space-y-2">
          <div className="text-[11px] text-[#777]">Send as</div>
          <div className="flex gap-4 text-[12px] text-[#aaa]">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="sendKind" checked={sendKind === "text"} onChange={() => setSendKind("text")} />
              Plain text
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="sendKind" checked={sendKind === "template"} onChange={() => setSendKind("template")} />
              WhatsApp template
            </label>
          </div>
        </div>

        {sendKind === "text" ? (
          <div className="space-y-1">
            <label className="text-[11px] text-[#777]">Message</label>
            <textarea
              value={messageBody}
              onChange={(e) => setMessageBody(e.target.value)}
              rows={5}
              className="w-full rounded-md border border-[#2a2a2a] bg-[#111] px-3 py-2 text-[13px] text-white"
            />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-[11px] text-[#777]">Template name (Meta-approved)</label>
              <Input
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g. seasonal_promo"
                className="border-[#2a2a2a] bg-[#111] text-white"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] text-[#777]">Language code</label>
              <Input
                value={templateLanguage}
                onChange={(e) => setTemplateLanguage(e.target.value)}
                placeholder="en_US"
                className="border-[#2a2a2a] bg-[#111] text-white"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] text-[#777]">
                Body variables (one per line, order = {"{{1}}"}, {"{{2}}"}, …)
              </label>
              <textarea
                value={templateParamsRaw}
                onChange={(e) => setTemplateParamsRaw(e.target.value)}
                rows={4}
                placeholder={"Line 1 → first body param\nLine 2 → second"}
                className="w-full rounded-md border border-[#2a2a2a] bg-[#111] px-3 py-2 text-[13px] text-white"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] text-[#777]">Inbox preview label (optional)</label>
              <Input
                value={messageBody}
                onChange={(e) => setMessageBody(e.target.value)}
                placeholder="Defaults to [Template: name]"
                className="border-[#2a2a2a] bg-[#111] text-white"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] text-[#777]">
                Template extras (JSON, optional) — header media, buttons
              </label>
              <textarea
                value={templateExtrasRaw}
                onChange={(e) => setTemplateExtrasRaw(e.target.value)}
                rows={5}
                spellCheck={false}
                placeholder={
                  '{\n  "template_header_media_kind": "image",\n  "template_header_media_url": "https://..."\n}'
                }
                className="w-full rounded-md border border-[#2a2a2a] bg-[#111] px-3 py-2 font-mono text-[12px] text-white"
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[11px] text-[#777]">Min score (optional)</label>
            <Input
              value={minScore}
              onChange={(e) => setMinScore(e.target.value)}
              inputMode="numeric"
              className="border-[#2a2a2a] bg-[#111] text-white"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] text-[#777]">Schedule (local)</label>
            <Input
              type="datetime-local"
              value={scheduledFor}
              onChange={(e) => setScheduledFor(e.target.value)}
              className="border-[#2a2a2a] bg-[#111] text-white"
            />
          </div>
        </div>
        <label className="flex items-center gap-2 text-[12px] text-[#aaa]">
          <input type="checkbox" checked={unassignedOnly} onChange={(e) => setUnassignedOnly(e.target.checked)} />
          Unassigned leads only
        </label>
        <label className="flex items-center gap-2 text-[12px] text-[#aaa]">
          <input type="checkbox" checked={requirePhone} onChange={(e) => setRequirePhone(e.target.checked)} />
          Require phone number
        </label>
        <div className="flex flex-wrap gap-2 pt-2">
          <Button type="button" disabled={saving} variant="secondary" className="bg-[#1a1a1a]" onClick={() => void create("draft")}>
            Save draft
          </Button>
          <Button
            type="button"
            disabled={saving || !scheduledFor}
            variant="outline"
            className="border-[#333]"
            onClick={() => void create("schedule")}
          >
            Schedule
          </Button>
          <Button type="button" disabled={saving} className="bg-[#6C5CE7]" onClick={() => void create("send_now")}>
            <Send size={14} className="mr-1" />
            Send now
          </Button>
        </div>
        <p className="text-[11px] text-[#555] leading-relaxed">
          Templates must exist and be approved on your WhatsApp Business account. Outside the customer service window, Meta typically requires{" "}
          <code className="text-[#888]">type: template</code> sends. Cap audience with <code className="text-[#888]">CAMPAIGN_MAX_RECIPIENTS</code>.
        </p>
      </div>
    </div>
  );
}
