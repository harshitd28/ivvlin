"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import AdminSidebar from "@/components/admin/AdminSidebar";
import type { Client, UserRole } from "@/lib/types";

type Props = {
  clients: Array<Client>;
  userName: string;
  userRole: UserRole;
};

export default function MobileAdminNav({ clients, userName, userRole }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-label="Open navigation"
        className="md:hidden fixed left-4 top-4 z-[60] inline-flex items-center justify-center h-10 w-10 rounded-lg bg-white border border-[#E8E8E8]"
        onClick={() => setOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </button>

      {open ? (
        <div className="md:hidden fixed inset-0 z-[70]">
          <div
            className="absolute inset-0 bg-[#FAFAF8]/60"
            role="button"
            tabIndex={0}
            onClick={() => setOpen(false)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setOpen(false);
            }}
          />

          <div className="absolute inset-y-0 left-0">
            <div className="absolute right-2 top-2 z-[80]">
              <button
                type="button"
                aria-label="Close navigation"
                className="h-10 w-10 rounded-lg bg-white border border-[#E8E8E8] inline-flex items-center justify-center"
                onClick={() => setOpen(false)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="relative z-[75]">
              <AdminSidebar clients={clients} userName={userName} userRole={userRole} />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

