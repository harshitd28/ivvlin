"use client";

import type { UserRole } from "@/lib/types";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Settings as SettingsIcon, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import AgentBadge from "@/components/shared/AgentBadge";

type Props = {
  businessName: string;
  agentLabel: string;
  agentType: "vaani" | "nova" | "kira" | "zane" | "custom";
  userName: string;
  userEmail: string;
  userRole: UserRole;
};

function navItemClass(isActive: boolean) {
  if (isActive) return "bg-[#F4F4F2] text-[#0A0A0A]";
  return "text-[#555555]";
}

export default function ClientSidebar({
  businessName,
  agentLabel,
  agentType,
  userName,
  userEmail,
}: Props) {
  const pathname = usePathname();

  async function onSignOut() {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    await supabase.auth.signOut();
  }

  const nav = [
    { href: "/dashboard", label: "Dashboard", active: pathname === "/dashboard" },
    { href: "/dashboard/leads", label: "Leads", active: pathname.startsWith("/dashboard/leads") },
    { href: "/dashboard/settings", label: "Settings", active: pathname.startsWith("/dashboard/settings") },
  ];

  return (
    <aside className="w-[240px] fixed left-0 top-0 bottom-0 border-r border-[#E8E8E8] bg-white">
      <div className="h-full flex flex-col">
        <div className="p-5">
          <div className="flex items-start gap-3">
            <div className="relative w-[44px] h-[44px] rounded-lg bg-[#F4F4F2] border border-[#E8E8E8] flex items-center justify-center">
              <Image src="/assets/ivvlyn-logo.png" alt="Ivvlyn" fill sizes="44px" className="object-contain p-2" />
            </div>
            <div className="min-w-0">
              <div className="text-[#0A0A0A] text-[14px] font-semibold truncate">Ivvlyn</div>
              <div className="text-[#555555] text-[13px] mt-1 truncate">{businessName}</div>
              <div className="mt-3">
                <AgentBadge agentType={agentType} label={agentLabel} />
              </div>
            </div>
          </div>
        </div>

        <div className="px-5 pt-1">
          <nav className="flex flex-col gap-1">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-2 rounded-lg text-[13px] font-normal transition-colors ${navItemClass(item.active)}`}
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/"
              className="px-3 py-2 rounded-lg text-[13px] font-normal transition-colors text-[#555555] hover:text-[#0A0A0A] inline-flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Website
            </Link>
          </nav>
        </div>

        <div className="mt-auto px-5 pb-5">
          <Separator className="bg-[#2A2A2A] mb-4" />
          <div className="flex items-center gap-3 mb-3">
            <div className="h-8 w-8 rounded-full bg-[#F4F4F2] border border-[#E8E8E8] flex items-center justify-center text-[#0A0A0A] text-[12px] font-medium">
              {userName.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[#0A0A0A] text-[13px] truncate">{userName}</div>
              <div className="text-[#555] text-[11px] font-medium uppercase">{userEmail}</div>
            </div>
            <span className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-[#555555] border border-transparent hover:bg-muted">
              <SettingsIcon className="h-4 w-4" />
            </span>
          </div>

          <Button
            variant="ghost"
            className="w-full justify-start text-[#555555] hover:text-[#0A0A0A] rounded-lg"
            onClick={onSignOut}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign out
          </Button>
        </div>
      </div>
    </aside>
  );
}

