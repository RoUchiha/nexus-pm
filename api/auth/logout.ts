import { auth0Origin, authBaseUrl, clientId } from '../_lib/auth0.js';
import { clearSessionCookie } from '../_lib/session.js';
import { disableCaching, type VercelRequest, type VercelResponse } from '../_lib/http.js';

export default function handler(request: VercelRequest, response: VercelResponse): void {
  disableCaching(response);
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
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
    response.status(200).json({ logoutUrl: logout.toString() });
  } catch {
    response.status(200).json({ logoutUrl: '/' });
  }
}
