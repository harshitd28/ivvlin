export function extractTextPayload(payload: unknown): string {
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) return "";
  const o = payload as Record<string, unknown>;
  const text = o.text;
  if (typeof text === "string") return text;
  const body = o.body;
  if (typeof body === "string") return body;
  return "";
}
