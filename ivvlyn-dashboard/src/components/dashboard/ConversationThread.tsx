import { formatDistanceToNow } from "date-fns";
import type { Channel } from "@/lib/types";

export type ThreadMessage = {
  id: string;
  created_at: string;
  direction: "inbound" | "outbound";
  message: string;
  is_automated: boolean;
  channel: Channel;
};

type Props = {
  messages: ThreadMessage[];
  mode: "ai" | "human";
};

function bubbleBg(direction: "inbound" | "outbound") {
  if (direction === "inbound") return "bg-[#F4F4F2]";
  return "bg-[#0D2818] border border-[#10311f]";
}

function bubbleAlign(direction: "inbound" | "outbound") {
  return direction === "inbound" ? "justify-start" : "justify-end";
}

export default function ConversationThread({ messages, mode }: Props) {
  return (
    <div className="border border-[#E8E8E8] rounded-xl p-5">
      <div className="text-[#555] text-[11px] uppercase tracking-[0.2em] font-semibold">Conversation</div>

      <div className="mt-4 space-y-3 max-h-[65vh] overflow-auto pr-2">
        {messages.length === 0 ? (
          <div className="text-[#444] text-[13px] p-6 text-center border border-[#E8E8E8] rounded-xl">
            No conversation yet.
          </div>
        ) : (
          messages.map((m) => {
            const align = bubbleAlign(m.direction);
            return (
              <div key={m.id} className={`flex ${align}`}>
                <div
                  className={`max-w-[520px] rounded-xl px-4 py-3 border border-[#E8E8E8] ${bubbleBg(
                    m.direction
                  )}`}
                >
                  <div className="text-[13px] leading-relaxed">{m.message}</div>
                  <div className="mt-1 text-[11px] opacity-80">
                    {formatDistanceToNow(new Date(m.created_at), { addSuffix: false })} ago
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-[#E8E8E8]">
        {mode === "ai" ? (
          <div className="text-[#555] text-[13px]">
            Vaani is handling this conversation.
            <div className="mt-2">
              <button className="text-[#0A0A0A] bg-[#F4F4F2] border border-[#E8E8E8] rounded-lg px-3 py-2 text-[13px]">
                Take over manually
              </button>
            </div>
          </div>
        ) : (
          <div className="text-[#555] text-[13px]">Manual mode enabled (reply UI will be added later).</div>
        )}
      </div>
    </div>
  );
}

