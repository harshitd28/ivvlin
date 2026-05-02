"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { ActivityItem } from "@/lib/mock-data";

type Props = {
  items: ActivityItem[];
  delay?: number;
};

const accent: Record<ActivityItem["type"], string> = {
  lead: "#6C5CE7",
  visit: "#10B981",
  hot: "#FF6B35",
  crm: "#F59E0B",
  human: "#3B82F6",
};

export default function ActivityTimeline({ items, delay = 0 }: Props) {
  const [selectedActivity, setSelectedActivity] = useState<ActivityItem | null>(null);
  const [showAll, setShowAll] = useState(false);

  return (
    <>
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut", delay }}
        className="rounded-xl border border-[#1A1A1A] bg-[#0D0D0D] p-7"
      >
        <div className="flex items-center justify-between">
          <p className="text-[13px] text-white">Recent Activity</p>
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="text-[11px] text-[#555] transition-colors duration-150 hover:text-white"
          >
            View all →
          </button>
        </div>
        <div className="mt-4 flex gap-3 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelectedActivity(item)}
              className="w-[180px] shrink-0 rounded-xl border border-[#1A1A1A] bg-[#111111] p-4 text-left"
              style={{ borderLeftWidth: 3, borderLeftColor: accent[item.type] }}
            >
              <p className="text-[10px] text-[#555]">{item.time}</p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.08em] text-[#555]">{item.type}</p>
              <p className="mt-3 text-[12px] text-[#888]">{item.description}</p>
              <p className="mt-2 text-[12px] text-white">{item.entity}</p>
            </button>
          ))}
        </div>
      </motion.section>

      {showAll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-2xl rounded-xl border border-[#252525] bg-[#111111] p-5">
            <div className="flex items-center justify-between">
              <p className="text-[14px] font-medium text-white">All Recent Activity</p>
              <button type="button" onClick={() => setShowAll(false)} className="text-[12px] text-[#777] hover:text-white">
                Close
              </button>
            </div>
            <div className="mt-4 max-h-[55vh] space-y-2 overflow-y-auto pr-1">
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setSelectedActivity(item);
                    setShowAll(false);
                  }}
                  className="block w-full rounded-lg border border-[#1E1E1E] bg-[#0D0D0D] px-3 py-2 text-left text-[12px] text-[#CFCFCF] hover:border-[#333]"
                >
                  [{item.time}] {item.description} - {item.entity}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {selectedActivity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-xl rounded-xl border border-[#252525] bg-[#111111] p-5">
            <div className="flex items-center justify-between">
              <p className="text-[15px] font-medium text-white">Activity Detail</p>
              <button type="button" onClick={() => setSelectedActivity(null)} className="text-[12px] text-[#777] hover:text-white">
                Close
              </button>
            </div>
            <div className="mt-4 space-y-2 text-[12px] text-[#C8C8C8]">
              <p className="rounded-lg border border-[#1E1E1E] bg-[#0D0D0D] px-3 py-2">Time: {selectedActivity.time}</p>
              <p className="rounded-lg border border-[#1E1E1E] bg-[#0D0D0D] px-3 py-2">Type: {selectedActivity.type}</p>
              <p className="rounded-lg border border-[#1E1E1E] bg-[#0D0D0D] px-3 py-2">Description: {selectedActivity.description}</p>
              <p className="rounded-lg border border-[#1E1E1E] bg-[#0D0D0D] px-3 py-2">Lead: {selectedActivity.entity}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
