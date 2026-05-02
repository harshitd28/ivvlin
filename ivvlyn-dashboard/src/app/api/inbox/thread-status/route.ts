import { NextResponse } from "next/server";
import { assertLeadBelongsToClient, getClientProfileForUser } from "@/lib/inbox/assert-client-lead";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Set inbox **thread** open vs resolved by updating `conversation_status` on the **latest**
 * `conversations` row for the lead (matches Open / Resolved list filters).
 */
export async function PATCH(req: Request) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ ok: false }, { status: 500 });

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ ok: false }, { status: 401 });

  const prof = await getClientProfileForUser(supabase, userData.user.id);
  if ("error" in prof) return NextResponse.json({ ok: false, message: prof.error }, { status: prof.status });

  const body = (await req.json().catch(() => null)) as { lead_id?: string; status?: string } | null;
  const leadId = String(body?.lead_id ?? "").trim();
  const statusRaw = String(body?.status ?? "").trim().toLowerCase();
  const conversation_status = statusRaw === "resolved" ? "resolved" : statusRaw === "open" ? "open" : null;

  if (!leadId || !conversation_status) {
    return NextResponse.json({ ok: false, message: "lead_id and status (open | resolved) required" }, { status: 400 });
  }

  const okLead = await assertLeadBelongsToClient(supabase, prof.clientId, leadId);
  if (!okLead) return NextResponse.json({ ok: false, message: "Not found" }, { status: 404 });

  const { data: latest } = await supabase
    .from("conversations")
    .select("id")
    .eq("client_id", prof.clientId)
    .eq("lead_id", leadId)
    .order("timestamp", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const latestId = (latest as { id?: string } | null)?.id;
  if (!latestId) {
    return NextResponse.json({ ok: false, message: "No conversation rows for this lead yet" }, { status: 404 });
  }

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("conversations")
    .update({
      conversation_status,
      updated_at: now,
    })
    .eq("id", latestId)
    .eq("client_id", prof.clientId);

  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, conversation_id: latestId, conversation_status });
}
