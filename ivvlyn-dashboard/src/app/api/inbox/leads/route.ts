import { NextResponse } from "next/server";
import { recordAuditEvent } from "@/lib/audit/record-audit";
import { assertLeadBelongsToClient, getClientProfileForUser } from "@/lib/inbox/assert-client-lead";
import { buildLeadTakeoverPatch } from "@/lib/leads/takeover-patch";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function PATCH(req: Request) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ ok: false }, { status: 500 });

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ ok: false }, { status: 401 });

  const prof = await getClientProfileForUser(supabase, userData.user.id);
  if ("error" in prof) return NextResponse.json({ ok: false, message: prof.error }, { status: prof.status });

  const body = (await req.json().catch(() => null)) as {
    lead_id?: string;
    assigned_to_user_id?: string | null;
    inbox_starred?: boolean;
    /** AI ↔ human with `takeover_at` / `handback_at` (same semantics as takeover webhook). */
    mode?: "ai" | "human";
  } | null;

  const leadId = String(body?.lead_id ?? "").trim();
  if (!leadId) return NextResponse.json({ ok: false, message: "lead_id required" }, { status: 400 });

  const ok = await assertLeadBelongsToClient(supabase, prof.clientId, leadId);
  if (!ok) return NextResponse.json({ ok: false, message: "Not found" }, { status: 404 });

  const patch: Record<string, unknown> = {};
  if ("assigned_to_user_id" in (body ?? {})) {
    const aid = body!.assigned_to_user_id;
    if (aid === null || aid === "") {
      patch.assigned_to_user_id = null;
    } else {
      const { data: teammate } = await supabase
        .from("profiles")
        .select("id")
        .eq("client_id", prof.clientId)
        .eq("id", aid)
        .maybeSingle();
      if (!(teammate as { id?: string } | null)?.id) {
        return NextResponse.json({ ok: false, message: "Invalid assignee" }, { status: 400 });
      }
      patch.assigned_to_user_id = aid;
    }
  }
  if (typeof body?.inbox_starred === "boolean") {
    patch.inbox_status = body.inbox_starred ? "pinned" : "open";
  }

  if (body?.mode === "ai" || body?.mode === "human") {
    const tp = buildLeadTakeoverPatch(body.mode, {
      assigned_to_user_id:
        "assigned_to_user_id" in patch ? (patch.assigned_to_user_id as string | null | undefined) : undefined,
    });
    Object.assign(patch, tp);
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ ok: false, message: "No updates" }, { status: 400 });
  }

  const { error } = await supabase.from("leads").update(patch).eq("client_id", prof.clientId).eq("lead_id", leadId);

  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });

  recordAuditEvent({
    actorUserId: userData.user.id,
    clientId: prof.clientId,
    action: "leads.patch",
    resourceType: "lead",
    resourceId: leadId,
    detail: { patch },
  });

  return NextResponse.json({ ok: true });
}
