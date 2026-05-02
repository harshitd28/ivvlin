import { handleProcessQueue } from "@/lib/cron/handlers";

/**
 * Cron / dedicated worker: drain Redis fast-lane + Postgres pending jobs.
 * Prefer `/api/cron/queue` when configuring HTTP crons (supports GET + POST).
 */
export const POST = handleProcessQueue;
