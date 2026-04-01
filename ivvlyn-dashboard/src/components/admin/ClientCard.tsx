"use client";

import type { Client } from "@/lib/types";
import { Building2, BookOpen, Hospital, Sparkles, Utensils } from "lucide-react";
import StatusPill from "@/components/shared/StatusPill";
import AgentBadge from "@/components/shared/AgentBadge";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useAdminContext } from "./AdminContext";

type Props = {
  client: Client;
  leadsToday: number;
  hotLeads: number;
  messagesToday: number;
};

function agentIcon(agentType: Client["agent_type"]) {
  const cls = "h-4 w-4 text-[#0A0A0A]";
  switch (agentType) {
    case "vaani":
      return <Building2 className={cls} />;
    case "nova":
      return <Hospital className={cls} />;
    case "kira":
      return <BookOpen className={cls} />;
    case "zane":
      return <Utensils className={cls} />;
    default:
      return <Sparkles className={cls} />;
  }
}

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

export default function ClientCard({ client, leadsToday, hotLeads, messagesToday }: Props) {
  const router = useRouter();
  const { setActiveClientId } = useAdminContext();

  function select() {
    setActiveClientId(client.id);
    router.push(`/admin?clientId=${encodeURIComponent(client.id)}`);
  }

  const hasWA = !!client.whatsapp_phone_id;
  const hasIG = !!client.instagram_page_id;

  const badgeLabel = `${client.agent_type === "vaani" ? "Vaani" : client.agent_type === "nova" ? "Nova" : client.agent_type === "kira" ? "Kira" : client.agent_type === "zane" ? "Zane" : "Custom"} · ${client.industry}`;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={select}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") select();
      }}
      className={cn(
        "bg-white border border-[#E8E8E8] rounded-xl p-5 cursor-pointer transition-all duration-200",
        "hover:border-[#444] hover:-translate-y-0.5"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-[#F4F4F2] border border-[#E8E8E8]">
          {agentIcon(client.agent_type)}
        </div>
        <StatusPill status={client.status} />
      </div>

      <div className="mt-4">
        <div className="text-[#0A0A0A] text-[16px] font-medium truncate">{client.business_name}</div>
        <div className="text-[#555555] text-[13px] mt-1 truncate">{client.industry}</div>
        <div className="mt-3">
          <AgentBadge agentType={client.agent_type} label={badgeLabel} />
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3 text-[#0A0A0A]">
        <div className="flex-1">
          <div className="text-[16px] font-light leading-none">{leadsToday}</div>
          <div className="text-[10px] text-[#555555] mt-1 uppercase tracking-[0.1em]">Leads today</div>
        </div>
        <div className="w-px h-10 bg-[#2A2A2A]" />
        <div className="flex-1">
          <div className="text-[16px] font-light leading-none">{hotLeads}</div>
          <div className="text-[10px] text-[#555555] mt-1 uppercase tracking-[0.1em]">Hot leads</div>
        </div>
        <div className="w-px h-10 bg-[#2A2A2A]" />
        <div className="flex-1">
          <div className="text-[16px] font-light leading-none">{messagesToday}</div>
          <div className="text-[10px] text-[#555555] mt-1 uppercase tracking-[0.1em]">Messages</div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        {hasWA ? (
          <span className="inline-flex items-center gap-2 text-[11px] bg-[#0D2818] text-[#16A34A] border border-[#10311f] rounded-full px-3 py-1">
            <span className={`h-2.5 w-2.5 rounded-full ${agentDotColor("vaani")}`} aria-hidden="true" />
            WA
          </span>
        ) : null}
        {hasIG ? (
          <span className="inline-flex items-center gap-2 text-[11px] bg-[#0D1A2A] text-[#3B82F6] border border-[#12304f] rounded-full px-3 py-1">
            <span className="h-2.5 w-2.5 rounded-full bg-[#3B82F6]" aria-hidden="true" />
            IG
          </span>
        ) : null}
      </div>

      <div className="mt-5 text-[#555555] text-[12px] font-medium hover:text-[#0A0A0A] transition-colors">
        View Dashboard →
      </div>
    </div>
  );
}

