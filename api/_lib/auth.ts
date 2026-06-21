import { verifyToken } from '@clerk/backend';
import { HttpError, requestHeader, type VercelRequest } from './http.js';

export interface Principal {
  userId: string;
  tenantId: string;
}

export async function requirePrincipal(request: VercelRequest): Promise<Principal> {
  const token = requestHeader(request, 'authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  const jwtKey = process.env.CLERK_JWT_KEY;
  const authorizedParties = process.env.CLERK_AUTHORIZED_PARTIES?.split(',')
    .map((party) => party.trim())
    .filter(Boolean);

  if (!token || !jwtKey || !authorizedParties?.length) {
    throw new HttpError(401, 'Unauthorized');
  }

  try {
    const claims = (await verifyToken(token, { jwtKey, authorizedParties })) as Record<
      string,
      unknown
    >;
    const userId = typeof claims.sub === 'string' ? claims.sub : '';
    const organizationId = typeof claims.org_id === 'string' ? claims.org_id : '';
    if (!userId) throw new Error('Missing subject');
    return { userId, tenantId: organizationId || `user:${userId}` };
  } catch {
    throw new HttpError(401, 'Unauthorized');
  }
}
