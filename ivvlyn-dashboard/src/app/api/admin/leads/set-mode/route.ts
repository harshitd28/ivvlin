import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type LeadModeUpdater = {
  update: (payload: { mode: "ai" | "human" }) => {
    eq: (column: string, value: string) => Promise<{ error: { message: string } | null }>;
  };
};

export async function POST(req: Request) {
  const formData = await req.formData();
  const leadId = String(formData.get("leadId") ?? "");
  const mode = formData.get("mode");
  const redirectTo = String(formData.get("redirectTo") ?? "/admin/leads");

  if (!leadId || (mode !== "ai" && mode !== "human")) {
    return NextResponse.redirect(new URL(`${redirectTo}${redirectTo.includes("?") ? "&" : "?"}bulk=invalid`, req.url), 303);
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.redirect(new URL(`${redirectTo}${redirectTo.includes("?") ? "&" : "?"}bulk=env`, req.url), 303);
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData.session;
  if (!session) {
    return NextResponse.redirect(new URL("/login", req.url), 303);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", session.user.id)
    .maybeSingle();
  const role = (profile as { role?: string | null } | null)?.role ?? "client";
  if (role !== "admin") {
    return NextResponse.redirect(new URL(`${redirectTo}${redirectTo.includes("?") ? "&" : "?"}bulk=forbidden`, req.url), 303);
  }

  const leadsUpdater = supabase.from("leads") as unknown as LeadModeUpdater;
  const { error } = await leadsUpdater.update({ mode }).eq("lead_id", leadId);
  if (error) {
    return NextResponse.redirect(new URL(`${redirectTo}${redirectTo.includes("?") ? "&" : "?"}bulk=error`, req.url), 303);
  }

  const webhookUrl = new URL("/webhook/takeover-handler", req.url).toString();
  await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      lead_id: leadId,
      mode,
      source: "admin_row_mode",
      timestamp: new Date().toISOString(),
    }),
  }).catch(() => null);

  return NextResponse.redirect(new URL(`${redirectTo}${redirectTo.includes("?") ? "&" : "?"}bulk=ok_single`, req.url), 303);
}

