"use client";

import { motion } from "framer-motion";

type Props = {
  crmSync: {
    connected: boolean;
    leadsCreated: number;
    leadsUpdated: number;
    activitiesLogged: number;
    errors: number;
    lastSync: string;
    nextSync: string;
  };
  delay?: number;
};

export default function CRMSync({ crmSync, delay = 0 }: Props) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut", delay }}
      className="rounded-xl border border-[#1A1A1A] bg-[#0D0D0D] p-7"
    >
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-white">CRM Sync</p>
        <span className="rounded-md border border-[#333] px-2 py-0.5 text-[11px] text-[#666]">Zoho CRM</span>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <motion.svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        >
          <path d="M8 2.5a5.5 5.5 0 1 1-3.89 1.61" stroke="#6C5CE7" strokeWidth="1" />
        </motion.svg>
        <p className="text-[12px] text-[#10B981]">{crmSync.connected ? "Connected" : "Disconnected"}</p>
      </div>

      <div className="mt-4 space-y-2 text-[12px] text-[#888]">
        <div className="flex items-center justify-between">
          <span>Leads Created</span>
          <span className="text-white">{crmSync.leadsCreated}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Leads Updated</span>
          <span className="text-white">{crmSync.leadsUpdated}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Activities Logged</span>
          <span className="text-white">{crmSync.activitiesLogged}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Errors</span>
          <span className="text-[#10B981]">{crmSync.errors}</span>
        </div>
      </div>

      <div className="mt-4 border-t border-[#1A1A1A] pt-3 text-[11px] text-[#555]">
        <p>Last sync: {crmSync.lastSync}</p>
        <p className="mt-1">Next sync: {crmSync.nextSync}</p>
      </div>
    </motion.section>
  );
}
