"use client";

import { useMemo, useState } from "react";
import type { Visit } from "@/lib/types";
import { format, addDays, startOfWeek } from "date-fns";
import VisitStatusPill from "@/components/dashboard/VisitStatusPill";
import { Button } from "@/components/ui/button";
import { CalendarDays, List } from "lucide-react";

type Props = {
  visits: Visit[];
  weekStart?: Date;
};

function parseVisitDate(visit: Visit) {
  // visit_date is YYYY-MM-DD
  return visit.visit_date ? new Date(`${visit.visit_date}T00:00:00`) : null;
}

export default function VisitCalendar({ visits, weekStart }: Props) {
  const [mode, setMode] = useState<"week" | "list">("week");

  const effectiveStart = useMemo(() => {
    const base = weekStart ?? new Date();
    // startOfWeek defaults to Sunday in JS; we accept it for now.
    return startOfWeek(base);
  }, [weekStart]);

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(effectiveStart, i)), [effectiveStart]);

  const visitsByDay = useMemo(() => {
    const m = new Map<string, Visit[]>();
    for (const v of visits) {
      const d = parseVisitDate(v);
      if (!d) continue;
      const key = format(d, "yyyy-MM-dd");
      const arr = m.get(key) ?? [];
      arr.push(v);
      m.set(key, arr);
    }
    for (const [k, arr] of m.entries()) {
      arr.sort((a, b) => (a.visit_time ?? "").localeCompare(b.visit_time ?? ""));
      m.set(k, arr);
    }
    return m;
  }, [visits]);

  return (
    <div className="border border-[#E8E8E8] rounded-xl p-5">
      <div className="flex items-center justify-between gap-4">
        <div className="text-[#555] text-[11px] uppercase tracking-[0.2em] font-semibold">Visit Calendar</div>
        <div className="flex items-center gap-2">
          <Button
            variant={mode === "week" ? "secondary" : "ghost"}
            className="rounded-lg"
            onClick={() => setMode("week")}
          >
            <CalendarDays className="h-4 w-4 mr-2" />
            Week
          </Button>
          <Button
            variant={mode === "list" ? "secondary" : "ghost"}
            className="rounded-lg"
            onClick={() => setMode("list")}
          >
            <List className="h-4 w-4 mr-2" />
            List
          </Button>
        </div>
      </div>

      {mode === "list" ? (
        <div className="mt-5 space-y-3">
          {visits.length === 0 ? (
            <div className="text-[#444] text-[13px] text-center py-10">No visits scheduled.</div>
          ) : (
            visits
              .slice()
              .sort((a, b) => {
                const ad = a.visit_date ? new Date(`${a.visit_date}T00:00:00`).getTime() : 0;
                const bd = b.visit_date ? new Date(`${b.visit_date}T00:00:00`).getTime() : 0;
                return ad - bd;
              })
              .map((v) => (
                <div key={v.id} className="flex items-center justify-between gap-4 border border-[#E8E8E8] rounded-xl px-4 py-3">
                  <div className="text-[#0A0A0A] text-[13px] font-medium">
                    {v.visit_date} {v.visit_time ? `· ${v.visit_time}` : ""}
                  </div>
                  <div className="text-[#555] text-[13px] truncate flex-1">{v.lead_name ?? "Lead"} — {v.property ?? "Property"}</div>
                  <VisitStatusPill status={v.status} />
                </div>
              ))
          )}
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-4">
          {weekDays.map((d) => {
            const key = format(d, "yyyy-MM-dd");
            const dayVisits = visitsByDay.get(key) ?? [];
            return (
              <div key={key} className="rounded-lg border border-[#E8E8E8] overflow-hidden bg-[#FAFAF8]">
                <div className="px-3 py-2 text-[#555] text-[11px] uppercase tracking-[0.2em] font-semibold">
                  {format(d, "EEE")}
                </div>
                <div className="px-3 pb-3 space-y-2">
                  {dayVisits.length === 0 ? (
                    <div className="text-[#444] text-[12px] py-2">—</div>
                  ) : (
                    dayVisits.map((v) => (
                      <div key={v.id} className="border border-[#E8E8E8] rounded-lg px-3 py-2">
                        <div className="text-[#0A0A0A] text-[12px] font-medium truncate">{v.lead_name ?? "Lead"}</div>
                        <div className="text-[#16A34A] text-[11px] mt-1">
                          {v.visit_time ?? ""} {v.property ? `· ${v.property}` : ""}
                        </div>
                        <div className="mt-2">
                          <VisitStatusPill status={v.status} />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

