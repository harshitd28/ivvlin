import { createSupabaseServerClient } from "@/lib/supabase/server";
import AdminWebhookEvents, { type WebhookEventRow } from "@/components/admin/AdminWebhookEvents";

export default async function AdminWebhooksPage({
  searchParams,
}: {
  searchParams?: Promise<{ scope?: string }>;
}) {
  const sp = searchParams ? await searchParams : {};
  const scope = sp.scope === "all" ? "all" : "orphan";

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return (
      <AdminWebhookEvents rows={[]} scope={scope} loadError="Supabase is not configured." />
    );
  }

  let q = supabase
    .from("webhook_delivery_events")
    .select("id, created_at, client_id, source, event_kind, outcome, error_message, detail")
    .order("created_at", { ascending: false })
    .limit(200);

  if (scope === "orphan") {
    q = q.is("client_id", null);
  }

  const { data, error } = await q;
  const rows = (data ?? []) as WebhookEventRow[];

  return (
    <AdminWebhookEvents rows={rows} scope={scope as "orphan" | "all"} loadError={error?.message ?? null} />
  );
}
