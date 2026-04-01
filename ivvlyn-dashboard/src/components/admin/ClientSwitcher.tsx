"use client";

import { useAdminContext } from "./AdminContext";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import type { Client } from "@/lib/types";

function agentDotColor(agentType: Client["agent_type"]) {
  switch (agentType) {
    case "vaani":
      return "bg-[#16A34A]";
    case "nova":
      return "bg-[#3B82F6]";
    case "kira":
      return "bg-[#D97706]";
    case "zane":
      return "bg-[#A855F7]";
    default:
      return "bg-zinc-500";
  }
}

function statusDotColor(status: string | null | undefined) {
  const s = status ?? "";
  if (s === "active") return "bg-[#16A34A]";
  if (s === "paused") return "bg-[#888888]";
  return "bg-[#D97706]";
}

type Props = {
  clients: Client[];
};

export default function ClientSwitcher({ clients }: Props) {
  const { activeClientId, setActiveClientId } = useAdminContext();

  const selectedClient = clients.find((c) => c.id === activeClientId) ?? null;

  const label = selectedClient ? selectedClient.business_name : null;

  return (
    <div className="space-y-2">
      <div className="text-[11px] text-[#555555] uppercase tracking-[0.2em]">VIEWING</div>

      <DropdownMenu>
        <DropdownMenuTrigger>
          <Button
            variant="secondary"
            className="w-full justify-between rounded-lg bg-[#F4F4F2] border border-[#E8E8E8] text-[13px] px-3 py-2 hover:bg-[#1E1E1E] hover:border-[#444] h-auto"
          >
            <span className="flex items-center gap-2 min-w-0">
              <span
                className={`h-2.5 w-2.5 rounded-full ${selectedClient ? agentDotColor(selectedClient.agent_type) : "bg-zinc-500"}`}
                aria-hidden="true"
              />
              <span className="truncate">
                {selectedClient ? label : "All Clients Overview"}
              </span>
            </span>
            <ChevronDown className="h-4 w-4 text-zinc-400 shrink-0" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent className="w-[280px] p-1 bg-white border border-[#E8E8E8] rounded-lg shadow-none max-h-[300px] overflow-y-auto">
          <DropdownMenuItem
            className="rounded-md px-2.5 py-2 text-[13px] bg-white text-black"
            onSelect={(e) => {
              e.preventDefault();
              setActiveClientId(null);
            }}
          >
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-white" aria-hidden="true" />
              <span className="font-medium">All Clients Overview</span>
            </span>
          </DropdownMenuItem>

          <DropdownMenuSeparator className="my-1 bg-[#2A2A2A]" />

          {clients.map((c) => {
            const isSelected = c.id === activeClientId;
            return (
              <DropdownMenuItem
                key={c.id}
                className={`rounded-md px-2.5 py-2 text-[13px] ${isSelected ? "bg-white text-black" : "bg-transparent text-zinc-300"} hover:bg-[#F4F4F2]`}
                onSelect={(e) => {
                  e.preventDefault();
                  setActiveClientId(c.id);
                }}
              >
                <span className="flex items-center gap-2 w-full">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${agentDotColor(c.agent_type)}`}
                    aria-hidden="true"
                  />
                  <span className="flex-1 min-w-0">
                    <span className="block truncate font-medium">
                      {c.name} · {c.business_name}
                    </span>
                  </span>
                  <span className={`h-2 w-2 rounded-full ${statusDotColor(c.status)}`} aria-hidden="true" />
                </span>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

