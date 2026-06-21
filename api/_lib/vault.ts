import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { HttpError } from './http.js';

function key(): Buffer {
  const encoded = process.env.CONNECTOR_VAULT_KEY;
  if (!encoded) throw new HttpError(503, 'Connector vault unavailable');
  const decoded = Buffer.from(encoded, 'base64');
  if (decoded.length !== 32) throw new HttpError(503, 'Connector vault unavailable');
  return decoded;
}

export function encryptCredential(value: unknown, tenantId: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  cipher.setAAD(Buffer.from(tenantId));
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), ciphertext].map((part) => part.toString('base64url')).join('.');
}

export function decryptCredential(value: string, tenantId: string): Record<string, string> {
  const [iv, tag, ciphertext] = value.split('.').map((part) => Buffer.from(part, 'base64url'));
  if (!iv || !tag || !ciphertext) throw new Error('Invalid vault record');
  const decipher = createDecipheriv('aes-256-gcm', key(), iv);
  decipher.setAAD(Buffer.from(tenantId));
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  return JSON.parse(plaintext) as Record<string, string>;
}
