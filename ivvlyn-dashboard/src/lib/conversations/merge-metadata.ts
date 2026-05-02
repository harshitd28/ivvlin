import type { SupabaseClient } from "@supabase/supabase-js";

export async function mergeConversationMetadata(
  svc: SupabaseClient,
  conversationId: string,
  patch: Record<string, unknown>
) {
  const { data: row } = await svc.from("conversations").select("metadata").eq("id", conversationId).maybeSingle();
  const prev = (row as { metadata?: Record<string, unknown> } | null)?.metadata;
  const base = typeof prev === "object" && prev !== null && !Array.isArray(prev) ? prev : {};
  const meta = { ...base, ...patch };
  await svc
    .from("conversations")
    .update({ metadata: meta, updated_at: new Date().toISOString() })
    .eq("id", conversationId);
}
