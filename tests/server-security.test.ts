import { afterEach, describe, expect, it, vi } from 'vitest';
import llmHandler from '../api/llm';
import securityEventsHandler from '../api/security-events';
import { validateBrokerRequest } from '../api/_lib/providers';
import { decryptCredential, encryptCredential } from '../api/_lib/vault';

afterEach(() => vi.restoreAllMocks());

describe('server control plane', () => {
  it('fails closed before contacting a provider when authentication is absent', async () => {
    const providerFetch = vi.spyOn(globalThis, 'fetch');
    const response = await llmHandler(
      new Request('https://nexus.example.com/api/llm', {
        method: 'POST',
        body: JSON.stringify({}),
      }),
    );

    expect(response.status).toBe(401);
    expect(providerFetch).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated audit event writes', async () => {
    const response = await securityEventsHandler(
      new Request('https://nexus.example.com/api/security-events', {
        method: 'POST',
        body: JSON.stringify({ type: 'client.mission.started', correlationId: '12345678' }),
      }),
    );

    expect(response.status).toBe(401);
  });

  it('allowlists providers and bounds prompt inputs', () => {
    expect(() =>
      validateBrokerRequest({
        providerId: 'attacker-controlled',
        model: 'model',
        system: 'system',
        messages: [{ role: 'user', content: 'hello' }],
      }),
    ).toThrow();

    expect(() =>
      validateBrokerRequest({
        providerId: 'openai',
        model: 'model',
        system: 'x'.repeat(6_001),
        messages: [{ role: 'user', content: 'hello' }],
      }),
    ).toThrow();
  });

  it('encrypts connector credentials with tenant-bound authenticated encryption', () => {
    const previous = process.env.CONNECTOR_VAULT_KEY;
    process.env.CONNECTOR_VAULT_KEY = Buffer.alloc(32, 7).toString('base64');
    try {
      const encrypted = encryptCredential({ token: 'dummy-secret' }, 'tenant-a');
      expect(encrypted).not.toContain('dummy-secret');
      expect(decryptCredential(encrypted, 'tenant-a')).toEqual({ token: 'dummy-secret' });
      expect(() => decryptCredential(encrypted, 'tenant-b')).toThrow();
    } finally {
      if (previous === undefined) delete process.env.CONNECTOR_VAULT_KEY;
      else process.env.CONNECTOR_VAULT_KEY = previous;
    }
  });
});
