import { addDays, format } from "date-fns";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import AnalyticsCharts from "@/components/dashboard/analytics/AnalyticsCharts";

export default async function AnalyticsPage() {
  const supabase = await createSupabaseServerClient();
  const now = new Date();
  if (!supabase) {
    return (
      <div className="p-8">
        <h1 className="text-[#0A0A0A] text-[20px] font-medium">Analytics</h1>
        <p className="text-[#555] text-[13px] mt-2">Configure Supabase env vars to load real data.</p>
      </div>
    );
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData.session;
  if (!session) {
    return (
      <div className="p-8">
        <h1 className="text-[#0A0A0A] text-[20px] font-medium">Analytics</h1>
        <p className="text-[#555] text-[13px] mt-2">Please sign in again.</p>
      </div>
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("client_id")
    .eq("id", session.user.id)
    .maybeSingle();

  const typedProfile = profile as unknown as { client_id?: string | null } | null;
  const clientId = typedProfile?.client_id ?? null;
  if (!clientId) {
    return (
      <div className="p-8">
        <h1 className="text-[#0A0A0A] text-[20px] font-medium">Analytics</h1>
        <p className="text-[#555] text-[13px] mt-2">No client linked to this account.</p>
      </div>
    );
  }

  const start7 = addDays(now, -6);
  start7.setHours(0, 0, 0, 0);
  const end7 = new Date(now);

  const start30 = addDays(now, -29);
  start30.setHours(0, 0, 0, 0);
  const end30 = new Date(now);

  const dayKeys = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(start7, i);
    return format(d, "yyyy-MM-dd");
  });

  // Lead volume
  const { data: leadRows } = await supabase
    .from("leads")
    .select("created_at")
    .eq("client_id", clientId)
    .gte("created_at", start7.toISOString());

  const leadsTyped = (leadRows ?? []) as unknown as Array<{ created_at: string }>;
  const leadVolumeMap = new Map<string, number>();
  for (const k of dayKeys) leadVolumeMap.set(k, 0);
  for (const r of leadsTyped) {
    const key = format(new Date(r.created_at), "yyyy-MM-dd");
    leadVolumeMap.set(key, (leadVolumeMap.get(key) ?? 0) + 1);
  }

  const leadVolume = dayKeys.map((k) => ({
    date: format(new Date(`${k}T00:00:00`), "MMM d"),
    count: leadVolumeMap.get(k) ?? 0,
  }));

  // Sources (last 30 days)
  const { data: sourcesRows } = await supabase
    .from("leads")
    .select("source")
    .eq("client_id", clientId)
    .gte("created_at", start30.toISOString());

  const sourcesTyped = (sourcesRows ?? []) as unknown as Array<{ source: string | null }>;
  const sourceCounts = new Map<string, number>();
  for (const r of sourcesTyped) {
    const s = (r.source ?? "Other").trim() || "Other";
    sourceCounts.set(s, (sourceCounts.get(s) ?? 0) + 1);
  }
  const sources = Array.from(sourceCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([source, count]) => ({ source, count }));

  // Score bins (last 30 days)
  const { data: scoreRows } = await supabase
    .from("leads")
    .select("score")
    .eq("client_id", clientId)
    .gte("created_at", start30.toISOString());

  const scoreTyped = (scoreRows ?? []) as unknown as Array<{ score: number | null }>;
  const bins = [
    { label: "0-20", min: 0, max: 20 },
    { label: "20-40", min: 20, max: 40 },
    { label: "40-60", min: 40, max: 60 },
    { label: "60-80", min: 60, max: 80 },
    { label: "80-100", min: 80, max: 101 },
  ];
  const binCounts = bins.map((b) => ({ bin: b.label, count: 0 }));
  for (const r of scoreTyped) {
    const s = r.score ?? 0;
    for (const b of bins) {
      if (s >= b.min && s < b.max) {
        const idx = binCounts.findIndex((x) => x.bin === b.label);
        binCounts[idx] = { bin: b.label, count: binCounts[idx].count + 1 };
        break;
      }
    }
  }

  const scoreBins = binCounts.map((x) => ({ bin: x.bin, count: x.count }));

  // Channel performance (sent messages, last 7 days)
  const { data: convRows } = await supabase
    .from("conversations")
    .select("created_at, channel, direction")
    .eq("client_id", clientId)
    .eq("direction", "outbound")
    .gte("created_at", start7.toISOString());

  const convTyped = (convRows ?? []) as unknown as Array<{ created_at: string; channel: "whatsapp" | "instagram"; direction: string }>;
  const perfMap = new Map<string, { whatsapp: number; instagram: number }>();
  for (const k of dayKeys) perfMap.set(k, { whatsapp: 0, instagram: 0 });

  for (const c of convTyped) {
    const key = format(new Date(c.created_at), "yyyy-MM-dd");
    const cur = perfMap.get(key) ?? { whatsapp: 0, instagram: 0 };
    if (c.channel === "instagram") cur.instagram += 1;
    else cur.whatsapp += 1;
    perfMap.set(key, cur);
  }

  const channelPerformance = dayKeys.map((k) => ({
    date: format(new Date(`${k}T00:00:00`), "MMM d"),
    whatsapp: perfMap.get(k)?.whatsapp ?? 0,
    instagram: perfMap.get(k)?.instagram ?? 0,
  }));

  return (
    <div className="p-8 pt-0">
      <div>
        <h1 className="text-[#0A0A0A] text-[20px] font-medium">Analytics</h1>
        <p className="text-[#555] text-[13px] mt-2">Charts from your activity and leads.</p>
      </div>

      <div className="mt-6">
        <AnalyticsCharts
          leadVolume={leadVolume}
          sources={sources}
          scoreBins={scoreBins}
          channelPerformance={channelPerformance}
        />
      </div>
    </div>
  );
}

