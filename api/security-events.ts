import { randomUUID } from 'node:crypto';
import { recordSecurityEvent, type SecurityEventType } from './_lib/audit.js';
import { requirePrincipal } from './_lib/auth.js';
import { requestBody, sendError, type VercelRequest, type VercelResponse } from './_lib/http.js';

const ALLOWED_TYPES = new Set<SecurityEventType>([
  'client.mission.started',
  'client.mission.aborted',
  'client.mission.failed',
]);

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
): Promise<void> {
  if (request.method !== 'POST') {
    response.status(405).send('Method not allowed');
    return;
  }
  try {
    const principal = await requirePrincipal(request);
    const body = requestBody(request) as Record<string, unknown>;
    const type = body?.type as SecurityEventType;
    const correlationId = typeof body?.correlationId === 'string' ? body.correlationId : '';
    if (!ALLOWED_TYPES.has(type) || !/^[a-zA-Z0-9_-]{8,120}$/.test(correlationId)) {
      response.status(400).send('Invalid event');
      return;
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
    response.status(204).end();
  } catch (error) {
    sendError(response, error, 'Event persistence failed');
  }
}
