"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import type { LeadItem } from "@/lib/mock-data";
import { getStatusColor } from "@/lib/utils";

type Props = {
  leads: LeadItem[];
  delay?: number;
};

export default function LiveInbox({ leads, delay = 0 }: Props) {
  const [selectedLead, setSelectedLead] = useState<LeadItem | null>(null);
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
          <p className="text-[13px] text-white">Live Inbox</p>
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="text-[11px] text-[#555] transition-colors duration-150 hover:text-white"
          >
            View all →
          </button>
        </div>

        <div className="mt-3">
          {leads.map((lead) => (
            <button
              key={lead.id}
              type="button"
              onClick={() => setSelectedLead(lead)}
              className="flex w-full cursor-pointer items-center justify-between border-b border-[#111111] px-1 py-3 text-left transition-colors duration-150 hover:bg-[#0F0F0F]"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#111111] text-[12px] text-white">
                  {lead.initials}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[13px] text-white">{lead.name}</p>
                  <p className="truncate text-[12px] text-[#555]">{lead.lastMessage}</p>
                </div>
              </div>
              <div className="ml-3 flex shrink-0 items-center gap-2">
                <div className="text-right">
                  <p className="text-[11px] text-[#444]">{lead.time}</p>
                  <p className="text-[9px] uppercase tracking-[0.08em]" style={{ color: getStatusColor(lead.status) }}>
                    {lead.status}
                  </p>
                </div>
                {lead.unread > 0 ? (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] text-black">
                    {lead.unread}
                  </span>
                ) : null}
              </div>
            </button>
          ))}
        </div>
      </motion.section>

      {showAll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-2xl rounded-xl border border-[#252525] bg-[#111111] p-5">
            <div className="flex items-center justify-between">
              <p className="text-[14px] font-medium text-white">All Live Inbox Leads</p>
              <button type="button" onClick={() => setShowAll(false)} className="text-[12px] text-[#777] hover:text-white">
                Close
              </button>
            </div>
            <div className="mt-4 max-h-[55vh] space-y-2 overflow-y-auto pr-1">
              {leads.map((lead) => (
                <button
                  key={lead.id}
                  type="button"
                  onClick={() => {
                    setSelectedLead(lead);
                    setShowAll(false);
                  }}
                  className="block w-full rounded-lg border border-[#1E1E1E] bg-[#0D0D0D] px-3 py-2 text-left text-[12px] text-[#D7D7D7] hover:border-[#333]"
                >
                  {lead.name} - {lead.source} - {lead.time}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-xl rounded-xl border border-[#252525] bg-[#111111] p-5">
            <div className="flex items-center justify-between">
              <p className="text-[15px] font-medium text-white">{selectedLead.name}</p>
              <button type="button" onClick={() => setSelectedLead(null)} className="text-[12px] text-[#777] hover:text-white">
                Close
              </button>
            </div>
            <div className="mt-4 space-y-2 text-[12px] text-[#BDBDBD]">
              <p className="rounded-lg border border-[#1E1E1E] bg-[#0D0D0D] px-3 py-2">Source: {selectedLead.source}</p>
              <p className="rounded-lg border border-[#1E1E1E] bg-[#0D0D0D] px-3 py-2">Phone: {selectedLead.phone ?? "Not available"}</p>
              <p className="rounded-lg border border-[#1E1E1E] bg-[#0D0D0D] px-3 py-2">Email: {selectedLead.email ?? "Not available"}</p>
              <p className="rounded-lg border border-[#1E1E1E] bg-[#0D0D0D] px-3 py-2">Latest message: {selectedLead.lastMessage}</p>
              <p className="rounded-lg border border-[#1E1E1E] bg-[#0D0D0D] px-3 py-2">Lead score: {selectedLead.score}</p>
              <p className="rounded-lg border border-[#1E1E1E] bg-[#0D0D0D] px-3 py-2 uppercase">Status: {selectedLead.status}</p>
            </div>
            <div className="mt-4">
              <Link
                href={`/dashboard/conversations?leadId=${encodeURIComponent(selectedLead.id)}`}
                className="inline-flex rounded-md border border-[#6C5CE7] px-3 py-1.5 text-[12px] text-white hover:bg-[#6C5CE7]"
              >
                Open full conversation
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
