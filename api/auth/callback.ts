import { auth0Origin, authBaseUrl, clientId, clientSecret } from '../_lib/auth0.js';
import {
  clearTransactionCookie,
  createSessionCookie,
  readTransaction,
  type SessionData,
} from '../_lib/session.js';
import type { VercelRequest, VercelResponse } from '../_lib/http.js';

function queryValue(request: VercelRequest, name: string): string {
  const value = request.query?.[name];
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
): Promise<void> {
  if (request.method !== 'GET') {
    response.status(405).send('Method not allowed');
    return;
  }
  const transaction = readTransaction(request);
  const state = queryValue(request, 'state');
  const code = queryValue(request, 'code');
  if (!transaction || !state || state !== transaction.state || !code) {
    response.setHeader('Set-Cookie', clearTransactionCookie());
    response.setHeader('Location', '/?auth_error=invalid_callback');
    response.status(302).end();
    return;
  }
  try {
    const baseUrl = authBaseUrl();
    const tokenResponse = await fetch(`${auth0Origin()}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId(),
        client_secret: clientSecret(),
        code,
        code_verifier: transaction.codeVerifier,
        redirect_uri: baseUrl,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    const tokens = (await tokenResponse.json()) as { access_token?: string };
    if (!tokenResponse.ok || !tokens.access_token) throw new Error('Token exchange failed');
    const userResponse = await fetch(`${auth0Origin()}/userinfo`, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
      signal: AbortSignal.timeout(10_000),
    });
    const user = (await userResponse.json()) as Record<string, unknown>;
    if (!userResponse.ok || typeof user.sub !== 'string') throw new Error('User lookup failed');
    const session: SessionData = {
      sub: user.sub,
      name: typeof user.name === 'string' ? user.name : undefined,
      email: typeof user.email === 'string' ? user.email : undefined,
      picture: typeof user.picture === 'string' ? user.picture : undefined,
      organizationId: typeof user.org_id === 'string' ? user.org_id : undefined,
      expiresAt: Date.now() + 8 * 60 * 60 * 1_000,
    };
    response.setHeader('Set-Cookie', createSessionCookie(session));
    response.setHeader('Location', transaction.returnTo);
    response.status(302).end();
  } catch (error) {
    console.error(
      JSON.stringify({
        category: 'auth0-callback-failed',
        errorCode: error instanceof Error ? error.message : 'UnknownError',
      }),
    );
    response.setHeader('Set-Cookie', clearTransactionCookie());
    response.setHeader('Location', '/?auth_error=callback_failed');
    response.status(302).end();
  }
}
