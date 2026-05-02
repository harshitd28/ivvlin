"use client";

import { motion } from "framer-motion";

type Props = {
  used: number;
  limit: number;
};

export default function CreditUsageBar({ used, limit }: Props) {
  const ratio = limit > 0 ? used / limit : 0;
  const progress = Math.min(ratio, 1) * 100;
  const remaining = Math.max(limit - used, 0);
  const overLimit = ratio > 1;
  const warning = ratio >= 0.8 && ratio <= 1;

  const fillColor = overLimit ? "#EF4444" : warning ? "#F59E0B" : "#6C5CE7";

  return (
    <div className="rounded-xl border border-[#1A1A1A] bg-[#0D0D0D] p-4">
      <p className="text-[10px] uppercase tracking-[0.12em] text-[#444]">Lead Credits</p>
      <p className="mt-2 text-[13px] text-white">
        {used} / {limit}
      </p>
      <div className="mt-2 h-1 w-full overflow-hidden rounded-[2px] bg-[#1A1A1A]">
        <motion.div
          className="h-full rounded-[2px]"
          style={{ backgroundColor: fillColor }}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
      <p className="mt-2 text-[10px] text-[#555]">
        {overLimit ? "Overage billing active" : `${remaining} remaining`}
      </p>
    </div>
  );
}
