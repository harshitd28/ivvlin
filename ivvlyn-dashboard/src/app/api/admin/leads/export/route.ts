import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function csvEscape(value: unknown) {
  const s = String(value ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const clientId = url.searchParams.get("clientId");
  const channel = url.searchParams.get("channel") ?? "all";
  const scoreBand = url.searchParams.get("scoreBand") ?? "all";
  const stage = url.searchParams.get("stage") ?? "all";
  const q = (url.searchParams.get("q") ?? "").trim();

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return new NextResponse("Supabase is not configured", { status: 500 });
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData.session;
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", session.user.id)
    .maybeSingle();
  const role = (profile as { role?: string | null } | null)?.role ?? "client";
  if (role !== "admin") return new NextResponse("Forbidden", { status: 403 });

  let query = supabase
    .from("leads")
    .select("lead_id, client_id, name, preferred_channel, score, stage, status, mode, assigned_to, created_at")
    .order("created_at", { ascending: false })
    .limit(5000);

  if (clientId) query = query.eq("client_id", clientId);
  if (channel !== "all") query = query.eq("preferred_channel", channel);
  if (scoreBand === "hot") query = query.gte("score", 70);
  else if (scoreBand === "warm") query = query.gte("score", 40).lt("score", 70);
  else if (scoreBand === "cold") query = query.lt("score", 40);
  if (stage !== "all") query = query.eq("stage", stage);
  if (q) query = query.or(`name.ilike.%${q}%,lead_id.ilike.%${q}%`);

  const { data } = await query;
  const rows = (data ?? []) as Array<{
    lead_id: string;
    client_id: string;
    name: string | null;
    preferred_channel: string | null;
    score: number | null;
    stage: string | null;
    status: string | null;
    mode: string | null;
    assigned_to: string | null;
    created_at: string;
  }>;

  const header = ["lead_id", "client_id", "name", "preferred_channel", "score", "stage", "status", "mode", "assigned_to", "created_at"];
  const lines = [header.join(",")];
  for (const row of rows) {
    lines.push(
      [
        row.lead_id,
        row.client_id,
        row.name,
        row.preferred_channel,
        row.score,
        row.stage,
        row.status,
        row.mode,
        row.assigned_to,
        row.created_at,
      ]
        .map(csvEscape)
        .join(",")
    );
  }

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="admin-leads-export.csv"`,
    },
  });
}

