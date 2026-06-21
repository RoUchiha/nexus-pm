import type { BusMessage, MessageType } from '../types';

const PATTERNS: Array<{ re: RegExp; type: MessageType; toAll: boolean }> = [
  { re: /\[BROADCAST\]:\s*(.+)/gi, type: 'broadcast', toAll: true },
  { re: /\[ALIGNED\]:\s*(.+)/gi, type: 'aligned', toAll: true },
  { re: /\[RISK\]:\s*(.+)/gi, type: 'risk', toAll: true },
  { re: /\[SPEC-CONFLICT:[^\]]*\]:\s*(.+)/gi, type: 'spec_conflict', toAll: true },
  { re: /\[REPORT→NEXUS\]:\s*(.+)/gi, type: 'report', toAll: false },
  { re: /\[DIRECTIVE\]:\s*(.+)/gi, type: 'directive', toAll: true },
];

// [VC-REF: VC-001]: evidence text
const VC_REF_RE = /\[VC-REF:\s*(VC-\d+)\]:\s*(.+)/gi;

// [SIGNAL→pod_id]: message
const SIGNAL_RE = /\[SIGNAL→(\w+)\]:\s*(.+)/gi;

let _counter = 0;
function nextId(): string {
  return `msg_${Date.now()}_${++_counter}`;
}

export function parseBusMessages(
  text: string,
  fromPodId: string,
  existingIds: Set<string>,
): BusMessage[] {
  const messages: BusMessage[] = [];

  for (const { re, type, toAll } of PATTERNS) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const content = m[1].trim();
      const dedupeKey = `${fromPodId}:${type}:${content}`;
      if (existingIds.has(dedupeKey)) continue;
      existingIds.add(dedupeKey);
      messages.push({
        id: nextId(),
        timestamp: Date.now(),
        from: fromPodId,
        to: type === 'report' ? 'NEXUS' : toAll ? 'ALL' : '',
        type,
        content,
      });
    }
  }

  // VC-REF messages (spec compliance citations)
  VC_REF_RE.lastIndex = 0;
  let vm: RegExpExecArray | null;
  while ((vm = VC_REF_RE.exec(text)) !== null) {
    const vcId = vm[1].trim();
    const evidence = vm[2].trim();
    const content = `${vcId}: ${evidence}`;
    const dedupeKey = `${fromPodId}:spec_ref:${content}`;
    if (existingIds.has(dedupeKey)) continue;
    existingIds.add(dedupeKey);
    messages.push({
      id: nextId(),
      timestamp: Date.now(),
      from: fromPodId,
      to: 'ALL',
      type: 'spec_ref',
      content,
    });
  }

  // Signal messages
  SIGNAL_RE.lastIndex = 0;
  let sm: RegExpExecArray | null;
  while ((sm = SIGNAL_RE.exec(text)) !== null) {
    const toPod = sm[1].trim();
    const content = sm[2].trim();
    const dedupeKey = `${fromPodId}:signal:${toPod}:${content}`;
    if (existingIds.has(dedupeKey)) continue;
    existingIds.add(dedupeKey);
    messages.push({
      id: nextId(),
      timestamp: Date.now(),
      from: fromPodId,
      to: toPod,
      type: 'signal',
      content,
    });
  }

  return messages;
}

export function stripBusMessages(text: string): string {
  return text
    .replace(/\[BROADCAST\]:[^\n]*/gi, '')
    .replace(/\[ALIGNED\]:[^\n]*/gi, '')
    .replace(/\[RISK\]:[^\n]*/gi, '')
    .replace(/\[SIGNAL→\w+\]:[^\n]*/gi, '')
    .replace(/\[VC-REF:[^\]]*\]:[^\n]*/gi, '')
    .replace(/\[SPEC-CONFLICT:[^\]]*\]/gi, '')
    .replace(/\[REPORT→NEXUS\]:[^\n]*/gi, '')
    .replace(/\[DIRECTIVE\]:[^\n]*/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function formatBusMessagesForPod(messages: BusMessage[], podId: string): string {
  const relevant = messages.filter((m) => m.to === 'ALL' || m.to === podId);
  if (relevant.length === 0) return 'No bus messages yet.';
  return relevant
    .map(
      (m) =>
        `[${m.type.toUpperCase()} from ${m.from}${m.to !== 'ALL' ? ` → ${m.to}` : ''}]: ${m.content}`,
    )
    .join('\n');
}
