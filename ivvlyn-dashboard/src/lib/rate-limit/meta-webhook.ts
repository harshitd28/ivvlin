import Redis from "ioredis";

let redis: Redis | null | undefined;

function getRedis(): Redis | null {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  if (redis === undefined) {
    try {
      redis = new Redis(url, { maxRetriesPerRequest: 2, enableReadyCheck: false });
    } catch {
      redis = null;
    }
  }
  return redis;
}

/**
 * Sliding-window-ish guard for Meta webhook POST floods (per caller IP).
 * Disabled when REDIS_URL is unset (single-region cron still recommended).
 */
export async function rateLimitMetaWebhook(ip: string): Promise<{ ok: boolean; retryAfter?: number }> {
  const client = getRedis();
  if (!client) return { ok: true };

  const maxPerMinute = Math.max(
    60,
    Math.min(5000, Number(process.env.META_WEBHOOK_RATE_PER_MIN ?? "400") || 400)
  );
  const key = `rl:meta-webhook:${ip}`;
  try {
    const n = await client.incr(key);
    if (n === 1) await client.expire(key, 60);
    if (n > maxPerMinute) return { ok: false, retryAfter: 60 };
    return { ok: true };
  } catch {
    return { ok: true };
  }
}
