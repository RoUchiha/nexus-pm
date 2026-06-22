import { auth0Origin, authBaseUrl, clientId, codeChallenge, randomUrlSafe } from '../_lib/auth0.js';
import { createTransactionCookie } from '../_lib/session.js';
import type { VercelRequest, VercelResponse } from '../_lib/http.js';

export default function handler(request: VercelRequest, response: VercelResponse): void {
  if (request.method !== 'GET') {
    response.status(405).send('Method not allowed');
    return;
  }
  try {
    const state = randomUrlSafe();
    const codeVerifier = randomUrlSafe(48);
    const baseUrl = authBaseUrl();
    const authorize = new URL('/authorize', auth0Origin());
    authorize.search = new URLSearchParams({
      response_type: 'code',
      response_mode: 'query',
      client_id: clientId(),
      redirect_uri: baseUrl,
      scope: 'openid profile email',
      state,
      code_challenge: codeChallenge(codeVerifier),
      code_challenge_method: 'S256',
    }).toString();
    response.setHeader(
      'Set-Cookie',
      createTransactionCookie({
        state,
        codeVerifier,
        returnTo: '/',
        expiresAt: Date.now() + 600_000,
      }),
    );
    response.setHeader('Location', authorize.toString());
    response.status(302).end();
  } catch {
    response.status(503).send('Authentication unavailable');
  }
}
