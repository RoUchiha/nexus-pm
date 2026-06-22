import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { requestHeader, type VercelRequest } from './http.js';

const SESSION_COOKIE = '__Host-nexus_session';
const TRANSACTION_COOKIE = '__Host-nexus_oauth';

export interface SessionData {
  sub: string;
  name?: string;
  email?: string;
  picture?: string;
  organizationId?: string;
  expiresAt: number;
}

export interface OAuthTransaction {
  state: string;
  codeVerifier: string;
  returnTo: string;
  expiresAt: number;
}

function encryptionKey(): Buffer {
  const secret = process.env.AUTH0_SECRET;
  if (!secret || secret.length < 32) throw new Error('Auth session unavailable');
  return createHash('sha256').update(secret).digest();
}

function seal(value: unknown, purpose: 'session' | 'oauth'): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  cipher.setAAD(Buffer.from(`nexus:${purpose}:v1`));
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), ciphertext].map((part) => part.toString('base64url')).join('.');
}

function unseal<T>(value: string, purpose: 'session' | 'oauth'): T | null {
  try {
    const parts = value.split('.');
    if (parts.length !== 3) return null;
    const [iv, tag, ciphertext] = parts.map((part) => Buffer.from(part, 'base64url'));
    const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), iv);
    decipher.setAAD(Buffer.from(`nexus:${purpose}:v1`));
    decipher.setAuthTag(tag);
    return JSON.parse(
      Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8'),
    ) as T;
  } catch {
    return null;
  }
}

function cookies(request: VercelRequest): Record<string, string> {
  const header = requestHeader(request, 'cookie') ?? '';
  return Object.fromEntries(
    header
      .split(';')
      .map((part) => part.trim().split('='))
      .filter(([name, value]) => Boolean(name && value))
      .map(([name, ...value]) => [name, decodeURIComponent(value.join('='))]),
  );
}

function cookie(name: string, value: string, maxAge: number): string {
  return `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;
}

export function createSessionCookie(session: SessionData): string {
  return cookie(SESSION_COOKIE, seal(session, 'session'), 8 * 60 * 60);
}

export function createTransactionCookie(transaction: OAuthTransaction): string {
  return cookie(TRANSACTION_COOKIE, seal(transaction, 'oauth'), 10 * 60);
}

export function clearSessionCookie(): string {
  return cookie(SESSION_COOKIE, '', 0);
}

export function clearTransactionCookie(): string {
  return cookie(TRANSACTION_COOKIE, '', 0);
}

export function readSession(request: VercelRequest): SessionData | null {
  const value = cookies(request)[SESSION_COOKIE];
  const session = value ? unseal<SessionData>(value, 'session') : null;
  return session && session.expiresAt > Date.now() ? session : null;
}

export function readTransaction(request: VercelRequest): OAuthTransaction | null {
  const value = cookies(request)[TRANSACTION_COOKIE];
  const transaction = value ? unseal<OAuthTransaction>(value, 'oauth') : null;
  return transaction && transaction.expiresAt > Date.now() ? transaction : null;
}
