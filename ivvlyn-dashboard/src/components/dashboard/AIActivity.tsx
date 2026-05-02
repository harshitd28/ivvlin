"use client";

import { Bot, MessageSquareText, PhoneCall, Repeat2 } from "lucide-react";
import { motion } from "framer-motion";

type Props = {
  activity: {
    conversations: { value: number; trend: string };
    messages: { value: number; trend: string };
    reminders: { value: number; trend: string };
    noShowFollowups: { value: number; trend: string };
  };
  delay?: number;
};

export default function AIActivity({ activity, delay = 0 }: Props) {
  const rows = [
    { icon: Bot, label: "Conversations Today", data: activity.conversations, positive: true },
    { icon: MessageSquareText, label: "Messages Sent", data: activity.messages, positive: true },
    { icon: Repeat2, label: "Reminders Sent", data: activity.reminders, positive: true },
    { icon: PhoneCall, label: "No-show Follow-ups", data: activity.noShowFollowups, positive: false },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut", delay }}
      className="rounded-xl border border-[#1A1A1A] bg-[#0D0D0D] p-7"
    >
      <p className="text-[13px] text-white">AI Activity</p>
      <div className="mt-4">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between border-b border-[#111] py-3 last:border-none">
            <div className="flex items-center gap-2">
              <row.icon size={14} color="#555" />
              <p className="text-[12px] text-[#888]">{row.label}</p>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-[13px] text-white">{row.data.value}</p>
              <span
                className="rounded-md border border-[#1A1A1A] px-2 py-0.5 text-[10px]"
                style={{ color: row.positive ? "#10B981" : "#EF4444" }}
              >
                {row.data.trend}
              </span>
            </div>
          </div>
        ))}
      </div>
    </motion.section>
  );
}
