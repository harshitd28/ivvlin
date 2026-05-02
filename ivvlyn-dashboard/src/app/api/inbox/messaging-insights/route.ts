import { NextResponse } from "next/server";
import { getClientProfileForUser } from "@/lib/inbox/assert-client-lead";
import { fetchMessagingInsights } from "@/lib/inbox/messaging-insights";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

/** Queue lag, recent failures, dead-letter samples, and 24h webhook delivery rows. */
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

  try {
    const insights = await fetchMessagingInsights(svc, prof.clientId);
    return NextResponse.json({ ok: true, insights });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "insights_failed";
    return NextResponse.json({ ok: false, message: msg }, { status: 500 });
  }
}
