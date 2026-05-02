import { NextResponse } from "next/server";
import { recordAuditEvent } from "@/lib/audit/record-audit";
import { getClientProfileForUser } from "@/lib/inbox/assert-client-lead";
import { scheduleDrainAfterResponse } from "@/lib/messaging/enqueue-internal";
import { pushOutboundJobId } from "@/lib/messaging/redis-queue";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type DeadJobRow = {
  id: string;
  lead_id: string;
  channel: string;
  last_error: string | null;
  attempts: number;
  max_attempts: number;
  updated_at: string;
  created_at: string;
  payload: Record<string, unknown>;
};

/** List dead-letter outbound jobs for the tenant (manual retry / inspection). */
export async function GET() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ ok: false }, { status: 500 });

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ ok: false }, { status: 401 });

  const prof = await getClientProfileForUser(supabase, userData.user.id);
  if ("error" in prof) return NextResponse.json({ ok: false, message: prof.error }, { status: prof.status });

  const svc = createServiceRoleClient();
  if (!svc) return NextResponse.json({ ok: false, message: "Service role not configured" }, { status: 503 });

  const { data, error } = await svc
    .from("outbound_message_jobs")
    .select("id, lead_id, channel, last_error, attempts, max_attempts, updated_at, created_at, payload")
    .eq("client_id", prof.clientId)
    .eq("state", "dead")
    .order("updated_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });

  const jobs = (data ?? []).map((r) => {
    const row = r as Record<string, unknown>;
    const err = row.last_error ?? row.error;
    return {
      id: String(row.id ?? ""),
      lead_id: String(row.lead_id ?? ""),
      channel: String(row.channel ?? ""),
      last_error: typeof err === "string" ? err : null,
      attempts: typeof row.attempts === "number" ? row.attempts : 0,
      max_attempts: typeof row.max_attempts === "number" ? row.max_attempts : 8,
      updated_at: String(row.updated_at ?? ""),
      created_at: String(row.created_at ?? ""),
      payload:
        typeof row.payload === "object" && row.payload !== null && !Array.isArray(row.payload)
          ? (row.payload as Record<string, unknown>)
          : {},
    };
  });

  return NextResponse.json({ ok: true, jobs });
}

/** Requeue a dead job (reset attempts, pending). */
export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ ok: false }, { status: 500 });

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ ok: false }, { status: 401 });

  const prof = await getClientProfileForUser(supabase, userData.user.id);
  if ("error" in prof) return NextResponse.json({ ok: false, message: prof.error }, { status: prof.status });

  const body = (await req.json().catch(() => null)) as { job_id?: string } | null;
  const jobId = String(body?.job_id ?? "").trim();
  if (!jobId) return NextResponse.json({ ok: false, message: "job_id required" }, { status: 400 });

  const svc = createServiceRoleClient();
  if (!svc) return NextResponse.json({ ok: false, message: "Service role not configured" }, { status: 503 });

  const now = new Date().toISOString();
  const { data: updated, error } = await svc
    .from("outbound_message_jobs")
    .update({
      state: "pending",
      attempts: 0,
      scheduled_at: now,
      last_error: null,
      error: null,
      locked_at: null,
      locked_by: null,
      updated_at: now,
    })
    .eq("id", jobId)
    .eq("client_id", prof.clientId)
    .eq("state", "dead")
    .select("id")
    .maybeSingle();

  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  if (!(updated as { id?: string } | null)?.id) {
    return NextResponse.json({ ok: false, message: "Job not found or not dead" }, { status: 404 });
  }

  await pushOutboundJobId(jobId);
  scheduleDrainAfterResponse();

  recordAuditEvent({
    actorUserId: userData.user.id,
    clientId: prof.clientId,
    action: "outbound_jobs.requeue",
    resourceType: "outbound_message_job",
    resourceId: jobId,
    detail: {},
  });

  return NextResponse.json({ ok: true, requeued: jobId });
}
