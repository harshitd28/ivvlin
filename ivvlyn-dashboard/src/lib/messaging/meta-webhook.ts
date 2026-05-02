import crypto from "node:crypto";

/** Meta `X-Hub-Signature-256` — raw request body bytes/string must match what Meta signed. */
export function verifyMetaSignature(appSecret: string, rawBody: string, signatureHeader: string | null): boolean {
  if (!signatureHeader || !signatureHeader.startsWith("sha256=")) return false;
  const expected =
    "sha256=" + crypto.createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex");
  const a = Buffer.from(signatureHeader);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function metaVerifyChallenge(searchParams: URLSearchParams, verifyToken: string): string | null {
  if (searchParams.get("hub.mode") !== "subscribe") return null;
  if (searchParams.get("hub.verify_token") !== verifyToken) return null;
  return searchParams.get("hub.challenge");
}

type UnknownRecord = Record<string, unknown>;

function asRecord(v: unknown): UnknownRecord | null {
  return v !== null && typeof v === "object" && !Array.isArray(v) ? (v as UnknownRecord) : null;
}

/** Collect WhatsApp message + status ids for idempotency. */
export function collectMetaWaIds(body: unknown): string[] {
  const root = asRecord(body);
  if (!root) return [];
  const entry = root.entry;
  if (!Array.isArray(entry)) return [];

  const ids: string[] = [];
  for (const e of entry) {
    const ent = asRecord(e);
    const changes = ent?.changes;
    if (!Array.isArray(changes)) continue;
    for (const c of changes) {
      const ch = asRecord(c);
      const value = asRecord(ch?.value);
      if (!value) continue;

      const messages = value.messages;
      if (Array.isArray(messages)) {
        for (const m of messages) {
          const msg = asRecord(m);
          const id = msg?.id;
          if (typeof id === "string" && id.length > 0) ids.push(`wa:msg:${id}`);
        }
      }

      const statuses = value.statuses;
      if (Array.isArray(statuses)) {
        for (const s of statuses) {
          const st = asRecord(s);
          const id = st?.id;
          if (typeof id === "string" && id.length > 0) ids.push(`wa:status:${id}`);
        }
      }
    }
  }
  return ids;
}

export function readPhoneNumberId(body: unknown): string | null {
  const root = asRecord(body);
  const entry = root?.entry;
  if (!Array.isArray(entry) || entry.length === 0) return null;
  const ent = asRecord(entry[0]);
  const changes = ent?.changes;
  if (!Array.isArray(changes) || changes.length === 0) return null;
  const ch = asRecord(changes[0]);
  const value = asRecord(ch?.value);
  const meta = asRecord(value?.metadata);
  const phoneNumberId = meta?.phone_number_id;
  return typeof phoneNumberId === "string" ? phoneNumberId : null;
}

export function mapWaStatusToLifecycle(status: string | null | undefined): "sent" | "delivered" | "read" | "failed" | null {
  if (!status) return null;
  const s = status.toLowerCase();
  if (s === "sent") return "sent";
  if (s === "delivered") return "delivered";
  if (s === "read") return "read";
  if (s === "failed") return "failed";
  return null;
}
