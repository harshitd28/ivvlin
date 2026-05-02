import { handleProcessQueue } from "@/lib/cron/handlers";

/** GET + POST — same auth (`Authorization: Bearer CRON_SECRET`). GET suits HTTP cron probes that cannot send a body. */
export const GET = handleProcessQueue;
export const POST = handleProcessQueue;
