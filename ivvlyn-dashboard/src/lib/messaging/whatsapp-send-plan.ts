import { extractTextPayload } from "@/lib/messaging/payload-text";

export type WhatsAppTemplateButtonComponent = {
  index: string;
  sub_type: "url" | "quick_reply";
  parameters: string[];
};

/** WhatsApp Cloud API template header (one variant per send). */
export type WhatsAppTemplateHeader =
  | { kind: "none" }
  | { kind: "text"; textParams: string[] }
  | { kind: "image"; link: string }
  | { kind: "video"; link: string }
  | { kind: "document"; link: string; filename: string | null };

export type WhatsAppSendPlan =
  | { kind: "text"; body: string }
  | {
      kind: "template";
      templateName: string;
      languageCode: string;
      bodyParams: string[];
      header: WhatsAppTemplateHeader;
      buttons: WhatsAppTemplateButtonComponent[];
      previewText: string;
    };

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string");
}

function parseTemplateHeader(o: Record<string, unknown>): WhatsAppTemplateHeader {
  const mediaUrl =
    typeof o.template_header_media_url === "string" ? o.template_header_media_url.trim() : "";
  const mediaKind =
    typeof o.template_header_media_kind === "string" ? o.template_header_media_kind.toLowerCase().trim() : "";

  if (mediaUrl && (mediaKind === "image" || mediaKind === "video" || mediaKind === "document")) {
    if (mediaKind === "image") return { kind: "image", link: mediaUrl };
    if (mediaKind === "video") return { kind: "video", link: mediaUrl };
    const fn =
      typeof o.template_header_document_filename === "string" && o.template_header_document_filename.trim()
        ? o.template_header_document_filename.trim()
        : null;
    return { kind: "document", link: mediaUrl, filename: fn };
  }

  const textParams = asStringArray(o.template_header_params)
    .map((s) => s.trim())
    .filter(Boolean);
  if (textParams.length > 0) return { kind: "text", textParams };
  return { kind: "none" };
}

function parseTemplateButtons(o: Record<string, unknown>): WhatsAppTemplateButtonComponent[] {
  const raw = o.template_buttons;
  if (!Array.isArray(raw)) return [];
  const out: WhatsAppTemplateButtonComponent[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const rec = item as Record<string, unknown>;
    const index = String(rec.index ?? "0");
    const sub = String(rec.sub_type ?? "url");
    if (sub !== "url" && sub !== "quick_reply") continue;
    const parameters = asStringArray(rec.parameters).map((s) => s.trim()).filter(Boolean);
    if (parameters.length === 0) continue;
    out.push({ index, sub_type: sub, parameters });
  }
  return out;
}

function headerPreview(h: WhatsAppTemplateHeader): string | null {
  if (h.kind === "none") return null;
  if (h.kind === "text") return `header: ${h.textParams.join(", ")}`;
  if (h.kind === "image") return "header: image";
  if (h.kind === "video") return "header: video";
  return "header: document";
}

/**
 * Derive how to send a WhatsApp job from stored JSON payload (1:1 enqueue or campaign fan-out).
 */
export function buildWhatsAppSendPlanFromPayload(payload: unknown): WhatsAppSendPlan | null {
  const text = extractTextPayload(payload);
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
    return text.trim() ? { kind: "text", body: text.trim() } : null;
  }
  const o = payload as Record<string, unknown>;
  const templateName =
    typeof o.template_name === "string" && o.template_name.trim() ? o.template_name.trim() : null;
  const forceText = o.whatsapp_kind === "text" || o.send_kind === "text";
  const isTemplate =
    o.whatsapp_kind === "template" || o.send_kind === "template" || (templateName !== null && !forceText);

  if (isTemplate && templateName) {
    const langRaw =
      typeof o.template_language === "string" && o.template_language.trim()
        ? o.template_language.trim()
        : "en_US";
    const bodyParams = asStringArray(o.template_body_params);
    const header = parseTemplateHeader(o);
    const buttons = parseTemplateButtons(o);
    const bits: string[] = [];
    const hp = headerPreview(header);
    if (hp) bits.push(hp);
    if (bodyParams.length) bits.push(bodyParams.join(" · "));
    if (buttons.length) bits.push(`${buttons.length} button(s)`);
    const previewText =
      text.trim() ||
      `[Template: ${templateName}]` + (bits.length ? ` · ${bits.join(" · ")}` : "");
    return {
      kind: "template",
      templateName,
      languageCode: langRaw,
      bodyParams,
      header,
      buttons,
      previewText,
    };
  }

  if (!text.trim()) return null;
  return { kind: "text", body: text.trim() };
}
