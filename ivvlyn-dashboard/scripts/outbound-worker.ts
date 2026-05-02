/**
 * Long-running outbound drain loop (Postgres pending + optional Redis fast-lane).
 * Run beside the app: `npm run worker:outbound`
 *
 * Env: same as app (`SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, optional `REDIS_URL`, `MESSAGING_SKIP_PROVIDER_SEND`).
 */
import { drainOutboundBatch } from "../src/lib/messaging/dispatch-batch";
import { createServiceRoleClient } from "../src/lib/supabase/service-role";

const POLL_MS = Math.max(250, Number(process.env.WORKER_POLL_MS ?? 1500));
const MAX_JOBS = Math.min(100, Math.max(1, Number(process.env.WORKER_MAX_JOBS ?? 40)));

async function main() {
  const svc = createServiceRoleClient();
  if (!svc) {
    console.error("[outbound-worker] Service role client not configured (SUPABASE_SERVICE_ROLE_KEY / URL).");
    process.exit(1);
  }

  console.log(
    JSON.stringify({
      ok: true,
      at: new Date().toISOString(),
      poll_ms: POLL_MS,
      max_jobs: MAX_JOBS,
      redis: Boolean(process.env.REDIS_URL),
    })
  );

  for (;;) {
    try {
      const r = await drainOutboundBatch(svc, { maxJobs: MAX_JOBS, useRedis: true });
      if (r.completed > 0 || r.redis_ids > 0 || r.postgres_ids > 0) {
        console.log(JSON.stringify({ at: new Date().toISOString(), ...r }));
      }
    } catch (e) {
      console.error("[outbound-worker] batch error", e);
    }
    await new Promise((res) => setTimeout(res, POLL_MS));
  }
}

void main();
