import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { page_id, access_token } = (await req.json().catch(() => ({}))) as {
    page_id?: string;
    access_token?: string;
  };

  if (!page_id || !access_token) {
    return NextResponse.json({ success: false, message: "page_id and access_token are required" }, { status: 400 });
  }

  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${encodeURIComponent(page_id)}?fields=id,name`, {
      headers: { Authorization: `Bearer ${access_token}` },
      cache: "no-store",
    });
    if (!res.ok) {
      return NextResponse.json({ success: false, message: "Facebook connection failed" }, { status: 200 });
    }
    return NextResponse.json({ success: true, message: "Facebook connection successful" });
  } catch {
    return NextResponse.json({ success: false, message: "Unable to reach Facebook API" }, { status: 200 });
  }
}
