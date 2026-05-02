"use client";

import { motion } from "framer-motion";
import { ArcElement, Chart as ChartJS, DoughnutController, Tooltip } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import type { LeadSourceItem } from "@/lib/mock-data";

ChartJS.register(ArcElement, DoughnutController, Tooltip);

type Props = {
  sources: LeadSourceItem[];
  delay?: number;
};

const colors = ["#6C5CE7", "#F59E0B", "#10B981", "#3B82F6", "#555555"];

export default function LeadSources({ sources, delay = 0 }: Props) {
  const total = sources.reduce((sum, item) => sum + item.count, 0);
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut", delay }}
      className="rounded-xl border border-[#1A1A1A] bg-[#0D0D0D] p-7"
    >
      <p className="text-[13px] text-white">Lead Sources</p>
      <div className="relative mt-4 mx-auto h-[180px] w-[180px]">
        <Doughnut
          data={{
            labels: sources.map((source) => source.source),
            datasets: [
              {
                data: sources.map((source) => source.count),
                backgroundColor: colors,
                borderWidth: 0,
              },
            ],
          }}
          options={{
            responsive: true,
            cutout: "72%",
            plugins: { legend: { display: false }, tooltip: { enabled: true } },
          }}
        />
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-[10px] uppercase tracking-[0.1em] text-[#555]">Total</p>
          <p className="text-[20px] font-light text-white">{total}</p>
        </div>
      </div>
      <div className="mt-4 space-y-2">
        {sources.map((source) => (
          <div key={source.source} className="flex items-center justify-between text-[12px] text-[#888]">
            <span>{source.source}</span>
            <span>
              {source.count} ({source.percentage}%)
            </span>
          </div>
        ))}
      </div>
    </motion.section>
  );
}
