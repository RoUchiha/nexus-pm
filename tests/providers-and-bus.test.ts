import { describe, expect, it } from 'vitest';
import { extractJsonObject } from '../src/lib/providers';
import { parseBusMessages } from '../src/lib/bus';

describe('provider response parsing', () => {
  it('extracts a balanced object with nested braces in strings', () => {
    const json = extractJsonObject('prefix {"value":"} still text", "nested":{"ok":true}} suffix {"evil":true}');
    expect(JSON.parse(json ?? '')).toEqual({ value: '} still text', nested: { ok: true } });
  });

  it('returns null for incomplete model output', () => {
    expect(extractJsonObject('{"incomplete": true')).toBeNull();
  });

  it('prefers a JSON code fence', () => {
    expect(extractJsonObject('noise {bad}\n```json\n{"safe":true}\n```')).toBe('{"safe":true}');
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
