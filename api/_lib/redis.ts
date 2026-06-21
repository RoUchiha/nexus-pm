import { Redis } from '@upstash/redis';
import { HttpError } from './http.js';

let redis: Redis | null = null;

export function getRedis(): Redis {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    throw new HttpError(503, 'Control plane unavailable');
  }
  redis ??= Redis.fromEnv();
  return redis;
}
