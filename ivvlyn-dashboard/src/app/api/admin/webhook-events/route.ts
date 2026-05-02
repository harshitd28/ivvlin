import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const MAX_LIMIT = 500;
const DEFAULT_LIMIT = 200;

export async function GET(req: Request) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, message: "Supabase is not configured" }, { status: 500 });
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData.session;
  if (!session) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", session.user.id)
    .maybeSingle();
  const role = (profile as { role?: string | null } | null)?.role ?? "client";
  if (role !== "admin") {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const scopeRaw = (url.searchParams.get("scope") ?? "orphan").toLowerCase();
  const scope = scopeRaw === "all" ? "all" : "orphan";

  const limitRaw = Number(url.searchParams.get("limit") ?? DEFAULT_LIMIT);
  const limit = Math.max(1, Math.min(MAX_LIMIT, Number.isFinite(limitRaw) ? limitRaw : DEFAULT_LIMIT));

  let q = supabase
    .from("webhook_delivery_events")
    .select("id, created_at, client_id, source, event_kind, outcome, error_message, detail")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (scope === "orphan") {
    q = q.is("client_id", null);
  }

  const { data, error } = await q;

  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    scope,
    limit,
    events: data ?? [],
  });
}
