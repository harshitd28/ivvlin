import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

type LeadsUpdater = {
  update: (payload: Record<string, unknown>) => {
    in: (column: string, values: string[]) => Promise<{ error: { message: string } | null }>;
  };
};

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });
    }

    const body = (await req.json().catch(() => null)) as {
      lead_ids?: string[];
      mode?: string;
      assigned_to?: string;
    } | null;

    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { lead_ids, mode, assigned_to } = body;

    if (!lead_ids || !Array.isArray(lead_ids) || lead_ids.length === 0) {
      return NextResponse.json({ error: "lead_ids required" }, { status: 400 });
    }

    if (!mode || !["ai", "human"].includes(mode)) {
      return NextResponse.json({ error: "mode must be ai or human" }, { status: 400 });
    }

    const updatePayload: Record<string, unknown> = {
      mode,
      ...(mode === "human" && assigned_to
        ? {
            assigned_to,
            takeover_at: new Date().toISOString(),
          }
        : {}),
      ...(mode === "ai"
        ? {
            handback_at: new Date().toISOString(),
          }
        : {}),
    };

    const leadsUpdater = supabase.from("leads") as unknown as LeadsUpdater;
    const { error } = await leadsUpdater.update(updatePayload).in("lead_id", lead_ids);

    if (error) {
      console.error("Bulk mode update error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      updated: lead_ids.length,
      mode,
    });
  } catch (err) {
    console.error("Bulk mode route error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

