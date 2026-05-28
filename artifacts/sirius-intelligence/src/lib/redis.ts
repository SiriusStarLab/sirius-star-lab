import Redis from "ioredis";

let client: Redis | null = null;

function getClient(): Redis {
  if (!client) {
    client = new Redis({
      host: process.env.REDIS_HOST || "127.0.0.1",
      port: parseInt(process.env.REDIS_PORT || "6379"),
      lazyConnect: true,
      retryStrategy: (times) => Math.min(times * 200, 3000),
      maxRetriesPerRequest: 2,
    });
    client.on("error", (err) => {
      console.error("[redis] Error:", err.message);
    });
  }
  return client;
}

export const redis = {
  get: (key: string) => getClient().get(key),
  set: (key: string, value: string, ttlSeconds?: number) =>
    ttlSeconds
      ? getClient().setex(key, ttlSeconds, value)
      : getClient().set(key, value),
  del: (key: string) => getClient().del(key),
  exists: (key: string) => getClient().exists(key),
  ping: () => getClient().ping(),
};

export async function checkRedis(): Promise<boolean> {
  try {
    await redis.ping();
    return true;
  } catch {
    return false;
  }
}
