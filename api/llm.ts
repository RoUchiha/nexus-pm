import { randomUUID } from 'node:crypto';
import { recordSecurityEvent } from './_lib/audit.js';
import { requirePrincipal, type Principal } from './_lib/auth.js';
import { invokeProvider, validateBrokerRequest } from './_lib/providers.js';
import { acquireProviderLease } from './_lib/quota.js';

export const config = { maxDuration: 120 };

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const correlationId = request.headers.get('x-correlation-id') || randomUUID();
  const startedAt = Date.now();
  let release: (() => Promise<void>) | null = null;
  let principal: Principal | null = null;
  let providerId: string | undefined;

  try {
    principal = await requirePrincipal(request);
    const body = validateBrokerRequest(await request.json());
    providerId = body.providerId;
    const estimatedInputCharacters =
      body.system.length +
      body.messages.reduce((total, message) => total + message.content.length, 0);
    release = await acquireProviderLease(principal.tenantId, estimatedInputCharacters);
    await recordSecurityEvent({
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      correlationId,
      tenantId: principal.tenantId,
      userId: principal.userId,
      type: 'llm.request.started',
      outcome: 'success',
      providerId: body.providerId,
    });

    const timeout = AbortSignal.timeout(90_000);
    const text = await invokeProvider(body, timeout);
    await recordSecurityEvent({
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      correlationId,
      tenantId: principal.tenantId,
      userId: principal.userId,
      type: 'llm.request.completed',
      outcome: 'success',
      providerId: body.providerId,
      durationMs: Date.now() - startedAt,
    }).catch((auditError) => {
      console.error(
        JSON.stringify({
          category: 'security-audit-write-failed',
          correlationId,
          errorCode: auditError instanceof Error ? auditError.name : 'UnknownError',
        }),
      );
    });
    return Response.json({ text, correlationId });
  } catch (error) {
    if (principal) {
      await recordSecurityEvent({
        id: randomUUID(),
        timestamp: new Date().toISOString(),
        correlationId,
        tenantId: principal.tenantId,
        userId: principal.userId,
        type: 'llm.request.failed',
        outcome: error instanceof Response && error.status === 429 ? 'denied' : 'failure',
        providerId,
        durationMs: Date.now() - startedAt,
        errorCode:
          error instanceof Response
            ? `HTTP_${error.status}`
            : error instanceof Error
              ? error.name
              : 'UnknownError',
      }).catch(() => undefined);
    }
    if (error instanceof Response) return error;
    console.error(
      JSON.stringify({
        category: 'llm-broker-error',
        correlationId,
        errorCode: error instanceof Error ? error.name : 'UnknownError',
      }),
    );
    return Response.json({ error: 'Provider request failed', correlationId }, { status: 502 });
  } finally {
    if (release) await release().catch(() => undefined);
  }
}
