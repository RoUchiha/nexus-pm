import { readSession } from '../_lib/session.js';
import { disableCaching, type VercelRequest, type VercelResponse } from '../_lib/http.js';

export default function handler(request: VercelRequest, response: VercelResponse): void {
  disableCaching(response);
  if (request.method !== 'GET') {
    response.status(405).send('Method not allowed');
    return;
  }
  const session = readSession(request);
  if (!session) {
    response.status(200).json({ authenticated: false });
    return;
  }
  response.status(200).json({
    authenticated: true,
    user: { name: session.name, email: session.email, picture: session.picture },
  });
}
