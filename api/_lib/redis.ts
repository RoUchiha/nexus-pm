import { Redis } from '@upstash/redis';
import { HttpError } from './http.js';

let redis: Redis | null = null;

export function getRedis(): Redis {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  if (!url || !token) {
    throw new HttpError(503, 'Control plane unavailable');
  }
  redis ??= new Redis({ url, token });
  return redis;
}
