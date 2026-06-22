import { auth0Origin, authBaseUrl, clientId } from '../_lib/auth0.js';
import { clearSessionCookie } from '../_lib/session.js';
import type { VercelRequest, VercelResponse } from '../_lib/http.js';

export default function handler(request: VercelRequest, response: VercelResponse): void {
  if (request.method !== 'GET' && request.method !== 'POST') {
    response.status(405).send('Method not allowed');
    return;
  }
  response.setHeader('Set-Cookie', clearSessionCookie());
  try {
    const logout = new URL('/v2/logout', auth0Origin());
    logout.search = new URLSearchParams({
      client_id: clientId(),
      returnTo: authBaseUrl(),
    }).toString();
    response.setHeader('Location', logout.toString());
  } catch {
    response.setHeader('Location', '/');
  }
  response.status(302).end();
}
