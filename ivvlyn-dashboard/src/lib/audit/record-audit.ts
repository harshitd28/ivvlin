import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type AuditPayload = {
  actorUserId: string;
  clientId: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  detail?: Record<string, unknown>;
};

/** Best-effort insert; failures never throw to callers. */
export function recordAuditEvent(payload: AuditPayload): void {
  const svc = createServiceRoleClient();
  if (!svc) return;

  void svc
    .from("audit_events")
    .insert({
      actor_user_id: payload.actorUserId,
      client_id: payload.clientId,
      action: payload.action,
      resource_type: payload.resourceType,
      resource_id: payload.resourceId ?? null,
      detail: payload.detail ?? {},
    })
    .then(({ error }) => {
      if (error) console.error("[audit_events]", error.message);
    });
}
