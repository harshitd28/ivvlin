import { endOfMonth, format, parse } from "date-fns";
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
  const now = new Date();
  const month = url.searchParams.get("month");
  const selected = month && /^\d{4}-\d{2}$/.test(month) ? month : format(now, "yyyy-MM");
  const selectedDate = parse(`${selected}-01`, "yyyy-MM-dd", new Date());
  const monthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
  const monthEnd = endOfMonth(monthStart);

  const clientId = url.searchParams.get("clientId") ?? "all";
  const channel = url.searchParams.get("channel") ?? "all";
  const logType = (url.searchParams.get("logType") ?? "").trim() || "all";

  const supabase = await createSupabaseServerClient();
  if (!supabase) return new NextResponse("Supabase is not configured", { status: 500 });

  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) return new NextResponse("Unauthorized", { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", sessionData.session.user.id)
    .maybeSingle();
  const role = (profile as { role?: string | null } | null)?.role ?? "client";
  if (role !== "admin") return new NextResponse("Forbidden", { status: 403 });

  const untyped = supabase as unknown as {
    from: (table: string) => {
      select: (fields: string) => {
        gte: (field: string, value: string) => {
          lte: (field: string, value: string) => {
            eq: (field: string, value: string) => unknown;
            limit: (count: number) => Promise<{ data: Array<Record<string, unknown>> | null }>;
          };
        };
      };
    };
  };

  let builder = untyped
    .from("credit_logs")
    .select("id, client_id, log_type, channel, tokens_used, created_at")
    .gte("created_at", monthStart.toISOString())
    .lte("created_at", monthEnd.toISOString()) as unknown as {
    eq: (field: string, value: string) => typeof builder;
    limit: (count: number) => Promise<{ data: Array<Record<string, unknown>> | null }>;
  };

  if (clientId !== "all") builder = builder.eq("client_id", clientId);
  if (channel !== "all") builder = builder.eq("channel", channel);
  if (logType !== "all") builder = builder.eq("log_type", logType);

  const { data } = await builder.limit(10000);
  const rows = (data ?? []) as Array<{
    id: string;
    client_id: string | null;
    log_type: string | null;
    channel: string | null;
    tokens_used: number | null;
    created_at: string;
  }>;

  const header = ["id", "client_id", "log_type", "channel", "tokens_used", "created_at"];
  const lines = [header.join(",")];
  for (const row of rows) {
    lines.push(
      [row.id, row.client_id, row.log_type, row.channel, row.tokens_used, row.created_at]
        .map(csvEscape)
        .join(",")
    );
  }

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="credit-logs-${selected}.csv"`,
    },
  });
}

