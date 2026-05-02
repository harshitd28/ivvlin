"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Activity,
  BarChart3,
  CalendarCheck2,
  House,
  Inbox,
  Megaphone,
  Settings,
  Users,
  Webhook,
  Workflow,
} from "lucide-react";
import CreditUsageBar from "@/components/layout/CreditUsageBar";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: House, active: true },
  { label: "Leads", href: "/dashboard/leads", icon: Users },
  { label: "Inbox", href: "/dashboard/conversations", icon: Inbox, badge: 4 },
  { label: "Campaigns", href: "/dashboard/campaigns", icon: Megaphone },
  { label: "Messaging ops", href: "/dashboard/messaging", icon: Activity },
  { label: "Automation", href: "/dashboard/automation", icon: Webhook },
  { label: "Site Visits", href: "/dashboard/visits", icon: CalendarCheck2 },
  { label: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { label: "CRM Sync", href: "/dashboard/analytics", icon: Workflow },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

type Props = {
  clientName: string;
  planName: string;
  creditsUsed: number;
  creditsLimit: number;
};

export default function Sidebar({ clientName, planName, creditsUsed, creditsLimit }: Props) {
  const initials = clientName
    .split(" ")
    .map((chunk) => chunk[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-[220px] border-r border-[#1A1A1A] bg-black px-4 pb-5 pt-6">
      <div className="flex h-full flex-col">
        <div>
          <p className="text-[14px] font-semibold tracking-[0.15em] text-white">IVVLIN</p>
          <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-[#555]">Client Portal</p>
        </div>

        <nav className="mt-8 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={item.href}
                className="group relative flex items-center justify-between rounded-md px-3 py-2 text-[14px] text-[#666] transition-colors duration-150 hover:text-white"
              >
                {item.active ? (
                  <motion.span
                    className="absolute left-0 top-1/2 h-5 -translate-y-1/2 rounded-full bg-[#6C5CE7]"
                    initial={{ width: 0 }}
                    animate={{ width: 3 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                  />
                ) : null}
                <span className={`flex items-center gap-2 ${item.active ? "text-white" : ""}`}>
                  <Icon size={16} className="text-[#555] transition-colors duration-150 group-hover:text-white" />
                  {item.label}
                </span>
                {item.badge ? (
                  <span className="rounded-md bg-[#1A1A1A] px-1.5 py-0.5 text-[10px] text-white">{item.badge}</span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto space-y-4">
          <CreditUsageBar used={creditsUsed} limit={creditsLimit} />

          <div className="rounded-xl border border-[#1A1A1A] bg-[#0D0D0D] p-4">
            <p className="text-[10px] uppercase tracking-[0.12em] text-[#444]">VAANI</p>
            <div className="mt-2 flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5 items-center justify-center">
                <span className="h-2 w-2 rounded-full bg-[#6C5CE7]" />
                <motion.span
                  className="absolute h-2 w-2 rounded-full border border-[#6C5CE7]"
                  animate={{ scale: [1, 1.4, 1], opacity: [1, 0, 1] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "easeOut" }}
                />
              </span>
              <span className="text-[13px] text-white">Live</span>
              <span className="text-[11px] text-[#555]">Active</span>
            </div>

            <div className="my-4 h-px bg-[#1A1A1A]" />

            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1A1A1A] text-[12px] text-white">
                {initials}
              </div>
              <div>
                <p className="text-[13px] text-white">{clientName}</p>
                <p className="text-[11px] text-[#555]">{planName}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
