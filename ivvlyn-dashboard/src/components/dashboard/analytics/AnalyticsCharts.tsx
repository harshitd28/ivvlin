"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Area,
  BarChart,
  Bar,
} from "recharts";
import type { Channel } from "@/lib/types";

type LeadVolumePoint = { date: string; count: number };
type SourcePoint = { source: string; count: number };
type ScoreBinPoint = { bin: string; count: number };
type ChannelPerfPoint = { date: string; whatsapp: number; instagram: number };

type Props = {
  leadVolume: LeadVolumePoint[];
  sources: SourcePoint[];
  scoreBins: ScoreBinPoint[];
  channelPerformance: ChannelPerfPoint[];
};

export default function AnalyticsCharts({
  leadVolume,
  sources,
  scoreBins,
  channelPerformance,
}: Props) {
  return (
    <div className="space-y-6">
      <section className="border border-[#E8E8E8] rounded-xl p-5 bg-[#FAFAF8]">
        <div className="text-[#0A0A0A] text-[13px] font-medium">Lead Volume</div>
        <div className="text-[#555] text-[12px] mt-2">Last 7 days</div>
        <div className="mt-4 h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={leadVolume}>
              <CartesianGrid stroke="#222" strokeDasharray="4 4" />
              <XAxis dataKey="date" tick={{ fill: "#888" }} />
              <YAxis tick={{ fill: "#888" }} />
              <Tooltip
                contentStyle={{ background: "#111", border: "1px solid #2A2A2A" }}
                labelStyle={{ color: "#fff" }}
                itemStyle={{ color: "#fff" }}
              />
              <Area type="monotone" dataKey="count" stroke="#fff" fill="#fff" fillOpacity={0.05} />
              <Line type="monotone" dataKey="count" stroke="#fff" strokeWidth={1.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="border border-[#E8E8E8] rounded-xl p-5 bg-[#FAFAF8]">
        <div className="text-[#0A0A0A] text-[13px] font-medium">Lead Sources</div>
        <div className="text-[#555] text-[12px] mt-2">Last 30 days</div>
        <div className="mt-4 h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sources}>
              <CartesianGrid stroke="#222" strokeDasharray="4 4" />
              <XAxis dataKey="source" tick={{ fill: "#888" }} />
              <YAxis tick={{ fill: "#888" }} />
              <Tooltip
                contentStyle={{ background: "#111", border: "1px solid #2A2A2A" }}
                labelStyle={{ color: "#fff" }}
                itemStyle={{ color: "#fff" }}
              />
              <Bar dataKey="count" fill="#fff" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="border border-[#E8E8E8] rounded-xl p-5 bg-[#FAFAF8]">
        <div className="text-[#0A0A0A] text-[13px] font-medium">Score Distribution</div>
        <div className="text-[#555] text-[12px] mt-2">By score ranges</div>
        <div className="mt-4 h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={scoreBins}>
              <CartesianGrid stroke="#222" strokeDasharray="4 4" />
              <XAxis dataKey="bin" tick={{ fill: "#888" }} />
              <YAxis tick={{ fill: "#888" }} />
              <Tooltip
                contentStyle={{ background: "#111", border: "1px solid #2A2A2A" }}
                labelStyle={{ color: "#fff" }}
                itemStyle={{ color: "#fff" }}
              />
              <Bar dataKey="count" fill="#fff" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="border border-[#E8E8E8] rounded-xl p-5 bg-[#FAFAF8]">
        <div className="text-[#0A0A0A] text-[13px] font-medium">Channel Performance</div>
        <div className="text-[#555] text-[12px] mt-2">WhatsApp vs Instagram</div>
        <div className="mt-4 h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={channelPerformance}>
              <CartesianGrid stroke="#222" strokeDasharray="4 4" />
              <XAxis dataKey="date" tick={{ fill: "#888" }} />
              <YAxis tick={{ fill: "#888" }} />
              <Tooltip
                contentStyle={{ background: "#111", border: "1px solid #2A2A2A" }}
                labelStyle={{ color: "#fff" }}
                itemStyle={{ color: "#fff" }}
              />
              <Line type="monotone" dataKey="whatsapp" stroke="#16A34A" strokeWidth={1.5} dot={false} />
              <Line type="monotone" dataKey="instagram" stroke="#A855F7" strokeWidth={1.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}

