import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Heartbeat while agents are on the dashboard; requires `profiles.inbox_last_seen_at` (see migrations). */
export async function POST() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ ok: false }, { status: 500 });

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ ok: false }, { status: 401 });

  const now = new Date().toISOString();
  const { error } = await supabase.from("profiles").update({ inbox_last_seen_at: now }).eq("id", userData.user.id);

  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
