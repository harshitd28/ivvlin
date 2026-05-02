import { NextResponse } from "next/server";
import { getClientProfileForUser } from "@/lib/inbox/assert-client-lead";
import { fetchOutboundJobCounts } from "@/lib/inbox/messaging-queue-counts";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

/**
 * Tenant-scoped outbound queue snapshot for inbox banner / polling.
 * Same counts as server-rendered `fetchOutboundJobCounts` on `/dashboard/conversations`.
 */
export async function GET() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ ok: false }, { status: 500 });

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ ok: false }, { status: 401 });

  const prof = await getClientProfileForUser(supabase, userData.user.id);
  if ("error" in prof) return NextResponse.json({ ok: false, message: prof.error }, { status: prof.status });

  const svc = createServiceRoleClient();
  if (!svc) {
    return NextResponse.json({ ok: false, message: "Service role not configured" }, { status: 503 });
  }

  const counts = await fetchOutboundJobCounts(svc, prof.clientId);
  return NextResponse.json({ ok: true, counts });
}
