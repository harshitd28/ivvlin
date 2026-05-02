import { handleCronAll } from "@/lib/cron/handlers";

/** Runs outbound drain → SLA sweep → scheduled campaigns in one request (same Bearer auth). */
export const GET = handleCronAll;
export const POST = handleCronAll;
