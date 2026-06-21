import { getRedis } from './redis.js';

const limit = (name: string, fallback: number, maximum: number): number => {
  const parsed = Number.parseInt(process.env[name] ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, maximum) : fallback;
};

export async function acquireProviderLease(
  tenantId: string,
  estimatedInputCharacters: number,
): Promise<() => Promise<void>> {
  const redis = getRedis();
  const now = Date.now();
  const minuteKey = `quota:${tenantId}:minute:${Math.floor(now / 60_000)}`;
  const dayKey = `quota:${tenantId}:day:${new Date(now).toISOString().slice(0, 10)}`;
  const concurrencyKey = `quota:${tenantId}:concurrency`;
  const inputBudgetKey = `${dayKey}:input-characters`;

  const [minuteCount, dayCount, concurrentCount, inputCharacters] = await Promise.all([
    redis.incr(minuteKey),
    redis.incr(dayKey),
    redis.incr(concurrencyKey),
    redis.incrby(inputBudgetKey, estimatedInputCharacters),
  ]);
  await Promise.all([
    redis.expire(minuteKey, 120),
    redis.expire(dayKey, 172_800),
    redis.expire(concurrencyKey, 300),
    redis.expire(inputBudgetKey, 172_800),
  ]);

  const exceeded =
    minuteCount > limit('LLM_REQUESTS_PER_MINUTE', 30, 1_000) ||
    dayCount > limit('LLM_REQUESTS_PER_DAY', 2_000, 100_000) ||
    concurrentCount > limit('LLM_MAX_CONCURRENCY', 4, 100) ||
    inputCharacters > limit('LLM_DAILY_INPUT_CHARACTERS', 5_000_000, 1_000_000_000);

  if (exceeded) {
    await redis.decr(concurrencyKey);
    throw new Response('Provider quota exceeded', {
      status: 429,
      headers: { 'Retry-After': '60' },
    });
  }

  let released = false;
  return async () => {
    if (released) return;
    released = true;
    await redis.decr(concurrencyKey);
  };
}
