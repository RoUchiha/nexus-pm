import { truncateForContext } from './security';

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const MAX_RETRIES = 3;

export interface ApiMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface StreamCallbacks {
  onChunk: (text: string) => void;
  onComplete: (fullText: string) => void;
  onError: (error: Error) => void;
}

function delay(ms: number): Promise<void> {
  return new Promise(res => setTimeout(res, ms));
}

function retryDelay(attempt: number): number {
  return 1000 * Math.pow(2, attempt) + Math.random() * 400;
}

export async function claudeStream(
  apiKey: string,
  model: string,
  systemPrompt: string,
  messages: ApiMessage[],
  callbacks: StreamCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (signal?.aborted) {
      callbacks.onError(new Error('Aborted'));
      return;
    }

    try {
      const res = await fetch(ANTHROPIC_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model,
          max_tokens: 4096,
          system: truncateForContext(systemPrompt, 6000),
          messages: messages.map(m => ({
            role: m.role,
            content: truncateForContext(m.content, 4000),
          })),
          stream: true,
        }),
        signal,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: { message?: string } };
        const msg = body?.error?.message ?? `HTTP ${res.status}`;

        if (res.status === 429) {
          const after = parseInt(res.headers.get('retry-after') ?? '5', 10);
          await delay(after * 1000);
          continue;
        }
        if (res.status >= 500 && attempt < MAX_RETRIES - 1) {
          await delay(retryDelay(attempt));
          continue;
        }
        throw new Error(msg);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let fullText = '';
      let buf = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data) as { delta?: { text?: string } };
            const text = parsed?.delta?.text ?? '';
            if (text) {
              fullText += text;
              callbacks.onChunk(text);
            }
          } catch {
            // malformed SSE — skip
          }
        }
      }

      callbacks.onComplete(fullText);
      return;

    } catch (err) {
      const error = err as Error;
      if (error.name === 'AbortError') {
        callbacks.onError(new Error('Aborted'));
        return;
      }
      lastError = error;
      if (attempt < MAX_RETRIES - 1) await delay(retryDelay(attempt));
    }
  }

  callbacks.onError(lastError ?? new Error('Max retries exceeded'));
}

export async function claudeJSON<T>(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userMessage: string,
  signal?: AbortSignal,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let full = '';
    claudeStream(
      apiKey,
      model,
      systemPrompt,
      [{ role: 'user', content: userMessage }],
      {
        onChunk: c => { full += c; },
        onComplete: text => {
          const match =
            text.match(/```json\s*([\s\S]*?)```/) ??
            text.match(/(\{[\s\S]*\})/);
          if (!match) {
            reject(new Error('No JSON found in response'));
            return;
          }
          try {
            resolve(JSON.parse(match[1]) as T);
          } catch (e) {
            reject(new Error(`JSON parse error: ${(e as Error).message}\n\nRaw: ${text.slice(0, 300)}`));
          }
        },
        onError: reject,
      },
      signal,
    );
  });
}
