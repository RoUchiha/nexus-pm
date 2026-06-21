import { afterEach, describe, expect, it, vi } from 'vitest';
import llmHandler from '../api/llm';
import securityEventsHandler from '../api/security-events';
import { validateBrokerRequest } from '../api/_lib/providers';
import { decryptCredential, encryptCredential } from '../api/_lib/vault';
import type { VercelRequest, VercelResponse } from '../api/_lib/http';

function request(body: unknown): VercelRequest {
  return { method: 'POST', headers: {}, body };
}

function responseRecorder() {
  const state: { status: number; body?: unknown; headers: Record<string, string> } = {
    status: 200,
    headers: {},
  };
  const response: VercelResponse = {
    status(code) {
      state.status = code;
      return response;
    },
    setHeader(name, value) {
      state.headers[name] = value;
      return response;
    },
    json(body) {
      state.body = body;
    },
    send(body) {
      state.body = body;
    },
    end() {},
  };
  return { response, state };
}

afterEach(() => vi.restoreAllMocks());

describe('server control plane', () => {
  it('fails closed before contacting a provider when authentication is absent', async () => {
    const providerFetch = vi.spyOn(globalThis, 'fetch');
    const recorder = responseRecorder();
    await llmHandler(request({}), recorder.response);

    expect(recorder.state.status).toBe(401);
    expect(providerFetch).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated audit event writes', async () => {
    const recorder = responseRecorder();
    await securityEventsHandler(
      request({ type: 'client.mission.started', correlationId: '12345678' }),
      recorder.response,
    );

    expect(recorder.state.status).toBe(401);
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
