import { NextResponse } from "next/server";
import { drainOutboundBatch } from "@/lib/messaging/dispatch-batch";
import { launchCampaignById } from "@/lib/campaigns/launch";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { assertCronSecret } from "./assert-secret";

async function processQueueCore(req: Request): Promise<Response> {
  const svc = createServiceRoleClient();
  if (!svc) {
    return NextResponse.json({ ok: false, message: "Service role not configured" }, { status: 503 });
  }

  let maxJobs = 25;
  try {
    const body = await req.json().catch(() => ({}));
    if (typeof (body as { maxJobs?: unknown }).maxJobs === "number") {
      maxJobs = Math.min(100, Math.max(1, (body as { maxJobs: number }).maxJobs));
    }
  } catch {
    /* optional body */
  }

  const result = await drainOutboundBatch(svc, { maxJobs, useRedis: true });
  return NextResponse.json({ ok: true, ...result });
}

export async function handleProcessQueue(req: Request): Promise<Response> {
  const deny = assertCronSecret(req);
  if (deny) return deny;
  return processQueueCore(req);
}

export async function slaSweepCore(): Promise<Response> {
  const svc = createServiceRoleClient();
  if (!svc) {
    return NextResponse.json({ ok: false, message: "Service role not configured" }, { status: 503 });
  }

  const nowIso = new Date().toISOString();

  const { data, error } = await svc
    .from("leads")
    .update({ sla_breached_at: nowIso })
    .lt("first_response_due_at", nowIso)
    .is("sla_breached_at", null)
    .not("first_response_due_at", "is", null)
    .select("lead_id, client_id");

  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as Array<{ lead_id?: string; client_id?: string }>;
  return NextResponse.json({ ok: true, updated: rows.length, sample: rows.slice(0, 5) });
}

export async function handleSlaSweep(req: Request): Promise<Response> {
  const deny = assertCronSecret(req);
  if (deny) return deny;
  return slaSweepCore();
}

async function dispatchCampaignsCore(req: Request): Promise<Response> {
  const svc = createServiceRoleClient();
  if (!svc) {
    return NextResponse.json({ ok: false, message: "Service role not configured" }, { status: 503 });
  }

  let max = 10;
  try {
    const body = await req.json().catch(() => ({}));
    if (typeof (body as { max?: unknown }).max === "number") {
      max = Math.min(50, Math.max(1, (body as { max: number }).max));
    }
  } catch {
    /* optional */
  }

  const nowIso = new Date().toISOString();
  const { data: due, error } = await svc
    .from("campaigns")
    .select("id")
    .eq("state", "scheduled")
    .lte("scheduled_for", nowIso)
    .order("scheduled_for", { ascending: true })
    .limit(max);

  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }

  const ids = (due ?? []) as Array<{ id: string }>;
  const results: Array<{ id: string; ok: boolean; message?: string; enqueued?: number }> = [];

  for (const { id } of ids) {
    const r = await launchCampaignById(svc, id);
    if (r.ok) {
      results.push({ id, ok: true, enqueued: r.enqueued });
    } else {
      results.push({ id, ok: false, message: r.message });
    }
  }

  return NextResponse.json({ ok: true, processed: results.length, results });
}

export async function handleDispatchCampaigns(req: Request): Promise<Response> {
  const deny = assertCronSecret(req);
  if (deny) return deny;
  return dispatchCampaignsCore(req);
}

/** One auth check, then queue → SLA → campaigns (for a single scheduled ping). */
export async function handleCronAll(req: Request): Promise<Response> {
  const deny = assertCronSecret(req);
  if (deny) return deny;

  const queueRes = await processQueueCore(req);
  const slaRes = await slaSweepCore();
  const campaignsRes = await dispatchCampaignsCore(req);

  const queueJson = (await queueRes.json()) as Record<string, unknown>;
  const slaJson = (await slaRes.json()) as Record<string, unknown>;
  const campJson = (await campaignsRes.json()) as Record<string, unknown>;

  return NextResponse.json({
    ok: true,
    queue: queueJson,
    sla: slaJson,
    campaigns: campJson,
  });
}
