import { getRedis } from './redis.js';

export type SecurityEventType =
  | 'llm.request.started'
  | 'llm.request.completed'
  | 'llm.request.failed'
  | 'client.mission.started'
  | 'client.mission.aborted'
  | 'client.mission.failed'
  | 'connector.diagnosed';

interface SecurityEvent {
  id: string;
  timestamp: string;
  correlationId: string;
  tenantId: string;
  userId: string;
  type: SecurityEventType;
  outcome: 'success' | 'failure' | 'denied';
  providerId?: string;
  durationMs?: number;
  errorCode?: string;
}

export async function recordSecurityEvent(event: SecurityEvent): Promise<void> {
  const redis = getRedis();
  const key = `audit:${event.tenantId}`;
  await redis.lpush(key, JSON.stringify(event));
  await Promise.all([redis.ltrim(key, 0, 9_999), redis.expire(key, 7_776_000)]);
  console.info(JSON.stringify({ category: 'security-audit', ...event }));
}
