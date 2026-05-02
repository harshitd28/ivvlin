import { NextResponse } from "next/server";
import { assertLeadBelongsToClient, getClientProfileForUser } from "@/lib/inbox/assert-client-lead";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Rolled-out CRM schema has no `inbox_locked_*` on leads; keep route so UI does not 404.
 * Returns success without persisting (collision control can be reintroduced with `team_members` or a lock table).
 */
export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ ok: false }, { status: 500 });

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ ok: false }, { status: 401 });

  const prof = await getClientProfileForUser(supabase, userData.user.id);
  if ("error" in prof) return NextResponse.json({ ok: false, message: prof.error }, { status: prof.status });

  const body = (await req.json().catch(() => null)) as { lead_id?: string } | null;
  const leadId = String(body?.lead_id ?? "").trim();
  if (!leadId) return NextResponse.json({ ok: false, message: "lead_id required" }, { status: 400 });

  const okLead = await assertLeadBelongsToClient(supabase, prof.clientId, leadId);
  if (!okLead) return NextResponse.json({ ok: false, message: "Not found" }, { status: 404 });

  return NextResponse.json({
    ok: true,
    noop: true,
    message: "Thread lock not persisted; rolled-out schema uses team inbox without lead lock columns.",
  });
}
