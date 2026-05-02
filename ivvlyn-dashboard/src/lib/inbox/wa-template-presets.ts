/**
 * WhatsApp template composer presets (per tenant `client_id`).
 * Primary store: `wa_template_presets` via `/api/inbox/wa-template-presets`.
 * `localStorage` is used as a one-time migration source and offline fallback.
 */

export type WaTemplatePreset = {
  id: string;
  label: string;
  template_name: string;
  template_language: string;
  /** Raw textarea content — body variables one per line */
  params_lines: string;
  /** Header text variables (one per line), optional */
  header_params_lines?: string;
  /** Meta URL-button index (usually `"0"`) */
  url_button_index?: string;
  /** Single dynamic URL suffix / parameter for that button */
  url_button_suffix?: string;
  /** `image` \| `video` \| `document` — optional media header */
  header_media_kind?: string;
  header_media_url?: string;
  header_document_filename?: string;
};

export function waTemplatePresetStorageKey(clientId: string): string {
  return `ivvlyn:wa-template-presets:v1:${clientId}`;
}

export function loadWaTemplatePresets(clientId: string): WaTemplatePreset[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(waTemplatePresetStorageKey(clientId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x): x is WaTemplatePreset =>
        typeof x === "object" &&
        x !== null &&
        typeof (x as WaTemplatePreset).id === "string" &&
        typeof (x as WaTemplatePreset).template_name === "string"
    );
  } catch {
    return [];
  }
}

export function persistWaTemplatePresets(clientId: string, presets: WaTemplatePreset[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(waTemplatePresetStorageKey(clientId), JSON.stringify(presets));
  } catch {
    /* quota */
  }
}
