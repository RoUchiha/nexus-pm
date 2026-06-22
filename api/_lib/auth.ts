import { verifyToken } from '@clerk/backend';
import { HttpError, requestHeader, type VercelRequest } from './http.js';
import { readSession } from './session.js';

export interface Principal {
  userId: string;
  tenantId: string;
}

export async function requirePrincipal(request: VercelRequest): Promise<Principal> {
  if (process.env.AUTH0_DOMAIN) {
    const session = readSession(request);
    if (session) {
      requireSameOriginForMutation(request);
      return {
        userId: session.sub,
        tenantId: session.organizationId || `user:${session.sub}`,
      };
    }
  }

  const token = requestHeader(request, 'authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) throw new HttpError(401, 'Unauthorized');

  if (process.env.AUTH0_DOMAIN) {
    return requireAuth0Principal(token, process.env.AUTH0_DOMAIN);
  }

  return requireClerkPrincipal(token);
}

function requireSameOriginForMutation(request: VercelRequest): void {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method ?? 'GET')) return;

  const configuredBaseUrl = process.env.AUTH0_BASE_URL;
  const origin = requestHeader(request, 'origin');
  if (!configuredBaseUrl || !origin || new URL(configuredBaseUrl).origin !== origin) {
    throw new HttpError(403, 'Forbidden');
  }
}

async function requireAuth0Principal(token: string, configuredDomain: string): Promise<Principal> {
  try {
    const origin = auth0Origin(configuredDomain);
    const response = await fetch(`${origin}/userinfo`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) throw new Error('Auth0 rejected token');
    const claims = (await response.json()) as Record<string, unknown>;
    const userId = typeof claims.sub === 'string' ? claims.sub : '';
    const organizationId = typeof claims.org_id === 'string' ? claims.org_id : '';
    if (!userId) throw new Error('Missing subject');
    return { userId, tenantId: organizationId || `user:${userId}` };
  } catch {
    throw new HttpError(401, 'Unauthorized');
  }
}

function auth0Origin(configuredDomain: string): string {
  const url = new URL(
    configuredDomain.startsWith('https://') ? configuredDomain : `https://${configuredDomain}`,
  );
  if (url.protocol !== 'https:' || !url.hostname.endsWith('.auth0.com')) {
    throw new Error('Invalid Auth0 domain');
  }
  return url.origin;
}

async function requireClerkPrincipal(token: string): Promise<Principal> {
  const jwtKey = process.env.CLERK_JWT_KEY;
  const secretKey = process.env.CLERK_SECRET_KEY;
  const authorizedParties = process.env.CLERK_AUTHORIZED_PARTIES?.split(',')
    .map((party) => party.trim())
    .filter(Boolean);

  if ((!jwtKey && !secretKey) || !authorizedParties?.length) {
    throw new HttpError(401, 'Unauthorized');
  }

  try {
    const claims = (await verifyToken(token, {
      ...(jwtKey ? { jwtKey } : { secretKey }),
      authorizedParties,
    })) as Record<string, unknown>;
    const userId = typeof claims.sub === 'string' ? claims.sub : '';
    const organizationId = typeof claims.org_id === 'string' ? claims.org_id : '';
    if (!userId) throw new Error('Missing subject');
    return { userId, tenantId: organizationId || `user:${userId}` };
  } catch {
    throw new HttpError(401, 'Unauthorized');
  }
}
