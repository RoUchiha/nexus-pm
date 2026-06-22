import { requirePrincipal } from '../_lib/auth.js';
import {
  disableCaching,
  sendError,
  type VercelRequest,
  type VercelResponse,
} from '../_lib/http.js';
import { configuredProviderIds } from '../_lib/providers.js';

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
): Promise<void> {
  disableCaching(response);
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    response.status(405).send('Method not allowed');
    return;
  }

  try {
    await requirePrincipal(request);
    response.status(200).json({ providers: configuredProviderIds() });
  } catch (error) {
    sendError(response, error);
  }
}
