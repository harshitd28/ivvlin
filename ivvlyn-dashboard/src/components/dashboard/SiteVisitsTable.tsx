"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import type { VisitItem } from "@/lib/mock-data";

type Props = {
  visits: VisitItem[];
  delay?: number;
};

const statusClasses: Record<VisitItem["status"], string> = {
  confirmed: "bg-[#0D1A0D] text-[#10B981] border-[#0D2A0D]",
  due: "bg-[#1A1200] text-[#F59E0B] border-[#2A1E00]",
  reminder: "bg-[#0D1220] text-[#3B82F6] border-[#0D1A30]",
};

const statusLabel: Record<VisitItem["status"], string> = {
  confirmed: "Confirmed",
  due: "Due in 2h",
  reminder: "Reminder Sent",
};

export default function SiteVisitsTable({ visits, delay = 0 }: Props) {
  const [localVisits, setLocalVisits] = useState<VisitItem[]>(visits);
  const [selectedVisit, setSelectedVisit] = useState<VisitItem | null>(null);
  const [showAddVisit, setShowAddVisit] = useState(false);
  const [leadName, setLeadName] = useState("");
  const [project, setProject] = useState("");
  const [time, setTime] = useState("");
  const [salesperson, setSalesperson] = useState("");

  const contactMap = useMemo(
    () =>
      Object.fromEntries(
        localVisits.map((v) => [
          v.leadName,
          {
            phone: `+91 98${(v.leadName.length * 17391).toString().slice(0, 8).padEnd(8, "0")}`,
            email: `${v.leadName.toLowerCase().replace(/\s+/g, ".")}@example.com`,
          },
        ])
      ),
    [localVisits]
  );

  function addVisit() {
    if (!leadName.trim() || !project.trim() || !time.trim() || !salesperson.trim()) return;
    setLocalVisits((prev) => [
      ...prev,
      { leadName: leadName.trim(), project: project.trim(), time: time.trim(), salesperson: salesperson.trim(), status: "confirmed" },
    ]);
    setLeadName("");
    setProject("");
    setTime("");
    setSalesperson("");
    setShowAddVisit(false);
  }

  return (
    <>
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut", delay }}
        className="rounded-xl border border-[#1A1A1A] bg-[#0D0D0D] p-7"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <p className="text-[13px] text-white">Today&apos;s Site Visits</p>
            <span className="rounded-md border border-[#1A1A1A] px-2 py-0.5 text-[10px] text-[#888]">{localVisits.length}</span>
          </div>
          <button
            type="button"
            onClick={() => setShowAddVisit(true)}
            className="rounded-md border border-[#333] px-3 py-1.5 text-[11px] text-[#888] transition-colors duration-150 hover:border-white hover:text-white"
          >
            Add Visit
          </button>
        </div>

        <div className="mt-4">
          <div className="grid grid-cols-5 border-b border-[#1A1A1A] pb-2 text-[10px] uppercase tracking-[0.1em] text-[#444]">
            <p>Lead Name</p>
            <p>Project</p>
            <p>Time</p>
            <p>Salesperson</p>
            <p>Status</p>
          </div>
          {localVisits.map((visit) => (
            <button
              key={`${visit.leadName}-${visit.time}`}
              type="button"
              onClick={() => setSelectedVisit(visit)}
              className="grid w-full grid-cols-5 items-center border-b border-[#111] py-3.5 text-left text-[13px] text-[#888] transition-colors duration-150 hover:bg-[#101010]"
            >
              <p className="text-white">{visit.leadName}</p>
              <p>{visit.project}</p>
              <p>{visit.time}</p>
              <p>{visit.salesperson}</p>
              <p>
                <span className={`rounded-md border px-2 py-1 text-[10px] uppercase tracking-[0.08em] ${statusClasses[visit.status]}`}>
                  {statusLabel[visit.status]}
                </span>
              </p>
            </button>
          ))}
        </div>
      </motion.section>

      {showAddVisit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-xl border border-[#252525] bg-[#111111] p-5">
            <div className="flex items-center justify-between">
              <p className="text-[14px] font-medium text-white">Add Site Visit</p>
              <button type="button" onClick={() => setShowAddVisit(false)} className="text-[12px] text-[#777] hover:text-white">
                Close
              </button>
            </div>
            <div className="mt-4 grid gap-3">
              <input value={leadName} onChange={(e) => setLeadName(e.target.value)} placeholder="Lead Name" className="rounded-md border border-[#2B2B2B] bg-[#0D0D0D] px-3 py-2 text-[12px] text-white outline-none" />
              <input value={project} onChange={(e) => setProject(e.target.value)} placeholder="Project" className="rounded-md border border-[#2B2B2B] bg-[#0D0D0D] px-3 py-2 text-[12px] text-white outline-none" />
              <input value={time} onChange={(e) => setTime(e.target.value)} placeholder="Time (e.g. 4:30 PM)" className="rounded-md border border-[#2B2B2B] bg-[#0D0D0D] px-3 py-2 text-[12px] text-white outline-none" />
              <input value={salesperson} onChange={(e) => setSalesperson(e.target.value)} placeholder="Salesperson" className="rounded-md border border-[#2B2B2B] bg-[#0D0D0D] px-3 py-2 text-[12px] text-white outline-none" />
            </div>
            <button type="button" onClick={addVisit} className="mt-4 rounded-md border border-[#6C5CE7] px-3 py-1.5 text-[12px] text-white hover:bg-[#6C5CE7]">
              Save Visit
            </button>
          </div>
        </div>
      )}

      {selectedVisit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-xl rounded-xl border border-[#252525] bg-[#111111] p-5">
            <div className="flex items-center justify-between">
              <p className="text-[15px] font-medium text-white">{selectedVisit.leadName}</p>
              <button type="button" onClick={() => setSelectedVisit(null)} className="text-[12px] text-[#777] hover:text-white">
                Close
              </button>
            </div>
            <div className="mt-4 grid gap-2 text-[12px] text-[#C6C6C6]">
              <p className="rounded-lg border border-[#1E1E1E] bg-[#0D0D0D] px-3 py-2">Project: {selectedVisit.project}</p>
              <p className="rounded-lg border border-[#1E1E1E] bg-[#0D0D0D] px-3 py-2">Visit time: {selectedVisit.time}</p>
              <p className="rounded-lg border border-[#1E1E1E] bg-[#0D0D0D] px-3 py-2">Salesperson: {selectedVisit.salesperson}</p>
              <p className="rounded-lg border border-[#1E1E1E] bg-[#0D0D0D] px-3 py-2">
                Phone: {contactMap[selectedVisit.leadName]?.phone ?? "+91 9800000000"}
              </p>
              <p className="rounded-lg border border-[#1E1E1E] bg-[#0D0D0D] px-3 py-2">
                Email: {contactMap[selectedVisit.leadName]?.email ?? "lead@example.com"}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
