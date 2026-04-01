import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function requiredEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ ok: false, message: "Supabase not configured" }, { status: 500 });

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", userData.user.id).maybeSingle();
  const role = (profile as { role?: string | null } | null)?.role ?? "client";
  if (role !== "admin") return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ ok: false, message: "Invalid payload" }, { status: 400 });

  const businessName = String(body.business_name ?? "").trim();
  const clientEmail = String(body.client_email ?? "").trim().toLowerCase();
  const tempPassword = String(body.temp_password ?? "").trim();

  if (!businessName || !clientEmail || !tempPassword) {
    return NextResponse.json({ ok: false, message: "business_name, client_email and temp_password are required" }, { status: 400 });
  }

  const service = createClient(requiredEnv("NEXT_PUBLIC_SUPABASE_URL"), requiredEnv("SUPABASE_SERVICE_ROLE_KEY"));

  const clientPayload = {
    business_name: businessName,
    agent_name: String(body.agent_name ?? "Vaani"),
    industry: String(body.industry ?? "Other"),
    city: String(body.city ?? ""),
    state: String(body.state ?? ""),
    status: "active",
    whatsapp_enabled: Boolean(body.whatsapp_enabled),
    whatsapp_phone_id: String(body.whatsapp_phone_id ?? ""),
    whatsapp_access_token: String(body.whatsapp_access_token ?? ""),
    instagram_enabled: Boolean(body.instagram_enabled),
    instagram_page_id: String(body.instagram_page_id ?? ""),
    instagram_access_token: String(body.instagram_access_token ?? ""),
    facebook_enabled: Boolean(body.facebook_enabled),
    facebook_page_id: String(body.facebook_page_id ?? ""),
    facebook_access_token: String(body.facebook_access_token ?? ""),
    sms_enabled: Boolean(body.sms_enabled),
    msg91_auth_key: String(body.msg91_auth_key ?? ""),
    msg91_sender_id: String(body.msg91_sender_id ?? ""),
    email_enabled: Boolean(body.email_enabled),
    salesperson_phone: String(body.salesperson_phone ?? ""),
    owner_email: String(body.owner_email ?? ""),
    briefing_time: String(body.briefing_time ?? "09:00"),
    alert_score_threshold: Number(body.alert_score_threshold ?? 70),
    claude_model: String(body.claude_model ?? "claude-haiku-4-5-20251001"),
    max_tokens: Number(body.max_tokens ?? 600),
    system_prompt: String(body.system_prompt ?? ""),
  };

  const { data: createdClient, error: clientErr } = await service
    .from("clients")
    .insert(clientPayload)
    .select("id")
    .single();

  if (clientErr || !createdClient?.id) {
    return NextResponse.json({ ok: false, message: "Failed to create client row" }, { status: 500 });
  }

  const { data: createdUser, error: userErr } = await service.auth.admin.createUser({
    email: clientEmail,
    password: tempPassword,
    email_confirm: true,
  });

  if (userErr || !createdUser.user?.id) {
    await service.from("clients").delete().eq("id", createdClient.id);
    return NextResponse.json({ ok: false, message: "Failed to create auth user" }, { status: 500 });
  }

  const { error: profileErr } = await service.from("profiles").insert({
    id: createdUser.user.id,
    email: clientEmail,
    role: "client",
    client_id: createdClient.id,
    full_name: String(body.full_name ?? ""),
  });

  if (profileErr) {
    await service.auth.admin.deleteUser(createdUser.user.id);
    await service.from("clients").delete().eq("id", createdClient.id);
    return NextResponse.json({ ok: false, message: "Failed to create profile row" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    clientId: createdClient.id,
    login: {
      url: "https://dashboard.ivvlyn.com/login",
      email: clientEmail,
      password: tempPassword,
    },
  });
}
