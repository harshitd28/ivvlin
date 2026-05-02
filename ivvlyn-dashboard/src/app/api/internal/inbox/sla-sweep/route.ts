import { handleSlaSweep } from "@/lib/cron/handlers";

/**
 * Marks SLA breach timestamp for leads whose first-response deadline has passed.
 * Prefer `/api/cron/sla` for HTTP schedulers (supports GET + POST).
 */
export const POST = handleSlaSweep;
