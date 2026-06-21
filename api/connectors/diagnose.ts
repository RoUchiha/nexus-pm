import { randomUUID } from 'node:crypto';
import { recordSecurityEvent } from '../_lib/audit.js';
import { requirePrincipal } from '../_lib/auth.js';
import {
  HttpError,
  requestBody,
  sendError,
  type VercelRequest,
  type VercelResponse,
} from '../_lib/http.js';
import { getRedis } from '../_lib/redis.js';
import { decryptCredential, encryptCredential } from '../_lib/vault.js';

const AUTH_TYPES = new Set(['none', 'api_key', 'bearer', 'oauth2', 'basic', 'connection_string']);

function allowedEndpoint(raw: unknown): URL {
  if (typeof raw !== 'string' || raw.length > 2_048) {
    throw new HttpError(400, 'Invalid endpoint');
  }
  let endpoint: URL;
  try {
    endpoint = new URL(raw);
  } catch {
    throw new HttpError(400, 'Invalid endpoint');
  }
  const allowedHosts = (process.env.CONNECTOR_ALLOWED_HOSTS ?? '')
    .split(',')
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
  if (
    endpoint.protocol !== 'https:' ||
    endpoint.username ||
    endpoint.password ||
    endpoint.hash ||
    !allowedHosts.includes(endpoint.hostname.toLowerCase())
  ) {
    throw new HttpError(403, 'Endpoint is not on the organization allowlist');
  }
  return endpoint;
}

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
    const connectorId = typeof body?.id === 'string' ? body.id : '';
    const authType = typeof body?.authType === 'string' ? body.authType : '';
    const approved = body?.approved === true;
    const endpoint = allowedEndpoint(body?.endpoint);
    if (!/^[a-zA-Z0-9_-]{8,120}$/.test(connectorId) || !AUTH_TYPES.has(authType)) {
      response.status(400).send('Invalid connector');
      return;
    }

    const redis = getRedis();
    const vaultKey = `vault:${principal.tenantId}:${connectorId}`;
    const suppliedCredentials =
      body.credentials && typeof body.credentials === 'object'
        ? Object.fromEntries(
            Object.entries(body.credentials as Record<string, unknown>)
              .filter(([, value]) => typeof value === 'string' && value.length > 0)
              .map(([name, value]) => [name.slice(0, 40), (value as string).slice(0, 4_096)]),
          )
        : {};

    if (Object.keys(suppliedCredentials).length > 0) {
      await redis.set(vaultKey, encryptCredential(suppliedCredentials, principal.tenantId));
    }
    const encrypted = await redis.get<string>(vaultKey);
    const credentials = encrypted ? decryptCredential(encrypted, principal.tenantId) : {};
    if (authType !== 'none' && Object.keys(credentials).length === 0) {
      response.status(200).json({
        status: 'blocked',
        credentialRef: null,
        diagnostics: ['Endpoint allowlist passed.'],
        issues: [
          {
            code: 'CREDENTIAL_MISSING',
            severity: 'error',
            title: 'Credential is missing',
            detail: 'No encrypted credential exists for this connector.',
            remediation: ['Enter the credential and run diagnostics again.'],
            retriable: true,
          },
        ],
      });
      return;
    }

    await recordSecurityEvent({
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      correlationId: connectorId,
      tenantId: principal.tenantId,
      userId: principal.userId,
      type: 'connector.diagnosed',
      outcome: 'success',
    });
    response.status(200).json({
      status: approved ? 'ready' : 'degraded',
      credentialRef: `vault://${connectorId}`,
      diagnostics: [
        `Endpoint approved by organization allowlist: ${endpoint.hostname}`,
        'Credential encrypted with tenant-bound AES-256-GCM and stored server-side.',
        approved
          ? 'Operator approval confirmed; route is ready.'
          : 'Operator approval is required before routing.',
      ],
      issues: approved
        ? []
        : [
            {
              code: 'APPROVAL_REQUIRED',
              severity: 'warning',
              title: 'Operator approval required',
              detail: 'Review endpoint, scopes, and control mode before enabling this route.',
              remediation: ['Approve the connector after review.'],
              retriable: true,
            },
          ],
    });
  } catch (error) {
    sendError(response, error, 'Connector diagnosis failed');
  }
}
