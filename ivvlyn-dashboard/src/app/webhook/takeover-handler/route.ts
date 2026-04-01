import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const payload = await req.json().catch(() => ({}));
  return NextResponse.json({ ok: true, received: payload }, { status: 200 });
}

