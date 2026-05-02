"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import type { DashboardStat } from "@/lib/mock-data";

type Props = {
  stat: DashboardStat;
  delay?: number;
};

function useCountUp(target: number, durationMs = 1200) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let frame = 0;
    const totalFrames = Math.max(1, Math.round((durationMs / 1000) * 60));
    const timer = setInterval(() => {
      frame += 1;
      const progress = Math.min(frame / totalFrames, 1);
      setValue(Math.round(target * progress));
      if (progress >= 1) clearInterval(timer);
    }, 1000 / 60);
    return () => clearInterval(timer);
  }, [durationMs, target]);

  return value;
}

export default function StatCard({ stat, delay = 0 }: Props) {
  const count = useCountUp(stat.value);
  const valueText = useMemo(() => `${count}${stat.suffix ?? ""}`, [count, stat.suffix]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut", delay }}
      className="rounded-xl border border-[#1A1A1A] bg-[#0D0D0D] p-6 transition-colors duration-150 hover:border-[#2A2A2A]"
    >
      <p className="text-[10px] uppercase tracking-[0.12em] text-[#555]">{stat.label}</p>
      <p className="mt-2 text-[42px] font-light leading-none text-white" style={{ color: stat.valueColor ?? "#FFFFFF" }}>
        {valueText}
      </p>
      <svg className="mt-3 h-5 w-10" viewBox="0 0 40 20" fill="none" aria-hidden="true">
        <path d="M1 14L8 11L15 12L22 7L29 9L39 4" stroke="#333333" strokeWidth="1" />
      </svg>
      <p className="mt-1 text-[11px]" style={{ color: stat.trendUp ? "#10B981" : "#EF4444" }}>
        {stat.trend}
      </p>
    </motion.div>
  );
}
