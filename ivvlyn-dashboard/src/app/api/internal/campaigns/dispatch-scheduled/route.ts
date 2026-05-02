import { handleDispatchCampaigns } from "@/lib/cron/handlers";

/**
 * Picks up campaigns in `scheduled` state whose `scheduled_for` is due.
 * Prefer `/api/cron/campaigns` for HTTP schedulers (supports GET + POST).
 */
export const POST = handleDispatchCampaigns;
