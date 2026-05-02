"use client";

import { motion } from "framer-motion";
import MorningBriefing from "@/components/dashboard/MorningBriefing";

type BriefingItem = {
  icon: "Moon" | "Calendar" | "RefreshCw" | "PhoneCall" | "Bot";
  text: string;
};

type Props = {
  briefingItems: BriefingItem[];
  delay?: number;
};

const heroPills = ["< 60s · Response Time", "14 days · Follow-up", "24/7 · Always On", "0 · Leads Missed"];

export default function VaaniHeroCard({ briefingItems, delay = 0 }: Props) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut", delay }}
      className="rounded-xl border border-[#1A1A1A] bg-[#0D0D0D] p-8"
    >
      <div className="grid gap-8 lg:grid-cols-[3fr_2fr]">
        <div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5 items-center justify-center">
              <span className="h-2 w-2 rounded-full bg-[#6C5CE7]" />
              <motion.span
                className="absolute h-2 w-2 rounded-full border border-[#6C5CE7]"
                animate={{ scale: [1, 1.4, 1], opacity: [1, 0, 1] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeOut" }}
              />
            </span>
            <p className="text-[10px] uppercase tracking-[0.12em] text-[#555]">AI EMPLOYEE — LIVE</p>
          </div>

          <h2 className="mt-4 text-[32px] font-light text-white">Your AI employee is live.</h2>
          <p className="mt-2 text-[14px] text-[#666]">
            Capturing, nurturing and converting leads 24x7 — while you sleep.
          </p>

          <div className="mt-6 flex items-center gap-4">
            <div className="relative flex h-28 w-28 items-center justify-center rounded-full border border-[#1A1A1A] bg-[#0B0B0B]">
              <div className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-[#232323] bg-[radial-gradient(circle_at_35%_30%,#545454_0%,#252525_52%,#151515_100%)] shadow-[0_8px_20px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.16)]">
                <div className="absolute -top-1 h-5 w-10 rounded-full bg-[radial-gradient(circle,#8B7EFF_0%,rgba(139,126,255,0)_70%)] opacity-55 blur-[2px]" />
                <span className="text-[11px] font-medium tracking-[0.1em] text-[#ECE9FF]">VAANI</span>
              </div>
            </div>
            <div>
              <p className="text-[18px] font-semibold text-white">Vaani</p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {heroPills.map((pill) => (
              <div key={pill} className="rounded-md border border-[#1A1A1A] bg-[#0D0D0D] px-3 py-1.5 text-[10px] text-[#888]">
                {pill}
              </div>
            ))}
          </div>
        </div>

        <MorningBriefing items={briefingItems} />
      </div>
    </motion.section>
  );
}
