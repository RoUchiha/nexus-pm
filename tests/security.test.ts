import { afterEach, describe, expect, it, vi } from 'vitest';
import { invokeBroker, setPublicDemoMode } from '../src/lib/broker';
import {
  normalizeExternalEndpoint,
  normalizeLocalProviderBaseUrl,
  sanitizeInput,
} from '../src/lib/security';

afterEach(() => {
  setPublicDemoMode(false);
  vi.restoreAllMocks();
});

describe('public demo isolation', () => {
  it('fails locally without making a managed provider request', async () => {
    setPublicDemoMode(true);
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const onError = vi.fn();

    await invokeBroker(
      'openai',
      'dummy-model',
      'system',
      [{ role: 'user', content: 'dummy mission' }],
      { onChunk: vi.fn(), onComplete: vi.fn(), onError },
    );

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Managed providers are disabled in the public demo.' }),
    );
  });
});

describe('endpoint policy', () => {
  it.each([
    'http://api.example.com',
    'https://localhost/api',
    'https://127.0.0.1/api',
    'https://10.2.3.4/api',
    'https://172.20.1.1/api',
    'https://192.168.1.2/api',
    'https://169.254.169.254/latest/meta-data',
    'https://service.local/api',
    'https://0.0.0.0/api',
    'https://100.64.0.1/api',
    'https://[::]/api',
    'https://[::ffff:127.0.0.1]/api',
    'https://user:password@example.com/api',
    'https://example.com/api#secret',
  ])('blocks unsafe external endpoint %s', (endpoint) => {
    expect(() => normalizeExternalEndpoint(endpoint)).toThrow();
  });

  it('normalizes a public HTTPS endpoint', () => {
    expect(normalizeExternalEndpoint(' https://api.example.com/v1/ ')).toBe(
      'https://api.example.com/v1',
    );
  });

  it('only permits the exact local provider origin', () => {
    expect(normalizeLocalProviderBaseUrl('http://127.0.0.1:11434')).toBe('http://127.0.0.1:11434');
    expect(() => normalizeLocalProviderBaseUrl('http://127.0.0.1:11434/admin')).toThrow();
    expect(() => normalizeLocalProviderBaseUrl('http://localhost:8080')).toThrow();
  });
});

describe('untrusted input', () => {
  it('removes executable browser patterns and null bytes', () => {
    const output = sanitizeInput('safe\0<script>alert(1)</script> javascript: onload=');
    expect(output).not.toMatch(/<script|javascript:|onload=|\0/i);
  });
});
