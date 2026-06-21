import { afterEach, describe, expect, it, vi } from 'vitest';
import { extractJsonObject, streamWithFallback } from '../src/lib/providers';
import { parseBusMessages } from '../src/lib/bus';
import type { ResolvedProvider } from '../src/types';

const openAiProvider: ResolvedProvider = {
  definition: {
    id: 'ollama',
    name: 'Test OpenAI',
    tier: 'free',
    tagline: 'test',
    apiKeyRequired: false,
    apiKeyPlaceholder: '',
    baseUrl: 'http://localhost:11434',
    format: 'openai',
    models: [{ id: 'test-model', name: 'Test', roles: ['pod'], contextWindow: 4096 }],
    defaultManagerModel: 'test-model',
    defaultPodModel: 'test-model',
    defaultVerifierModel: 'test-model',
  },
  config: {
    providerId: 'ollama',
    enabled: true,
    apiKey: '',
    managerModel: 'test-model',
    podModel: 'test-model',
    verifierModel: 'test-model',
  },
};

function sseResponse(chunks: string[], failAfterChunks = false): Response {
  const encoder = new TextEncoder();
  return new Response(
    new ReadableStream({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
        if (failAfterChunks) controller.error(new Error('socket reset'));
        else controller.close();
      },
    }),
    { status: 200, headers: { 'Content-Type': 'text/event-stream' } },
  );
}

afterEach(() => vi.restoreAllMocks());

describe('provider response parsing', () => {
  it('extracts a balanced object with nested braces in strings', () => {
    const json = extractJsonObject(
      'prefix {"value":"} still text", "nested":{"ok":true}} suffix {"evil":true}',
    );
    expect(JSON.parse(json ?? '')).toEqual({ value: '} still text', nested: { ok: true } });
  });

  it('returns null for incomplete model output', () => {
    expect(extractJsonObject('{"incomplete": true')).toBeNull();
  });

  it('prefers a JSON code fence', () => {
    expect(extractJsonObject('noise {bad}\n```json\n{"safe":true}\n```')).toBe('{"safe":true}');
  });
});

describe('transactional provider streaming', () => {
  it('does not publish partial output from a failed attempt before retry succeeds', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        sseResponse(['data: {"choices":[{"delta":{"content":"FAILED_CONTENT"}}]}\n'], true),
      )
      .mockResolvedValueOnce(
        sseResponse(['data: {"choices":[{"delta":{"content":"SAFE_CONTENT"}}]}\n']),
      );
    const chunks: string[] = [];
    const completions: string[] = [];
    const errors: string[] = [];

    const selected = await streamWithFallback(
      [openAiProvider],
      'pod',
      'system',
      [{ role: 'user', content: 'test' }],
      {
        onChunk: (chunk) => chunks.push(chunk),
        onComplete: (text) => completions.push(text),
        onError: (error) => errors.push(error.message),
      },
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(selected).toBe('ollama');
    expect(chunks).toEqual(['SAFE_CONTENT']);
    expect(completions).toEqual(['SAFE_CONTENT']);
    expect(errors).toEqual([]);
  });

  it('rejects streams that close without any valid provider content', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
      sseResponse(['data: definitely-not-json\n']),
    );
    const completions: string[] = [];
    const errors: string[] = [];

    const selected = await streamWithFallback(
      [openAiProvider],
      'pod',
      'system',
      [{ role: 'user', content: 'test' }],
      {
        onChunk: () => undefined,
        onComplete: (text) => completions.push(text),
        onError: (error) => errors.push(error.message),
      },
    );

    expect(selected).toBe('');
    expect(completions).toEqual([]);
    expect(errors).toEqual(['All providers failed']);
  });
});

describe('streamed bus protocol', () => {
  it('detects a tag once the accumulated stream completes it', () => {
    const seen = new Set<string>();
    expect(parseBusMessages('[BRO', 'pod_a', seen)).toHaveLength(0);
    const messages = parseBusMessages('[BROADCAST]: shared contract', 'pod_a', seen);
    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({ type: 'broadcast', content: 'shared contract' });
  });

  it('deduplicates messages while rescanning accumulated output', () => {
    const seen = new Set<string>();
    const text = '[RISK]: unsafe write';
    expect(parseBusMessages(text, 'pod_a', seen)).toHaveLength(1);
    expect(parseBusMessages(text, 'pod_a', seen)).toHaveLength(0);
  });
});
