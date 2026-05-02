import { NextResponse } from "next/server";

/**
 * Internal cron + `/api/cron/*` — expects `Authorization: Bearer <CRON_SECRET>`.
 */
export function assertCronSecret(req: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET ?? "";
  if (!secret) {
    return NextResponse.json({ ok: false, message: "CRON_SECRET not configured" }, { status: 503 });
  }
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  return null;
}
