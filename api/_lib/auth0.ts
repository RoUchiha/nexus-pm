import { createHash, randomBytes } from 'node:crypto';

export function auth0Origin(): string {
  const configuredDomain = process.env.AUTH0_DOMAIN;
  if (!configuredDomain) throw new Error('Auth0 unavailable');
  const url = new URL(
    configuredDomain.startsWith('https://') ? configuredDomain : `https://${configuredDomain}`,
  );
  if (url.protocol !== 'https:' || !url.hostname.endsWith('.auth0.com')) {
    throw new Error('Invalid Auth0 domain');
  }
  return url.origin;
}

export function authBaseUrl(): string {
  const value = process.env.AUTH0_BASE_URL;
  if (!value) throw new Error('Auth base URL unavailable');
  const url = new URL(value);
  if (url.protocol !== 'https:' && url.hostname !== 'localhost') {
    throw new Error('Invalid auth base URL');
  }
  return url.origin;
}

export function clientId(): string {
  if (!process.env.AUTH0_CLIENT_ID) throw new Error('Auth0 client unavailable');
  return process.env.AUTH0_CLIENT_ID;
}

export function clientSecret(): string {
  if (!process.env.AUTH0_CLIENT_SECRET) throw new Error('Auth0 client unavailable');
  return process.env.AUTH0_CLIENT_SECRET;
}

export function randomUrlSafe(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

export function codeChallenge(verifier: string): string {
  return createHash('sha256').update(verifier).digest('base64url');
}
