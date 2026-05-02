import { NextResponse } from "next/server";
import { enqueueAndDispatchHint, scheduleDrainAfterResponse } from "@/lib/messaging/enqueue-internal";
import { buildWhatsAppSendPlanFromPayload } from "@/lib/messaging/whatsapp-send-plan";
import { isWhatsAppSessionActive } from "@/lib/messaging/whatsapp-session-window";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

/**
 * Enqueue outbound message: conversation row (queued) + job + optional Redis fast-lane.
 * After the HTTP response, a short background drain runs (Next `after`) so small tenants need no cron.
 * At scale: set REDIS_URL + run dedicated worker / frequent cron on `/api/internal/messaging/process-queue`.
 */
export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, message: "Supabase not configured" }, { status: 500 });
  }

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, client_id")
    .eq("id", userData.user.id)
    .maybeSingle();

  const typed = profile as { role?: string | null; client_id?: string | null } | null;
  if (typed?.role !== "client" || !typed.client_id) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }

  const clientId = typed.client_id;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  const leadId = String(body.lead_id ?? "").trim();
  const message = String(body.message ?? "").trim();
  const isAutomated = Boolean(body.is_automated);
  const channel = String(body.channel ?? "whatsapp").trim() || "whatsapp";
  const priority =
    typeof body.priority === "number" && Number.isFinite(body.priority)
      ? Math.floor(body.priority)
      : isAutomated
        ? 0
        : 10;

  const payloadExtra: Record<string, unknown> =
    body.payload !== null && typeof body.payload === "object" && !Array.isArray(body.payload)
      ? { ...(body.payload as Record<string, unknown>) }
      : {};

  const outboundText =
    typeof payloadExtra.text === "string" && String(payloadExtra.text).trim()
      ? String(payloadExtra.text).trim()
      : message;
  payloadExtra.text = outboundText;

  const idempotencyKey =
    (typeof body.idempotency_key === "string" && body.idempotency_key.trim()) ||
    req.headers.get("Idempotency-Key") ||
    req.headers.get("idempotency-key");

  if (!leadId || !message) {
    return NextResponse.json({ ok: false, message: "lead_id and message are required" }, { status: 400 });
  }

  const svc = createServiceRoleClient();
  if (!svc) {
    return NextResponse.json({ ok: false, message: "Service role not configured" }, { status: 503 });
  }

  if (idempotencyKey) {
    const { data: existing } = await svc
      .from("conversations")
      .select("id")
      .eq("client_id", clientId)
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();

    const existingId = (existing as { id?: string } | null)?.id;
    if (existingId) {
      scheduleDrainAfterResponse();
      return NextResponse.json({ ok: true, deduped: true, conversation_id: existingId });
    }
  }

  const { data: leadForWindow } = await svc
    .from("leads")
    .select("last_customer_message_at")
    .eq("client_id", clientId)
    .eq("lead_id", leadId)
    .maybeSingle();
  const lastCustomerMessageAt = (leadForWindow as { last_customer_message_at?: string | null } | null)
    ?.last_customer_message_at;

  const mergedPayload: Record<string, unknown> = { text: outboundText, ...payloadExtra };
  const plan = buildWhatsAppSendPlanFromPayload(mergedPayload);
  const skipSession =
    process.env.WHATSAPP_SKIP_SESSION_WINDOW === "1" || process.env.MESSAGING_SKIP_SESSION_WINDOW === "1";

  if (
    channel === "whatsapp" &&
    plan?.kind === "text" &&
    !isAutomated &&
    !skipSession &&
    !isWhatsAppSessionActive(lastCustomerMessageAt)
  ) {
    return NextResponse.json(
      {
        ok: false,
        code: "whatsapp_session_expired",
        message:
          "WhatsApp session window closed or no prior customer message. Send an approved template (template_name + template_language + template_body_params) or wait for the customer to message you.",
      },
      { status: 422 }
    );
  }

  const inserted = await enqueueAndDispatchHint({
    svc,
    clientId,
    leadId,
    message: outboundText,
    channel,
    isAutomated,
    priority,
    idempotencyKey: idempotencyKey?.trim() || null,
    payloadExtra,
  });

  if (!inserted.ok) {
    return NextResponse.json({ ok: false, message: inserted.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    conversation_id: inserted.conversation_id,
    job_id: inserted.job_id,
  });
}
