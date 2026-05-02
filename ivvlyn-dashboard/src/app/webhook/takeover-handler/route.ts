import { NextResponse } from "next/server";
import { claimWebhookIdempotency } from "@/lib/messaging/idempotency";
import { buildLeadTakeoverPatch, updateLeadTakeoverByLeadId } from "@/lib/leads/takeover-patch";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { Json } from "@/lib/types";

function parseTakeoverPayload(payload: unknown): {
  lead_id: string;
  mode: "ai" | "human";
  assigned_to?: string | null;
  assigned_to_user_id?: string | null;
} | null {
  if (typeof payload !== "object" || payload === null) return null;
  const p = payload as Record<string, unknown>;
  const lead_id = typeof p.lead_id === "string" ? p.lead_id.trim() : "";
  const modeRaw = p.mode;
  if (!lead_id || (modeRaw !== "ai" && modeRaw !== "human")) return null;
  const assigned_to =
    typeof p.assigned_to === "string" ? p.assigned_to : p.assigned_to === null ? null : undefined;
  let assigned_to_user_id: string | null | undefined = undefined;
  if (p.assigned_to_user_id === null) assigned_to_user_id = null;
  else if (typeof p.assigned_to_user_id === "string" && p.assigned_to_user_id.trim()) {
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    assigned_to_user_id = uuid.test(p.assigned_to_user_id.trim()) ? p.assigned_to_user_id.trim() : undefined;
  }
  return {
    lead_id,
    mode: modeRaw,
    ...(assigned_to !== undefined ? { assigned_to } : {}),
    ...(assigned_to_user_id !== undefined ? { assigned_to_user_id } : {}),
  };
}

/**
 * Automation / n8n hook when a lead is taken over or handed back.
 * Optional: `WEBHOOK_SHARED_SECRET` — require `Authorization: Bearer <secret>` or `x-ivvlin-webhook-secret`.
 * Optional: `Idempotency-Key` header (recommended for n8n retries).
 *
 * Persists to `public.leads`: `mode`, `takeover_at` (human), `handback_at` (ai), optional `assigned_to` / `assigned_to_user_id`.
 */
export async function POST(req: Request) {
  const secret = process.env.WEBHOOK_SHARED_SECRET ?? "";
  if (secret) {
    const auth = req.headers.get("authorization");
    const bearer = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
    const headerSecret = req.headers.get("x-ivvlin-webhook-secret");
    if (bearer !== secret && headerSecret !== secret) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
  }

  const raw = await req.text();
  let payload: unknown = {};
  try {
    payload = JSON.parse(raw || "{}") as unknown;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  const parsed = parseTakeoverPayload(payload);
  if (!parsed) {
    return NextResponse.json({ ok: true, received: payload, persisted: false });
  }

  const idem =
    req.headers.get("idempotency-key")?.trim() ||
    req.headers.get("Idempotency-Key")?.trim() ||
    (typeof payload === "object" &&
    payload !== null &&
    "idempotency_key" in payload &&
    typeof (payload as { idempotency_key?: unknown }).idempotency_key === "string"
      ? (payload as { idempotency_key: string }).idempotency_key.trim()
      : "");

  const svc = createServiceRoleClient();
  if (!svc) {
    return NextResponse.json({ ok: false, message: "Service role not configured" }, { status: 503 });
  }

  if (idem) {
    const meta: Record<string, unknown> = { lead_id: parsed.lead_id, mode: parsed.mode };
    const claimed = await claimWebhookIdempotency(svc, idem, "takeover-handler", meta as Json);
    if (!claimed.ok) {
      return NextResponse.json({ ok: false, message: claimed.error }, { status: 500 });
    }
    if (claimed.duplicate) {
      return NextResponse.json({ ok: true, duplicate: true });
    }
  }

  const patch = buildLeadTakeoverPatch(parsed.mode, {
    assigned_to: parsed.assigned_to ?? undefined,
    assigned_to_user_id: parsed.assigned_to_user_id,
  });
  const result = await updateLeadTakeoverByLeadId(svc, parsed.lead_id, patch);
  if (!result.ok) {
    return NextResponse.json({ ok: false, message: result.error }, { status: result.error === "lead not found" ? 404 : 500 });
  }

  return NextResponse.json({ ok: true, persisted: true, lead_id: parsed.lead_id, mode: parsed.mode });
}
