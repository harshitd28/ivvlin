"use client";

import type { Client, UserRole } from "@/lib/types";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Settings, ChevronLeft, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import ClientSwitcher from "./ClientSwitcher";
import { useAdminContext } from "./AdminContext";

type Props = {
  clients: Client[];
  userName: string;
  userRole: UserRole;
};

function navItemClass(isActive: boolean) {
  if (isActive) return "bg-[#F4F4F2] text-[#0A0A0A]";
  return "text-[#555555]";
}

export default function AdminSidebar({ clients, userName, userRole }: Props) {
  const pathname = usePathname();
  const { activeClientId, setActiveClientId } = useAdminContext();

  async function onSignOut() {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    await supabase.auth.signOut();
    // Middleware will redirect on next navigation.
  }

  const qs = activeClientId ? `?clientId=${encodeURIComponent(activeClientId)}` : "";

  const navItems = [
    { href: `/admin${qs}`, label: "Overview", active: pathname === "/admin" },
    { href: `/admin/clients${qs}`, label: "Clients", active: pathname.startsWith("/admin/clients") },
    { href: `/admin/leads${qs}`, label: "All Leads", active: pathname.startsWith("/admin/leads") },
    { href: `/admin/conversations${qs}`, label: "Conversations", active: pathname.startsWith("/admin/conversations") },
    { href: `/admin/visits${qs}`, label: "Visits", active: pathname.startsWith("/admin/visits") },
    { href: `/admin/webhooks${qs}`, label: "Webhooks", active: pathname.startsWith("/admin/webhooks") },
    { href: `/admin/credits${qs}`, label: "Credits", active: pathname.startsWith("/admin/credits") },
    { href: `/admin/settings${qs}`, label: "Settings", active: pathname.startsWith("/admin/settings") },
  ];

  return (
    <aside className="w-[240px] fixed left-0 top-0 bottom-0 border-r border-[#E8E8E8] bg-white">
      <div className="h-full flex flex-col">
        <div className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="relative w-[44px] h-[44px] rounded-lg bg-[#F4F4F2] border border-[#E8E8E8] flex items-center justify-center">
                <Image src="/assets/ivvlyn-logo.png" alt="Ivvlin" fill sizes="44px" className="object-contain p-2" />
              </div>
              <div>
                <div className="text-[#0A0A0A] text-[12px] font-semibold">Ivvlin</div>
                <div className="text-[#555555] text-[11px] font-medium">Admin</div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-5 pb-3">
          <ClientSwitcher clients={clients} />
        </div>

        <div className="px-5 pt-1">
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  "px-3 py-2 rounded-lg text-[13px] font-normal transition-colors",
                  navItemClass(item.active)
                )}
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/"
              className="px-3 py-2 rounded-lg text-[13px] font-normal transition-colors text-[#555555] hover:text-[#0A0A0A] inline-flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4 mr-0.5" />
              Back to Website
            </Link>
            {activeClientId ? (
              <div className="mt-2">
                <Button
                  variant="ghost"
                  className="w-full justify-start text-[#555555] hover:text-[#CCC] px-3 py-2 rounded-lg"
                  onClick={() => setActiveClientId(null)}
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Back to All Clients
                </Button>
              </div>
            ) : null}
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
              <div className="text-[#555] text-[11px] font-medium uppercase">{userRole}</div>
            </div>
            <Link
              href="/admin/settings"
              className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-[#555555] hover:text-[#0A0A0A] hover:bg-muted border border-transparent"
              aria-label="Settings"
            >
              <Settings className="h-4 w-4" />
            </Link>
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

