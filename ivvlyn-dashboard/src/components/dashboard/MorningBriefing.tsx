"use client";

import { useMemo, useState } from "react";
import { Bot, Calendar, Moon, PhoneCall, RefreshCw, Sun } from "lucide-react";
import { motion } from "framer-motion";

const iconMap = {
  Moon,
  Calendar,
  RefreshCw,
  PhoneCall,
  Bot,
};

type BriefingItem = {
  icon: keyof typeof iconMap;
  text: string;
};

type Props = {
  items: BriefingItem[];
};

export default function MorningBriefing({ items }: Props) {
  const [selectedText, setSelectedText] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const dateText = new Intl.DateTimeFormat("en-IN", {
    month: "short",
    day: "numeric",
  }).format(new Date());
  const selectedDetails = useMemo(() => {
    const key = selectedText ?? "";
    if (key.includes("14 new leads")) {
      return [
        "Lead sources: Meta Ads (8), Website (3), MagicBricks (2), WhatsApp referral (1).",
        "Top intent clusters: 3BHK within 95L-1.3Cr and weekend site visit requests.",
        "AI replied to all 14 leads within 60 seconds.",
      ];
    }
    if (key.includes("site visits")) {
      return [
        "11:00 AM - Arjun Mehta - Skyline Crest.",
        "1:30 PM - Sneha Pillai - Urban Nest.",
        "3:00 PM - Riya Sharma - Green Arc.",
      ];
    }
    if (key.includes("no-shows")) {
      return [
        "2 leads marked as no-show in last 24h.",
        "Auto-reschedule sequence already triggered with two alternate slots.",
        "Sales team handoff created for manual callback if no response in 2h.",
      ];
    }
    if (key.includes("warm leads")) {
      return [
        "5 warm leads have score between 55 and 69.",
        "All have active follow-up tasks due today.",
        "Recommended action: assign callback within next 90 minutes.",
      ];
    }
    if (key.includes("AI follow-ups")) {
      return [
        "56 leads currently in AI nurturing workflows.",
        "43 received follow-up in last 12h; 13 queued for next reminder.",
        "No delivery errors in outbound channel health check.",
      ];
    }
    return ["Details will appear here when a briefing item is selected."];
  }, [selectedText]);

  return (
    <>
      <div className="rounded-xl border border-[#1A1A1A] bg-[#111111] p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sun size={16} color="#F59E0B" />
          <p className="text-[13px] text-white">Morning Briefing</p>
        </div>
        <p className="text-[11px] text-[#555]">{dateText}</p>
      </div>

      <div className="mt-3">
        {items.map((item) => {
          const Icon = iconMap[item.icon];
          return (
            <button
              key={item.text}
              type="button"
              onClick={() => setSelectedText(item.text)}
              className="flex w-full items-center gap-2 border-b border-[#1A1A1A] py-2 text-left transition-colors duration-150 hover:bg-[#151515]"
            >
              <Icon size={12} color="#555555" />
              <p className="text-[12px] text-[#888]">{item.text}</p>
            </button>
          );
        })}
      </div>

      <motion.button
        type="button"
        onClick={() => setShowAll(true)}
        className="mt-3 text-[11px] text-[#555] transition-colors duration-150 hover:text-white"
        whileHover={{ opacity: 1 }}
      >
        View detailed briefing →
      </motion.button>
      </div>

      {(selectedText || showAll) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4">
          <div className="w-full max-w-xl rounded-xl border border-[#252525] bg-[#111111] p-5">
            <div className="flex items-center justify-between">
              <p className="text-[14px] font-medium text-white">{selectedText ?? "Detailed Morning Briefing"}</p>
              <button
                type="button"
                onClick={() => {
                  setSelectedText(null);
                  setShowAll(false);
                }}
                className="text-[12px] text-[#777] hover:text-white"
              >
                Close
              </button>
            </div>
            <div className="mt-4 space-y-2">
              {showAll && !selectedText
                ? items.map((item) => (
                    <button
                      key={item.text}
                      type="button"
                      onClick={() => setSelectedText(item.text)}
                      className="block w-full rounded-lg border border-[#1E1E1E] bg-[#0D0D0D] px-3 py-2 text-left text-[12px] text-[#BEBEBE] hover:border-[#333]"
                    >
                      {item.text}
                    </button>
                  ))
                : selectedDetails.map((line) => (
                    <p key={line} className="rounded-lg border border-[#1E1E1E] bg-[#0D0D0D] px-3 py-2 text-[12px] text-[#BEBEBE]">
                      {line}
                    </p>
                  ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
