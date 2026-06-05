const MAX_MISSION_LENGTH = 2000;
const MAX_CONTEXT_LENGTH = 8000;

const DANGEROUS_PATTERNS = [
  /<script/gi,
  /javascript:/gi,
  /data:text\/html/gi,
  /on\w+\s*=/gi,
];

export function sanitizeInput(raw: string): string {
  let s = raw.trim().replace(/\0/g, '');
  for (const pattern of DANGEROUS_PATTERNS) {
    s = s.replace(pattern, '[removed]');
  }
  return s.slice(0, MAX_MISSION_LENGTH);
}

export function validateMission(mission: string): { valid: boolean; error?: string } {
  if (!mission || mission.trim().length < 10) {
    return { valid: false, error: 'Mission must be at least 10 characters.' };
  }
  if (mission.length > MAX_MISSION_LENGTH) {
    return { valid: false, error: `Mission must be under ${MAX_MISSION_LENGTH} characters.` };
  }
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(mission)) {
      return { valid: false, error: 'Mission contains disallowed content.' };
    }
  }
  return { valid: true };
}

export function validateApiKey(key: string): { valid: boolean; error?: string } {
  if (!key) return { valid: false, error: 'API key is required.' };
  if (!key.startsWith('sk-ant-')) {
    return { valid: false, error: 'Key must start with sk-ant-' };
  }
  if (key.length < 40) {
    return { valid: false, error: 'API key appears incomplete.' };
  }
  return { valid: true };
}

export function truncateForContext(text: string, maxLength = MAX_CONTEXT_LENGTH): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '\n…[truncated]';
}

export function generateSessionId(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
}

export function maskApiKey(key: string): string {
  if (key.length < 12) return '***';
  return key.slice(0, 10) + '…' + key.slice(-4);
}
