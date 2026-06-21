import { randomUUID } from 'node:crypto';
import { recordSecurityEvent } from './_lib/audit.js';
import { requirePrincipal, type Principal } from './_lib/auth.js';
import {
  HttpError,
  requestBody,
  requestHeader,
  sendError,
  type VercelRequest,
  type VercelResponse,
} from './_lib/http.js';
import { invokeProvider, validateBrokerRequest } from './_lib/providers.js';
import { acquireProviderLease } from './_lib/quota.js';

export const config = { maxDuration: 120 };

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
): Promise<void> {
  if (request.method !== 'POST') {
    response.status(405).send('Method not allowed');
    return;
  }

  const correlationId = requestHeader(request, 'x-correlation-id') || randomUUID();
  const startedAt = Date.now();
  let release: (() => Promise<void>) | null = null;
  let principal: Principal | null = null;
  let providerId: string | undefined;

  try {
    principal = await requirePrincipal(request);
    const body = validateBrokerRequest(requestBody(request));
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

    const text = await invokeProvider(body, AbortSignal.timeout(90_000));
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
    response.status(200).json({ text, correlationId });
  } catch (error) {
    if (principal) {
      await recordSecurityEvent({
        id: randomUUID(),
        timestamp: new Date().toISOString(),
        correlationId,
        tenantId: principal.tenantId,
        userId: principal.userId,
        type: 'llm.request.failed',
        outcome: error instanceof HttpError && error.status === 429 ? 'denied' : 'failure',
        providerId,
        durationMs: Date.now() - startedAt,
        errorCode:
          error instanceof HttpError
            ? `HTTP_${error.status}`
            : error instanceof Error
              ? error.name
              : 'UnknownError',
      }).catch(() => undefined);
    }
    if (!(error instanceof HttpError)) {
      console.error(
        JSON.stringify({
          category: 'llm-broker-error',
          correlationId,
          errorCode: error instanceof Error ? error.name : 'UnknownError',
        }),
      );
      response.status(502).json({ error: 'Provider request failed', correlationId });
      return;
    }
    sendError(response, error);
  } finally {
    if (release) await release().catch(() => undefined);
  }
}
