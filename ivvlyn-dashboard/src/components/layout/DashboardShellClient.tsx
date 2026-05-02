"use client";

import { usePathname } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";

type Props = {
  clientName: string;
  children: React.ReactNode;
};

export default function DashboardShellClient({ clientName, children }: Props) {
  const pathname = usePathname();
  const isInboxPage = pathname?.startsWith("/dashboard/conversations");

  if (isInboxPage) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Sidebar clientName={clientName} planName="Premium Plan" creditsUsed={247} creditsLimit={500} />
        <div className="pl-[220px]">{children}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Sidebar clientName={clientName} planName="Premium Plan" creditsUsed={247} creditsLimit={500} />
      <div className="pl-[220px]">
        <Topbar clientName={clientName} />
        <main className="mx-auto w-full max-w-[1400px] px-6 py-8">{children}</main>
      </div>
    </div>
  );
}
