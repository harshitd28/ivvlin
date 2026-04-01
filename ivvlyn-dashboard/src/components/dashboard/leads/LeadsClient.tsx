"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Lead, Channel } from "@/lib/types";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import ScoreBar from "@/components/dashboard/ScoreBar";
import LeadStatusPill from "@/components/dashboard/LeadStatusPill";
import ChannelBadge from "@/components/dashboard/ChannelBadge";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";

type Props = {
  leads: Lead[];
  counts: {
    all: number;
    hot: number;
    warm: number;
    cold: number;
    lost: number;
  };
};

type TabKey = "all" | "hot" | "warm" | "cold" | "lost";
type SortKey = "newest" | "score" | "last_active" | "visit_date";
type ChannelKey = "all" | Channel;

function lastContactForLead(lead: Lead) {
  return lead.last_contact ?? lead.last_reply_at ?? lead.created_at ?? null;
}

function tabMatches(lead: Lead, tab: TabKey) {
  if (tab === "all") return true;
  if (tab === "lost") return lead.status === "lost";

  const score = typeof lead.score === "number" ? lead.score : 0;
  if (tab === "hot") return lead.status === "hot" || score >= 70;
  if (tab === "warm") return lead.status === "warm" || (score >= 50 && score < 70);
  if (tab === "cold") return lead.status === "cold" || score < 50;

  return true;
}

function interestPills(lead: Lead) {
  return [
    lead.budget ? `Budget: ${lead.budget}` : null,
    lead.bhk_preference ? `BHK: ${lead.bhk_preference}` : null,
    lead.location_preference ? `Loc: ${lead.location_preference}` : null,
  ].filter((v): v is string => typeof v === "string");
}

export default function LeadsClient({ leads, counts }: Props) {
  const router = useRouter();

  const [tab, setTab] = useState<TabKey>("all");
  const [channelFilter, setChannelFilter] = useState<ChannelKey>("all");
  const [sortKey, setSortKey] = useState<SortKey>("newest");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    let list = leads.filter((l) => tabMatches(l, tab));

    if (channelFilter !== "all") {
      list = list.filter((l) => l.channel === channelFilter);
    }

    if (q.length) {
      list = list.filter((l) => {
        const n = (l.name ?? "").toLowerCase();
        const p = (l.phone ?? "").toLowerCase();
        return n.includes(q) || p.includes(q);
      });
    }

    list = [...list];
    list.sort((a, b) => {
      if (sortKey === "score") return (b.score ?? 0) - (a.score ?? 0);
      if (sortKey === "last_active") {
        const at = lastContactForLead(a) ? new Date(lastContactForLead(a) as string).getTime() : 0;
        const bt = lastContactForLead(b) ? new Date(lastContactForLead(b) as string).getTime() : 0;
        return bt - at;
      }
      if (sortKey === "visit_date") {
        const av = a.visit_date ? new Date(`${a.visit_date}T00:00:00`).getTime() : 0;
        const bv = b.visit_date ? new Date(`${b.visit_date}T00:00:00`).getTime() : 0;
        return bv - av;
      }
      // newest
      const at = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bt = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bt - at;
    });

    return list;
  }, [leads, tab, channelFilter, sortKey, query]);

  return (
    <div className="p-0">
      <div className="sticky top-0 z-10 bg-[#FAFAF8] border-b border-[#E8E8E8] px-8 py-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex-1 min-w-0">
            <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
              <TabsList className="bg-transparent p-0 h-auto">
                <TabsTrigger value="all" className="px-3 py-2 text-[13px]">
                  All ({counts.all})
                </TabsTrigger>
                <TabsTrigger value="hot" className="px-3 py-2 text-[13px]">
                  Hot ({counts.hot})
                </TabsTrigger>
                <TabsTrigger value="warm" className="px-3 py-2 text-[13px]">
                  Warm ({counts.warm})
                </TabsTrigger>
                <TabsTrigger value="cold" className="px-3 py-2 text-[13px]">
                  Cold ({counts.cold})
                </TabsTrigger>
                <TabsTrigger value="lost" className="px-3 py-2 text-[13px]">
                  Lost ({counts.lost})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="w-full md:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="w-full sm:w-[200px]">
              <Select value={channelFilter} onValueChange={(v) => setChannelFilter(v as ChannelKey)}>
                <SelectTrigger className="h-10 rounded-lg bg-transparent border border-[#E8E8E8]">
                  <SelectValue placeholder="All Channels" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-[#E8E8E8]">
                  <SelectItem value="all">All Channels</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-full sm:w-[230px]">
              <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
                <SelectTrigger className="h-10 rounded-lg bg-transparent border border-[#E8E8E8]">
                  <SelectValue placeholder="Newest First" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-[#E8E8E8]">
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="score">Score: High to Low</SelectItem>
                  <SelectItem value="last_active">Last Active</SelectItem>
                  <SelectItem value="visit_date">Visit Date</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-full sm:w-[260px]">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name or phone"
                className="h-10 rounded-lg bg-transparent border border-[#E8E8E8]"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="px-8 py-6">
        {filtered.length === 0 ? (
          <div className="text-center text-[#444] text-[13px] border border-[#E8E8E8] rounded-xl p-10">
            No leads found.
          </div>
        ) : (
          <>
          <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-[#E8E8E8]">
                <TableHead className="text-[#777] text-[11px] uppercase tracking-[0.14em] font-semibold">Lead</TableHead>
                <TableHead className="text-[#777] text-[11px] uppercase tracking-[0.14em] font-semibold">Score</TableHead>
                <TableHead className="text-[#777] text-[11px] uppercase tracking-[0.14em] font-semibold">Status</TableHead>
                <TableHead className="text-[#777] text-[11px] uppercase tracking-[0.14em] font-semibold">Channel</TableHead>
                <TableHead className="text-[#777] text-[11px] uppercase tracking-[0.14em] font-semibold">Source</TableHead>
                <TableHead className="text-[#777] text-[11px] uppercase tracking-[0.14em] font-semibold">Last Contact</TableHead>
                <TableHead className="text-[#777] text-[11px] uppercase tracking-[0.14em] font-semibold">Interest</TableHead>
                <TableHead className="text-[#777] text-[11px] uppercase tracking-[0.14em] font-semibold text-right">Action</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filtered.map((l) => {
                const last = lastContactForLead(l);
                const timeAgo = last ? formatDistanceToNow(new Date(last), { addSuffix: false }) : "—";
                const interest = interestPills(l);
                return (
                  <TableRow
                    key={l.lead_id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/dashboard/leads/${encodeURIComponent(l.lead_id)}`)}
                  >
                    <TableCell className="text-[#0A0A0A] font-medium">
                      <div>{l.name ?? "Lead"}</div>
                      <div className="text-[#555] text-[12px] mt-1">{l.phone ?? ""}</div>
                    </TableCell>

                    <TableCell>
                      <ScoreBar score={typeof l.score === "number" ? l.score : 0} />
                    </TableCell>

                    <TableCell>
                      <LeadStatusPill status={l.status} />
                    </TableCell>

                    <TableCell>
                      <ChannelBadge channel={l.channel} />
                    </TableCell>

                    <TableCell className="text-[#555]">{l.source ?? "—"}</TableCell>

                    <TableCell className="text-[#555]">{timeAgo} ago</TableCell>

                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        {interest.slice(0, 3).map((p) => (
                          <span key={p} className="text-[11px] text-[#555] border border-[#E8E8E8] rounded-full px-3 py-1">
                            {p}
                          </span>
                        ))}
                        {interest.length === 0 ? <span className="text-[#555] text-[12px]">—</span> : null}
                      </div>
                    </TableCell>

                    <TableCell className="text-right">
                      <Button
                        variant="secondary"
                        className="rounded-lg"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/dashboard/leads/${encodeURIComponent(l.lead_id)}`);
                        }}
                      >
                        View →
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          </div>
          <div className="md:hidden space-y-3">
            {filtered.map((l) => {
              const last = lastContactForLead(l);
              const timeAgo = last ? formatDistanceToNow(new Date(last), { addSuffix: false }) : "—";
              const interest = interestPills(l);
              return (
                <div key={l.lead_id} className="border border-[#E8E8E8] rounded-xl p-3 bg-white">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[14px] font-medium text-[#111] truncate">{l.name ?? "Lead"}</div>
                      <div className="text-[12px] text-[#555] mt-1">{l.phone ?? ""}</div>
                    </div>
                    <LeadStatusPill status={l.status} />
                  </div>
                  <div className="mt-2 inline-flex items-center gap-2">
                    <ChannelBadge channel={l.channel} />
                  </div>
                  <div className="mt-2"><ScoreBar score={typeof l.score === "number" ? l.score : 0} /></div>
                  <div className="mt-2 text-[12px] text-[#555]">{l.source ?? "—"} · {timeAgo} ago</div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {interest.slice(0, 3).map((p) => (
                      <span key={p} className="text-[11px] text-[#555] border border-[#E8E8E8] rounded-full px-2 py-0.5">
                        {p}
                      </span>
                    ))}
                  </div>
                  <div className="mt-3">
                    <Button
                      variant="secondary"
                      className="rounded-lg"
                      onClick={() => router.push(`/dashboard/leads/${encodeURIComponent(l.lead_id)}`)}
                    >
                      View →
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
          </>
        )}
      </div>
    </div>
  );
}

