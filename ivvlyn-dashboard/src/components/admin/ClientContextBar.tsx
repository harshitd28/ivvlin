"use client";

import { useAdminContext } from "./AdminContext";
import type { Client } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Wand2 } from "lucide-react";

type Props = {
  clients: Client[];
};

function agentLabel(agentType: Client["agent_type"]) {
  switch (agentType) {
    case "vaani":
      return "Vaani";
    case "nova":
      return "Nova";
    case "kira":
      return "Kira";
    case "zane":
      return "Zane";
    default:
      return "Custom";
  }
}

export default function ClientContextBar({ clients }: Props) {
  const { activeClientId, setActiveClientId } = useAdminContext();
  const client = clients.find((c) => c.id === activeClientId) ?? null;

  if (!client) return null;

  return (
    <div className="fixed left-[240px] right-0 top-0 z-20 bg-[#111] border-b border-[#E8E8E8] px-8 py-2">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="text-[11px] text-[#555] uppercase tracking-[0.1em] whitespace-nowrap">
            Viewing as:
          </div>
          <div className="text-[#0A0A0A] text-[13px] font-medium truncate">
            {client.business_name}
          </div>
          <div className="inline-flex items-center gap-2 bg-[#F4F4F2] border border-[#E8E8E8] rounded-full px-3 py-1 text-[12px]">
            <Wand2 className="h-3.5 w-3.5 text-[#0A0A0A]" />
            <span className="text-[#0A0A0A]">{agentLabel(client.agent_type)}</span>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Button
            variant="ghost"
            className="text-[#555555] hover:text-[#0A0A0A]"
            onClick={() => setActiveClientId(null)}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to All Clients
          </Button>
          <Button
            variant="secondary"
            className="bg-[#F4F4F2] border border-[#E8E8E8] hover:bg-[#1E1E1E] text-[#0A0A0A]"
            onClick={() => {
              // Placeholder: later this navigates to /admin/clients/[id]
              window.location.href = `/admin/settings?clientId=${encodeURIComponent(client.id)}`;
            }}
          >
            Edit Client Settings
          </Button>
        </div>
      </div>
    </div>
  );
}

