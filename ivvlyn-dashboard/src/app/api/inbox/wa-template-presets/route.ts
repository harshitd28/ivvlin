import { NextResponse } from "next/server";
import { getClientProfileForUser } from "@/lib/inbox/assert-client-lead";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { WaTemplatePreset } from "@/lib/inbox/wa-template-presets";

function rowToPreset(row: {
  id: string;
  label: string;
  template_name: string;
  template_language: string;
  params_lines: string;
  header_params_lines?: string | null;
  url_button_index?: string | null;
  url_button_suffix?: string | null;
  header_media_kind?: string | null;
  header_media_url?: string | null;
  header_document_filename?: string | null;
}): WaTemplatePreset {
  return {
    id: row.id,
    label: row.label,
    template_name: row.template_name,
    template_language: row.template_language,
    params_lines: row.params_lines ?? "",
    header_params_lines: row.header_params_lines ?? "",
    url_button_index: row.url_button_index ?? "",
    url_button_suffix: row.url_button_suffix ?? "",
    header_media_kind: row.header_media_kind ?? "",
    header_media_url: row.header_media_url ?? "",
    header_document_filename: row.header_document_filename ?? "",
  };
}

export async function GET() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ ok: false }, { status: 500 });

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ ok: false }, { status: 401 });

  const prof = await getClientProfileForUser(supabase, userData.user.id);
  if ("error" in prof) return NextResponse.json({ ok: false, message: prof.error }, { status: prof.status });

  const { data, error } = await supabase
    .from("wa_template_presets")
    .select(
      "id, label, template_name, template_language, params_lines, header_params_lines, url_button_index, url_button_suffix, header_media_kind, header_media_url, header_document_filename, sort_order, created_at"
    )
    .eq("client_id", prof.clientId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }

  const presets = (data ?? []).map((r) => rowToPreset(r as Parameters<typeof rowToPreset>[0]));
  return NextResponse.json({ ok: true, presets });
}

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ ok: false }, { status: 500 });

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ ok: false }, { status: 401 });

  const prof = await getClientProfileForUser(supabase, userData.user.id);
  if ("error" in prof) return NextResponse.json({ ok: false, message: prof.error }, { status: prof.status });

  const body = (await req.json().catch(() => null)) as {
    label?: string;
    template_name?: string;
    template_language?: string;
    params_lines?: string;
    header_params_lines?: string;
    url_button_index?: string;
    url_button_suffix?: string;
    header_media_kind?: string;
    header_media_url?: string;
    header_document_filename?: string;
  } | null;

  const template_name = String(body?.template_name ?? "").trim();
  if (!template_name) {
    return NextResponse.json({ ok: false, message: "template_name required" }, { status: 400 });
  }

  const label = String(body?.label ?? "").trim() || template_name;
  const template_language = String(body?.template_language ?? "en_US").trim() || "en_US";
  const params_lines = typeof body?.params_lines === "string" ? body.params_lines : "";
  const header_params_lines = typeof body?.header_params_lines === "string" ? body.header_params_lines : "";
  const url_button_index = typeof body?.url_button_index === "string" ? body.url_button_index.trim() : "";
  const url_button_suffix = typeof body?.url_button_suffix === "string" ? body.url_button_suffix : "";
  const header_media_kind = typeof body?.header_media_kind === "string" ? body.header_media_kind.trim() : "";
  const header_media_url = typeof body?.header_media_url === "string" ? body.header_media_url : "";
  const header_document_filename =
    typeof body?.header_document_filename === "string" ? body.header_document_filename : "";

  const { data: maxRow } = await supabase
    .from("wa_template_presets")
    .select("sort_order")
    .eq("client_id", prof.clientId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextSort = typeof (maxRow as { sort_order?: number } | null)?.sort_order === "number"
    ? ((maxRow as { sort_order: number }).sort_order + 1)
    : 0;

  const { data: inserted, error } = await supabase
    .from("wa_template_presets")
    .insert({
      client_id: prof.clientId,
      created_by: userData.user.id,
      label,
      template_name,
      template_language,
      params_lines,
      header_params_lines,
      url_button_index,
      url_button_suffix,
      header_media_kind,
      header_media_url,
      header_document_filename,
      sort_order: nextSort,
    })
    .select(
      "id, label, template_name, template_language, params_lines, header_params_lines, url_button_index, url_button_suffix, header_media_kind, header_media_url, header_document_filename"
    )
    .single();

  if (error || !inserted) {
    return NextResponse.json({ ok: false, message: error?.message ?? "Insert failed" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    preset: rowToPreset(inserted as Parameters<typeof rowToPreset>[0]),
  });
}

export async function DELETE(req: Request) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ ok: false }, { status: 500 });

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ ok: false }, { status: 401 });

  const prof = await getClientProfileForUser(supabase, userData.user.id);
  if ("error" in prof) return NextResponse.json({ ok: false, message: prof.error }, { status: prof.status });

  const id = new URL(req.url).searchParams.get("id")?.trim();
  if (!id) return NextResponse.json({ ok: false, message: "id required" }, { status: 400 });

  const { error } = await supabase.from("wa_template_presets").delete().eq("client_id", prof.clientId).eq("id", id);

  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
