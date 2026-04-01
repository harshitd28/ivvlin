import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { phone_id, access_token } = (await req.json().catch(() => ({}))) as {
    phone_id?: string;
    access_token?: string;
  };

  if (!phone_id || !access_token) {
    return NextResponse.json({ success: false, message: "phone_id and access_token are required" }, { status: 400 });
  }

  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${encodeURIComponent(phone_id)}?fields=id`, {
      headers: { Authorization: `Bearer ${access_token}` },
      cache: "no-store",
    });
    if (!res.ok) {
      return NextResponse.json({ success: false, message: "WhatsApp connection failed" }, { status: 200 });
    }
    return NextResponse.json({ success: true, message: "WhatsApp connection successful" });
  } catch {
    return NextResponse.json({ success: false, message: "Unable to reach WhatsApp API" }, { status: 200 });
  }
}
