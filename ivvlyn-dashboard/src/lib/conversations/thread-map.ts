import type { Channel } from "@/lib/types";

/** Mirrors `ThreadMessage` from ConversationThread without importing client module. */
export type ThreadMessageShape = {
  id: string;
  created_at: string;
  direction: "inbound" | "outbound";
  message: string;
  is_automated: boolean;
  channel: Channel;
  status?: string | null;
  lifecycle_state?: string | null;
};

/** Raw row from rolled-out `public.conversations` (and legacy-compatible aliases). */
export type ConversationRowInput = {
  id: string;
  /** Rolled-out schema */
  content?: string | null;
  timestamp?: string | null;
  /** Legacy columns some DBs still have */
  message?: string | null;
  created_at?: string | null;
  direction?: string | null;
  channel?: string | null;
  sender?: string | null;
  metadata?: Record<string, unknown> | null;
  conversation_status?: string | null;
  status?: string | null;
  lifecycle_state?: string | null;
};

export function conversationBody(row: ConversationRowInput): string {
  const c = row.content ?? row.message;
  return typeof c === "string" ? c : "";
}

export function conversationTimeIso(row: ConversationRowInput): string {
  const t = row.timestamp ?? row.created_at;
  return typeof t === "string" ? t : new Date().toISOString();
}

function metaBool(m: Record<string, unknown> | null | undefined, k: string): boolean {
  if (!m || typeof m[k] !== "boolean") return false;
  return m[k] as boolean;
}

export function rowToThreadMessage(row: ConversationRowInput): ThreadMessageShape {
  const meta = row.metadata ?? null;
  const dir = row.direction === "inbound" || row.direction === "outbound" ? row.direction : "inbound";
  const channel = (row.channel ?? "whatsapp") as Channel;
  const status =
    (typeof row.conversation_status === "string" ? row.conversation_status : null) ??
    (typeof row.status === "string" ? row.status : null) ??
    undefined;
  const lifecycle =
    (typeof row.lifecycle_state === "string" ? row.lifecycle_state : null) ??
    (typeof meta?.queue_status === "string" ? (meta.queue_status as string) : null) ??
    (typeof meta?.delivery_status === "string" ? (meta.delivery_status as string) : null) ??
    undefined;

  return {
    id: row.id,
    created_at: conversationTimeIso(row),
    direction: dir,
    message: conversationBody(row),
    is_automated: metaBool(meta, "is_automated") || row.sender === "system",
    channel,
    status,
    lifecycle_state: lifecycle ?? undefined,
  };
}
