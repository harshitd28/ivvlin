import { NextResponse } from "next/server";
import { assertLeadBelongsToClient, getClientProfileForUser } from "@/lib/inbox/assert-client-lead";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ ok: false }, { status: 500 });

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ ok: false }, { status: 401 });

  const prof = await getClientProfileForUser(supabase, userData.user.id);
  if ("error" in prof) return NextResponse.json({ ok: false, message: prof.error }, { status: prof.status });

  const url = new URL(req.url);
  const leadId = url.searchParams.get("lead_id")?.trim() ?? "";
  if (!leadId) return NextResponse.json({ ok: false, message: "lead_id required" }, { status: 400 });

  const ok = await assertLeadBelongsToClient(supabase, prof.clientId, leadId);
  if (!ok) return NextResponse.json({ ok: false, message: "Not found" }, { status: 404 });

  const { data, error } = await supabase
    .from("inbox_notes")
    .select("id, created_at, body, author_user_id")
    .eq("client_id", prof.clientId)
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false })
    .limit(80);

  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  const notes = (data ?? []).map((n) => {
    const row = n as { author_user_id?: string; author_id?: string };
    return { ...n, author_id: row.author_user_id ?? row.author_id };
  });
  return NextResponse.json({ ok: true, notes });
}

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ ok: false }, { status: 500 });

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ ok: false }, { status: 401 });

  const prof = await getClientProfileForUser(supabase, userData.user.id);
  if ("error" in prof) return NextResponse.json({ ok: false, message: prof.error }, { status: prof.status });

  const body = (await req.json().catch(() => null)) as { lead_id?: string; body?: string } | null;
  const leadId = String(body?.lead_id ?? "").trim();
  const text = String(body?.body ?? "").trim();
  if (!leadId || !text) return NextResponse.json({ ok: false, message: "lead_id and body required" }, { status: 400 });

  const ok = await assertLeadBelongsToClient(supabase, prof.clientId, leadId);
  if (!ok) return NextResponse.json({ ok: false, message: "Not found" }, { status: 404 });

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("inbox_notes")
    .insert({
      client_id: prof.clientId,
      lead_id: leadId,
      author_user_id: userData.user.id,
      body: text,
      is_internal: true,
      updated_at: now,
    })
    .select("id, created_at, body, author_user_id")
    .single();

  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  const row = data as { author_user_id?: string };
  return NextResponse.json({
    ok: true,
    note: { ...data, author_id: row.author_user_id },
  });
}
