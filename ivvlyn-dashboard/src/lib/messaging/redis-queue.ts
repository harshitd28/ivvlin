const QUEUE_KEY = process.env.REDIS_OUTBOUND_QUEUE_KEY ?? "ivv:outbound:v1";

type RedisClient = import("ioredis").default;

let redisSingleton: RedisClient | null = null;
let redisUnavailable = false;

export async function getRedis(): Promise<RedisClient | null> {
  const url = process.env.REDIS_URL;
  if (!url || redisUnavailable) return null;
  if (redisSingleton) return redisSingleton;
  try {
    const IoRedis = (await import("ioredis")).default;
    redisSingleton = new IoRedis(url, { maxRetriesPerRequest: 2 });
    return redisSingleton;
  } catch {
    redisUnavailable = true;
    return null;
  }
}

/** Fast-lane: job ids are listed here; worker RPOPs before scanning Postgres (higher throughput under burst). */
export async function pushOutboundJobId(jobId: string): Promise<void> {
  const r = await getRedis();
  if (!r) return;
  try {
    await r.lpush(QUEUE_KEY, jobId);
  } catch {
    /* fall back to Postgres-only */
  }
}

export async function popOutboundJobIds(max: number): Promise<string[]> {
  const r = await getRedis();
  if (!r || max <= 0) return [];
  const ids: string[] = [];
  try {
    for (let i = 0; i < max; i++) {
      const id = await r.rpop(QUEUE_KEY);
      if (!id) break;
      ids.push(id);
    }
  } catch {
    return ids;
  }
  return ids;
}
