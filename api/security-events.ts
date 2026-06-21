import { randomUUID } from 'node:crypto';
import { recordSecurityEvent, type SecurityEventType } from './_lib/audit.js';
import { requirePrincipal } from './_lib/auth.js';

const ALLOWED_TYPES = new Set<SecurityEventType>([
  'client.mission.started',
  'client.mission.aborted',
  'client.mission.failed',
]);

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  try {
    const principal = await requirePrincipal(request);
    const body = (await request.json()) as Record<string, unknown>;
    const type = body.type as SecurityEventType;
    const correlationId = typeof body.correlationId === 'string' ? body.correlationId : '';
    if (!ALLOWED_TYPES.has(type) || !/^[a-zA-Z0-9_-]{8,120}$/.test(correlationId)) {
      return new Response('Invalid event', { status: 400 });
    }
    await recordSecurityEvent({
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      correlationId,
      tenantId: principal.tenantId,
      userId: principal.userId,
      type,
      outcome: type === 'client.mission.started' ? 'success' : 'failure',
      errorCode: typeof body.errorCode === 'string' ? body.errorCode.slice(0, 80) : undefined,
    });
    return new Response(null, { status: 204 });
  } catch (error) {
    return error instanceof Response
      ? error
      : new Response('Event persistence failed', { status: 503 });
  }
}
