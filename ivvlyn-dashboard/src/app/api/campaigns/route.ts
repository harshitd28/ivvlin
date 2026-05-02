import { NextResponse } from "next/server";
import { recordAuditEvent } from "@/lib/audit/record-audit";
import { normalizeAudienceFilter } from "@/lib/campaigns/audience";
import { launchCampaignById } from "@/lib/campaigns/launch";
import { getClientProfileForUser } from "@/lib/inbox/assert-client-lead";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ ok: false }, { status: 500 });

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ ok: false }, { status: 401 });

  const prof = await getClientProfileForUser(supabase, userData.user.id);
  if ("error" in prof) return NextResponse.json({ ok: false, message: prof.error }, { status: prof.status });

  const { data, error } = await supabase
    .from("campaigns")
    .select(
      "id, name, channel, state, scheduled_for, started_at, completed_at, stats_total_targets, stats_enqueued, stats_failed, created_at, message_body, audience_filter, send_kind, template_name, template_language, template_body_params, template_extras"
    )
    .eq("client_id", prof.clientId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, campaigns: data ?? [] });
}

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ ok: false }, { status: 500 });

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ ok: false }, { status: 401 });

  const prof = await getClientProfileForUser(supabase, userData.user.id);
  if ("error" in prof) return NextResponse.json({ ok: false, message: prof.error }, { status: prof.status });

  const body = (await req.json().catch(() => null)) as {
    name?: string;
    message_body?: string;
    channel?: string;
    audience_filter?: unknown;
    scheduled_for?: string | null;
    intent?: string;
    send_kind?: string;
    template_name?: string | null;
    template_language?: string | null;
    template_body_params?: unknown;
    /** Header media / text / buttons — same shape as inbox template payload. */
    template_extras?: unknown;
  } | null;

  const name = String(body?.name ?? "").trim();
  let message_body = String(body?.message_body ?? "").trim();
  const intent = String(body?.intent ?? "draft").toLowerCase();
  const channel = String(body?.channel ?? "whatsapp").trim() || "whatsapp";
  const send_kind = body?.send_kind === "template" ? "template" : "text";
  const template_name =
    typeof body?.template_name === "string" && body.template_name.trim() ? body.template_name.trim() : null;
  const template_language =
    typeof body?.template_language === "string" && body.template_language.trim()
      ? body.template_language.trim()
      : "en_US";
  const template_body_params = Array.isArray(body?.template_body_params)
    ? (body!.template_body_params as unknown[]).filter((x): x is string => typeof x === "string")
    : [];

  let template_extras: Record<string, unknown> = {};
  if (send_kind === "template" && body?.template_extras !== undefined && body.template_extras !== null) {
    if (typeof body.template_extras !== "object" || Array.isArray(body.template_extras)) {
      return NextResponse.json({ ok: false, message: "template_extras must be a JSON object" }, { status: 400 });
    }
    template_extras = body.template_extras as Record<string, unknown>;
  }

  if (!name) {
    return NextResponse.json({ ok: false, message: "name required" }, { status: 400 });
  }
  if (send_kind === "template") {
    if (!template_name) {
      return NextResponse.json({ ok: false, message: "template_name required for template campaigns" }, { status: 400 });
    }
    if (!message_body) {
      message_body = `[Template: ${template_name}]`;
    }
  } else if (!message_body) {
    return NextResponse.json({ ok: false, message: "message_body required for text campaigns" }, { status: 400 });
  }

  const audience_filter = normalizeAudienceFilter(body?.audience_filter ?? {});
  const now = Date.now();
  let state: "draft" | "scheduled" = "draft";
  let scheduled_for: string | null = null;

  if (intent === "schedule") {
    const raw = body?.scheduled_for ? String(body.scheduled_for) : "";
    const t = raw ? Date.parse(raw) : NaN;
    if (!Number.isFinite(t) || t <= now) {
      return NextResponse.json({ ok: false, message: "scheduled_for must be a future time" }, { status: 400 });
    }
    state = "scheduled";
    scheduled_for = new Date(t).toISOString();
  } else if (intent !== "draft" && intent !== "send_now") {
    return NextResponse.json({ ok: false, message: "intent must be draft, schedule, or send_now" }, { status: 400 });
  }

  const svc = createServiceRoleClient();
  if (!svc) return NextResponse.json({ ok: false, message: "Service role not configured" }, { status: 503 });

  const { data: ins, error: insErr } = await svc
    .from("campaigns")
    .insert({
      client_id: prof.clientId,
      created_by: userData.user.id,
      name,
      channel,
      message_body,
      send_kind,
      template_name: send_kind === "template" ? template_name : null,
      template_language: send_kind === "template" ? template_language : null,
      template_body_params: send_kind === "template" ? template_body_params : [],
      template_extras: send_kind === "template" ? template_extras : {},
      audience_filter,
      state,
      scheduled_for,
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (insErr || !ins) {
    return NextResponse.json({ ok: false, message: insErr?.message ?? "Insert failed" }, { status: 500 });
  }

  const id = (ins as { id: string }).id;

  if (intent === "send_now") {
    const launched = await launchCampaignById(svc, id);
    if (!launched.ok) {
      return NextResponse.json({ ok: false, message: launched.message, campaign_id: id }, { status: 500 });
    }
    recordAuditEvent({
      actorUserId: userData.user.id,
      clientId: prof.clientId,
      action: "campaigns.create_send_now",
      resourceType: "campaign",
      resourceId: id,
      detail: {
        enqueued: launched.enqueued,
        failed: launched.failed,
        total_targets: launched.total_targets,
      },
    });
    return NextResponse.json({ ok: true, campaign_id: id, launch: launched });
  }

  return NextResponse.json({ ok: true, campaign_id: id });
}
