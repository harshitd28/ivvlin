import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { auth_key, sender_id } = (await req.json().catch(() => ({}))) as {
    auth_key?: string;
    sender_id?: string;
  };

  if (!auth_key || !sender_id) {
    return NextResponse.json({ success: false, message: "auth_key and sender_id are required" }, { status: 400 });
  }

  try {
    const res = await fetch("https://api.msg91.com/api/v5/flow/", {
      method: "GET",
      headers: {
        authkey: auth_key,
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json({ success: false, message: "MSG91 connection failed" }, { status: 200 });
    }

    return NextResponse.json({ success: true, message: "MSG91 connection successful" });
  } catch {
    return NextResponse.json({ success: false, message: "Unable to reach MSG91 API" }, { status: 200 });
  }
}
