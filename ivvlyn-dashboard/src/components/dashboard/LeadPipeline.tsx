"use client";

import { motion } from "framer-motion";

type Stage = {
  stage: string;
  count: number;
  isActive: boolean;
};

type Props = {
  pipeline: Stage[];
  delay?: number;
};

export default function LeadPipeline({ pipeline, delay = 0 }: Props) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut", delay }}
      className="rounded-xl border border-[#1A1A1A] bg-[#0D0D0D] p-7"
    >
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-white">Lead Pipeline</p>
        <p className="text-[11px] text-[#555]">Last 30 days</p>
      </div>

      <div className="mt-5 grid grid-cols-6 items-end gap-2">
        {pipeline.map((item, index) => (
          <div key={item.stage} className="flex items-center">
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut", delay: delay + 0.15 + index * 0.04 }}
              className="flex h-[88px] w-full items-center justify-center rounded-lg border bg-[#1A1A1A] px-2 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
              style={{
                borderColor: item.isActive ? "#FF6B35" : "#1A1A1A",
                boxShadow: item.isActive ? "0 0 0 1px rgba(255,107,53,0.2) inset" : undefined,
              }}
            >
              <p className="text-center text-[40px] leading-none font-light" style={{ color: item.isActive ? "#FF6B35" : "#FFFFFF" }}>
                {item.count}
              </p>
            </motion.div>
          </div>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-6 gap-2">
        {pipeline.map((item) => (
          <p key={item.stage} className="text-center text-[11px] text-[#555]">
            {item.stage}
          </p>
        ))}
      </div>

      <div className="mt-6 border-t border-[#1A1A1A] pt-4">
        <p className="text-[11px] text-[#555]">Overall Conversion Rate</p>
        <div className="mt-1 flex items-end gap-3">
          <p className="text-[20px] font-light text-white">6.25%</p>
          <p className="text-[11px] text-[#10B981]">+1.8% vs last 7 days</p>
        </div>
      </div>
    </motion.section>
  );
}
