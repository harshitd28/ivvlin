import { NextResponse } from "next/server";

/**
 * n8n / workflow → dashboard forwarded WhatsApp events.
 * Set `INTERNAL_INGEST_SECRET` and send `Authorization: Bearer <secret>`.
 */
export function assertInternalIngestSecret(req: Request): NextResponse | null {
  const secret = process.env.INTERNAL_INGEST_SECRET ?? "";
  if (!secret) {
    return NextResponse.json({ ok: false, message: "INTERNAL_INGEST_SECRET not configured" }, { status: 503 });
  }
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  return null;
}
