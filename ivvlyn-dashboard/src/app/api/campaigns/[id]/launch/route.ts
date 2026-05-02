import { NextResponse } from "next/server";
import { recordAuditEvent } from "@/lib/audit/record-audit";
import { launchCampaignById } from "@/lib/campaigns/launch";
import { getClientProfileForUser } from "@/lib/inbox/assert-client-lead";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: campaignId } = await ctx.params;
  if (!campaignId) return NextResponse.json({ ok: false }, { status: 400 });

  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ ok: false }, { status: 500 });

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ ok: false }, { status: 401 });

  const prof = await getClientProfileForUser(supabase, userData.user.id);
  if ("error" in prof) return NextResponse.json({ ok: false, message: prof.error }, { status: prof.status });

  const { data: row } = await supabase
    .from("campaigns")
    .select("id")
    .eq("id", campaignId)
    .eq("client_id", prof.clientId)
    .maybeSingle();

  if (!(row as { id?: string } | null)?.id) {
    return NextResponse.json({ ok: false, message: "Not found" }, { status: 404 });
  }

  const svc = createServiceRoleClient();
  if (!svc) return NextResponse.json({ ok: false, message: "Service role not configured" }, { status: 503 });

  const launched = await launchCampaignById(svc, campaignId);
  if (!launched.ok) {
    return NextResponse.json({ ok: false, message: launched.message }, { status: 400 });
  }

  recordAuditEvent({
    actorUserId: userData.user.id,
    clientId: prof.clientId,
    action: "campaigns.launch",
    resourceType: "campaign",
    resourceId: campaignId,
    detail: {
      enqueued: launched.enqueued,
      failed: launched.failed,
      total_targets: launched.total_targets,
    },
  });

  return NextResponse.json({
    ok: true,
    enqueued: launched.enqueued,
    failed: launched.failed,
    total_targets: launched.total_targets,
  });
}
