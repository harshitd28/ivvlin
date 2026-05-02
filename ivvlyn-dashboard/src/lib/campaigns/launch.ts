import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeAudienceFilter, resolveAudienceLeadIds } from "@/lib/campaigns/audience";
import { insertQueuedOutbound, scheduleDrainAfterResponse } from "@/lib/messaging/enqueue-internal";
import { pushOutboundJobId } from "@/lib/messaging/redis-queue";

export type CampaignRow = {
  id: string;
  client_id: string;
  channel: string;
  message_body: string;
  send_kind: string;
  template_name: string | null;
  template_language: string | null;
  template_body_params: unknown;
  /** Header media/text + buttons — merged into outbound payload for template sends. */
  template_extras: unknown;
  audience_filter: unknown;
  state: string;
};

function campaignMaxRecipients(): number {
  const n = Number(process.env.CAMPAIGN_MAX_RECIPIENTS ?? "2000");
  return Math.max(1, Math.min(50_000, Number.isFinite(n) ? n : 2000));
}

function normalizeTemplateParams(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === "string");
}

/** Pick rich-template fields stored on campaigns into outbound payload (same keys as inbox composer). */
function mergeTemplateExtrasIntoPayload(target: Record<string, unknown>, raw: unknown): void {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return;
  const o = raw as Record<string, unknown>;

  const headerParams = normalizeTemplateParams(o.template_header_params).map((s) => s.trim()).filter(Boolean);
  if (headerParams.length) target.template_header_params = headerParams;

  const hk =
    typeof o.template_header_media_kind === "string" ? o.template_header_media_kind.toLowerCase().trim() : "";
  if (hk === "image" || hk === "video" || hk === "document") {
    target.template_header_media_kind = hk;
    const url = typeof o.template_header_media_url === "string" ? o.template_header_media_url.trim() : "";
    if (url) target.template_header_media_url = url;
    if (hk === "document") {
      const fn =
        typeof o.template_header_document_filename === "string" && o.template_header_document_filename.trim()
          ? o.template_header_document_filename.trim()
          : null;
      if (fn) target.template_header_document_filename = fn;
    }
  }

  if (Array.isArray(o.template_buttons) && o.template_buttons.length > 0) {
    target.template_buttons = o.template_buttons;
  }
}

/**
 * Atomically claim campaign (draft or scheduled) → sending. Returns null if already launched or wrong state.
 */
export async function claimCampaignForSend(
  svc: SupabaseClient,
  campaignId: string
): Promise<CampaignRow | null> {
  const now = new Date().toISOString();
  const { data, error } = await svc
    .from("campaigns")
    .update({ state: "sending", started_at: now, updated_at: now })
    .eq("id", campaignId)
    .in("state", ["draft", "scheduled"])
    .select(
      "id, client_id, channel, message_body, send_kind, template_name, template_language, template_body_params, template_extras, audience_filter, state"
    )
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as CampaignRow | null) ?? null;
}

export async function runCampaignSend(svc: SupabaseClient, campaign: CampaignRow): Promise<{
  enqueued: number;
  failed: number;
  total_targets: number;
}> {
  const filter = normalizeAudienceFilter(campaign.audience_filter);
  const leadIds = await resolveAudienceLeadIds(svc, campaign.client_id, filter, campaignMaxRecipients());
  const total = leadIds.length;
  let enqueued = 0;
  let failed = 0;

  const isTemplate =
    campaign.send_kind === "template" && typeof campaign.template_name === "string" && campaign.template_name.trim().length > 0;

  const threadMessage = isTemplate
    ? (campaign.message_body?.trim() || `[Template: ${campaign.template_name!.trim()}]`)
    : campaign.message_body;

  const payloadExtra: Record<string, unknown> = {
    kind: "campaign",
    campaign_id: campaign.id,
    text: threadMessage,
  };

  if (isTemplate) {
    payloadExtra.whatsapp_kind = "template";
    payloadExtra.template_name = campaign.template_name!.trim();
    payloadExtra.template_language = (campaign.template_language?.trim() || "en_US");
    payloadExtra.template_body_params = normalizeTemplateParams(campaign.template_body_params);
    mergeTemplateExtrasIntoPayload(payloadExtra, campaign.template_extras);
  }

  for (const leadId of leadIds) {
    const idem = `campaign:${campaign.id}:${leadId}`;
    const r = await insertQueuedOutbound({
      svc,
      clientId: campaign.client_id,
      leadId,
      message: threadMessage,
      channel: campaign.channel,
      isAutomated: true,
      priority: 2,
      idempotencyKey: idem,
      payloadExtra,
    });
    if (r.ok) {
      enqueued += 1;
      await pushOutboundJobId(r.job_id);
    } else {
      failed += 1;
    }
  }

  const now = new Date().toISOString();
  const finalState = failed > 0 && enqueued === 0 ? "failed" : "completed";
  await svc
    .from("campaigns")
    .update({
      state: finalState,
      completed_at: now,
      updated_at: now,
      stats_total_targets: total,
      stats_enqueued: enqueued,
      stats_failed: failed,
    })
    .eq("id", campaign.id);

  scheduleDrainAfterResponse();
  return { enqueued, failed, total_targets: total };
}

export async function launchCampaignById(svc: SupabaseClient, campaignId: string) {
  const claimed = await claimCampaignForSend(svc, campaignId);
  if (!claimed) return { ok: false as const, message: "Campaign not launchable (wrong state or missing)" };
  const stats = await runCampaignSend(svc, claimed);
  return { ok: true as const, ...stats };
}
