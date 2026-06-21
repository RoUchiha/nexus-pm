import { Redis } from '@upstash/redis';

let redis: Redis | null = null;

export function getRedis(): Redis {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    throw new Response('Control plane unavailable', { status: 503 });
  }
  redis ??= Redis.fromEnv();
  return redis;
}
