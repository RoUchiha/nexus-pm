import type { ProviderDefinition, ProviderConfig, ResolvedProvider } from '../types';
import type { StreamCallbacks, ApiMessage } from './api';
import { truncateForContext } from './security';

// ── Provider registry ─────────────────────────────────────────────────────────

export const PROVIDER_DEFINITIONS: ProviderDefinition[] = [
  {
    id: 'ollama',
    name: 'Ollama',
    tier: 'free',
    tagline: 'Local models — completely free, runs on your machine',
    apiKeyRequired: false,
    apiKeyPlaceholder: '(no key needed)',
    baseUrl: 'http://localhost:11434',
    format: 'openai',
    models: [
      { id: 'llama3.2',         name: 'Llama 3.2',         roles: ['manager', 'pod', 'verifier'], contextWindow: 128000 },
      { id: 'llama3.1',         name: 'Llama 3.1',         roles: ['manager', 'pod', 'verifier'], contextWindow: 128000 },
      { id: 'mistral',          name: 'Mistral 7B',         roles: ['pod'],                        contextWindow: 32000  },
      { id: 'deepseek-r1',      name: 'DeepSeek R1',        roles: ['manager', 'pod', 'verifier'], contextWindow: 64000  },
      { id: 'qwen2.5:14b',      name: 'Qwen 2.5 14B',       roles: ['manager', 'pod', 'verifier'], contextWindow: 128000 },
    ],
    defaultManagerModel: 'llama3.2',
    defaultPodModel: 'mistral',
    defaultVerifierModel: 'llama3.2',
  },
  {
    id: 'groq',
    name: 'Groq',
    tier: 'freemium',
    tagline: 'Ultra-fast inference — generous free tier',
    apiKeyRequired: true,
    apiKeyPrefix: 'gsk_',
    apiKeyPlaceholder: 'gsk_...',
    baseUrl: 'https://api.groq.com/openai',
    format: 'openai',
    models: [
      { id: 'llama-3.3-70b-versatile',  name: 'Llama 3.3 70B',      roles: ['manager', 'pod', 'verifier'], contextWindow: 128000, notes: 'Free tier' },
      { id: 'llama-3.1-8b-instant',     name: 'Llama 3.1 8B',       roles: ['pod'],                        contextWindow: 128000, notes: 'Free tier, very fast' },
      { id: 'mixtral-8x7b-32768',        name: 'Mixtral 8x7B',       roles: ['pod'],                        contextWindow: 32768,  notes: 'Free tier' },
      { id: 'gemma2-9b-it',             name: 'Gemma 2 9B',          roles: ['pod'],                        contextWindow: 8192,   notes: 'Free tier' },
    ],
    defaultManagerModel: 'llama-3.3-70b-versatile',
    defaultPodModel: 'llama-3.1-8b-instant',
    defaultVerifierModel: 'llama-3.3-70b-versatile',
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    tier: 'freemium',
    tagline: 'Free tier available — 1M context window',
    apiKeyRequired: true,
    apiKeyPlaceholder: 'AIza...',
    baseUrl: 'https://generativelanguage.googleapis.com',
    format: 'gemini',
    models: [
      { id: 'gemini-1.5-flash',        name: 'Gemini 1.5 Flash',    roles: ['manager', 'pod', 'verifier'], contextWindow: 1000000, notes: 'Free tier' },
      { id: 'gemini-1.5-flash-8b',     name: 'Gemini 1.5 Flash 8B', roles: ['pod'],                        contextWindow: 1000000, notes: 'Free tier, fastest' },
      { id: 'gemini-1.5-pro',          name: 'Gemini 1.5 Pro',      roles: ['manager', 'pod', 'verifier'], contextWindow: 2000000, notes: 'Freemium' },
      { id: 'gemini-2.0-flash',        name: 'Gemini 2.0 Flash',    roles: ['manager', 'pod', 'verifier'], contextWindow: 1000000, notes: 'Freemium' },
    ],
    defaultManagerModel: 'gemini-1.5-flash',
    defaultPodModel: 'gemini-1.5-flash-8b',
    defaultVerifierModel: 'gemini-1.5-pro',
  },
  {
    id: 'mistral',
    name: 'Mistral AI',
    tier: 'freemium',
    tagline: 'European AI — free La Plateforme tier',
    apiKeyRequired: true,
    apiKeyPlaceholder: 'api key...',
    baseUrl: 'https://api.mistral.ai',
    format: 'openai',
    models: [
      { id: 'mistral-small-latest',    name: 'Mistral Small',       roles: ['pod'],                        contextWindow: 32000,  notes: 'Free tier' },
      { id: 'open-mistral-nemo',       name: 'Mistral Nemo',        roles: ['pod'],                        contextWindow: 128000, notes: 'Free tier' },
      { id: 'mistral-medium-latest',   name: 'Mistral Medium',      roles: ['manager', 'pod', 'verifier'], contextWindow: 32000  },
      { id: 'mistral-large-latest',    name: 'Mistral Large',       roles: ['manager', 'pod', 'verifier'], contextWindow: 128000 },
    ],
    defaultManagerModel: 'mistral-large-latest',
    defaultPodModel: 'mistral-small-latest',
    defaultVerifierModel: 'mistral-large-latest',
  },
  {
    id: 'together',
    name: 'Together AI',
    tier: 'freemium',
    tagline: 'Open source models — free $25 credit on signup',
    apiKeyRequired: true,
    apiKeyPlaceholder: 'api key...',
    baseUrl: 'https://api.together.xyz',
    format: 'openai',
    models: [
      { id: 'meta-llama/Llama-3.2-11B-Vision-Instruct-Turbo', name: 'Llama 3.2 11B',  roles: ['pod'],                        contextWindow: 131072 },
      { id: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',   name: 'Llama 3.1 70B',  roles: ['manager', 'pod', 'verifier'], contextWindow: 131072 },
      { id: 'mistralai/Mixtral-8x7B-Instruct-v0.1',           name: 'Mixtral 8x7B',   roles: ['pod'],                        contextWindow: 32768  },
      { id: 'Qwen/QwQ-32B',                                   name: 'QwQ 32B',         roles: ['manager', 'pod', 'verifier'], contextWindow: 32768  },
    ],
    defaultManagerModel: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
    defaultPodModel: 'meta-llama/Llama-3.2-11B-Vision-Instruct-Turbo',
    defaultVerifierModel: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    tier: 'paid',
    tagline: 'GPT-4o and o-series — premium quality',
    apiKeyRequired: true,
    apiKeyPrefix: 'sk-',
    apiKeyPlaceholder: 'sk-...',
    baseUrl: 'https://api.openai.com',
    format: 'openai',
    models: [
      { id: 'gpt-4o-mini',  name: 'GPT-4o Mini',  roles: ['pod'],                        contextWindow: 128000 },
      { id: 'gpt-4o',       name: 'GPT-4o',       roles: ['manager', 'pod', 'verifier'], contextWindow: 128000 },
      { id: 'o4-mini',      name: 'o4-mini',      roles: ['manager', 'pod', 'verifier'], contextWindow: 128000 },
      { id: 'o3',           name: 'o3',           roles: ['manager', 'verifier'],        contextWindow: 200000 },
    ],
    defaultManagerModel: 'gpt-4o',
    defaultPodModel: 'gpt-4o-mini',
    defaultVerifierModel: 'gpt-4o',
  },
  {
    id: 'anthropic',
    name: 'Anthropic Claude',
    tier: 'paid',
    tagline: 'Claude Opus/Sonnet — highest capability',
    apiKeyRequired: true,
    apiKeyPrefix: 'sk-ant-',
    apiKeyPlaceholder: 'sk-ant-api03-...',
    baseUrl: 'https://api.anthropic.com',
    format: 'anthropic',
    models: [
      { id: 'claude-haiku-4-5',  name: 'Claude Haiku 4.5',  roles: ['pod'],                        contextWindow: 200000 },
      { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', roles: ['manager', 'pod', 'verifier'], contextWindow: 200000 },
      { id: 'claude-opus-4-8',   name: 'Claude Opus 4.8',   roles: ['manager', 'verifier'],        contextWindow: 200000 },
    ],
    defaultManagerModel: 'claude-opus-4-8',
    defaultPodModel: 'claude-sonnet-4-6',
    defaultVerifierModel: 'claude-sonnet-4-6',
  },
];

export const PROVIDER_MAP = new Map(PROVIDER_DEFINITIONS.map(p => [p.id, p]));

// ── Priority resolution ───────────────────────────────────────────────────────

const TIER_ORDER: Record<string, number> = { free: 0, freemium: 1, paid: 2 };

export function resolveProviders(
  configs: ProviderConfig[],
  role: 'manager' | 'pod' | 'verifier',
): ResolvedProvider[] {
  return configs
    .filter(c => {
      if (!c.enabled) return false;
      const def = PROVIDER_MAP.get(c.providerId);
      if (!def) return false;
      if (def.apiKeyRequired && !c.apiKey.trim()) return false;
      return true;
    })
    .map(c => ({ definition: PROVIDER_MAP.get(c.providerId)!, config: c }))
    .filter(({ definition, config }) => {
      const model =
        role === 'manager' ? config.managerModel :
        role === 'verifier' ? (config.verifierModel || config.managerModel) :
        config.podModel;
      return definition.models.some(m => m.id === model && m.roles.includes(role));
    })
    .sort((a, b) => TIER_ORDER[a.definition.tier] - TIER_ORDER[b.definition.tier]);
}

export function defaultConfigs(): ProviderConfig[] {
  return PROVIDER_DEFINITIONS.map(def => ({
    providerId: def.id,
    enabled: def.id === 'ollama' || def.id === 'groq', // enable free by default
    apiKey: '',
    managerModel: def.defaultManagerModel,
    podModel: def.defaultPodModel,
    verifierModel: def.defaultVerifierModel,
  }));
}

// ── Streaming implementations ─────────────────────────────────────────────────

const MAX_RETRIES = 3;
function retryMs(attempt: number): number {
  return 1000 * Math.pow(2, attempt) + Math.random() * 300;
}
function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

// ── Anthropic ─────────────────────────────────────────────────────────────────

async function streamAnthropic(
  baseUrl: string,
  apiKey: string,
  model: string,
  system: string,
  messages: ApiMessage[],
  callbacks: StreamCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (signal?.aborted) { callbacks.onError(new Error('Aborted')); return; }
    try {
      const res = await fetch(`${baseUrl}/v1/messages`, {
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
          system: truncateForContext(system, 6000),
          messages: messages.map(m => ({ role: m.role, content: truncateForContext(m.content, 4000) })),
          stream: true,
        }),
        signal,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: { message?: string } };
        const msg = body?.error?.message ?? `HTTP ${res.status}`;
        if (res.status === 429) { await sleep(parseInt(res.headers.get('retry-after') ?? '5', 10) * 1000); continue; }
        if (res.status >= 500 && attempt < MAX_RETRIES - 1) { await sleep(retryMs(attempt)); continue; }
        throw new Error(msg);
      }

      const reader = res.body!.getReader();
      const dec = new TextDecoder();
      let full = '', buf = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split('\n'); buf = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;
          try {
            const p = JSON.parse(data) as { delta?: { text?: string } };
            const text = p?.delta?.text ?? '';
            if (text) { full += text; callbacks.onChunk(text); }
          } catch { /* skip */ }
        }
      }
      callbacks.onComplete(full); return;
    } catch (err) {
      if ((err as Error).name === 'AbortError') { callbacks.onError(new Error('Aborted')); return; }
      if (attempt < MAX_RETRIES - 1) { await sleep(retryMs(attempt)); continue; }
      callbacks.onError(err as Error); return;
    }
  }
  callbacks.onError(new Error('Max retries exceeded'));
}

// ── OpenAI-compatible ─────────────────────────────────────────────────────────

async function streamOpenAI(
  baseUrl: string,
  apiKey: string,
  model: string,
  system: string,
  messages: ApiMessage[],
  callbacks: StreamCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (signal?.aborted) { callbacks.onError(new Error('Aborted')); return; }
    try {
      const res = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model,
          max_tokens: 4096,
          messages: [
            { role: 'system', content: truncateForContext(system, 6000) },
            ...messages.map(m => ({ role: m.role, content: truncateForContext(m.content, 4000) })),
          ],
          stream: true,
        }),
        signal,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: { message?: string } };
        const msg = body?.error?.message ?? `HTTP ${res.status}`;
        if (res.status === 429) { await sleep(parseInt(res.headers.get('retry-after') ?? '5', 10) * 1000); continue; }
        if (res.status >= 500 && attempt < MAX_RETRIES - 1) { await sleep(retryMs(attempt)); continue; }
        throw new Error(msg);
      }

      const reader = res.body!.getReader();
      const dec = new TextDecoder();
      let full = '', buf = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split('\n'); buf = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;
          try {
            const p = JSON.parse(data) as { choices?: Array<{ delta?: { content?: string } }> };
            const text = p?.choices?.[0]?.delta?.content ?? '';
            if (text) { full += text; callbacks.onChunk(text); }
          } catch { /* skip */ }
        }
      }
      callbacks.onComplete(full); return;
    } catch (err) {
      if ((err as Error).name === 'AbortError') { callbacks.onError(new Error('Aborted')); return; }
      if (attempt < MAX_RETRIES - 1) { await sleep(retryMs(attempt)); continue; }
      callbacks.onError(err as Error); return;
    }
  }
  callbacks.onError(new Error('Max retries exceeded'));
}

// ── Gemini ────────────────────────────────────────────────────────────────────

async function streamGemini(
  baseUrl: string,
  apiKey: string,
  model: string,
  system: string,
  messages: ApiMessage[],
  callbacks: StreamCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  const url = `${baseUrl}/v1beta/models/${model}:streamGenerateContent?key=${apiKey}&alt=sse`;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (signal?.aborted) { callbacks.onError(new Error('Aborted')); return; }
    try {
      const contents = messages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: truncateForContext(m.content, 4000) }],
      }));

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          systemInstruction: { parts: [{ text: truncateForContext(system, 6000) }] },
          generationConfig: { maxOutputTokens: 4096 },
        }),
        signal,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: { message?: string } };
        const msg = body?.error?.message ?? `HTTP ${res.status}`;
        if (res.status === 429) { await sleep(parseInt(res.headers.get('retry-after') ?? '5', 10) * 1000); continue; }
        if (res.status >= 500 && attempt < MAX_RETRIES - 1) { await sleep(retryMs(attempt)); continue; }
        throw new Error(msg);
      }

      const reader = res.body!.getReader();
      const dec = new TextDecoder();
      let full = '', buf = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split('\n'); buf = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          try {
            type GeminiChunk = { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
            const p = JSON.parse(data) as GeminiChunk;
            const text = p?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
            if (text) { full += text; callbacks.onChunk(text); }
          } catch { /* skip */ }
        }
      }
      callbacks.onComplete(full); return;
    } catch (err) {
      if ((err as Error).name === 'AbortError') { callbacks.onError(new Error('Aborted')); return; }
      if (attempt < MAX_RETRIES - 1) { await sleep(retryMs(attempt)); continue; }
      callbacks.onError(err as Error); return;
    }
  }
  callbacks.onError(new Error('Max retries exceeded'));
}

// ── Unified stream dispatch ───────────────────────────────────────────────────

export async function streamWithProvider(
  provider: ResolvedProvider,
  model: string,
  system: string,
  messages: ApiMessage[],
  callbacks: StreamCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  const { definition, config } = provider;
  const baseUrl = config.customBaseUrl || definition.baseUrl;
  const apiKey = config.apiKey;

  switch (definition.format) {
    case 'anthropic':
      return streamAnthropic(baseUrl, apiKey, model, system, messages, callbacks, signal);
    case 'openai':
      return streamOpenAI(baseUrl, apiKey, model, system, messages, callbacks, signal);
    case 'gemini':
      return streamGemini(baseUrl, apiKey, model, system, messages, callbacks, signal);
  }
}

// ── JSON helper with provider fallback ───────────────────────────────────────

export async function jsonWithFallback<T>(
  providers: ResolvedProvider[],
  role: 'manager' | 'pod' | 'verifier',
  system: string,
  userMessage: string,
  signal?: AbortSignal,
): Promise<{ result: T; usedProvider: string }> {
  if (providers.length === 0) {
    throw new Error('No providers available. Enable at least one provider with a valid API key.');
  }

  let lastError: Error | null = null;

  for (const provider of providers) {
    if (signal?.aborted) throw new Error('Aborted');
    const model =
      role === 'manager' ? provider.config.managerModel :
      role === 'verifier' ? (provider.config.verifierModel || provider.config.managerModel) :
      provider.config.podModel;

    try {
      const result = await new Promise<T>((resolve, reject) => {
        let full = '';
        streamWithProvider(
          provider,
          model,
          system,
          [{ role: 'user', content: userMessage }],
          {
            onChunk: c => { full += c; },
            onComplete: text => {
              const match =
                text.match(/```json\s*([\s\S]*?)```/) ??
                text.match(/(\{[\s\S]*\})/);
              if (!match) { reject(new Error('No JSON in response')); return; }
              try { resolve(JSON.parse(match[1]) as T); }
              catch (e) { reject(new Error(`JSON parse: ${(e as Error).message}`)); }
            },
            onError: reject,
          },
          signal,
        );
      });
      return { result, usedProvider: provider.definition.id };
    } catch (err) {
      if ((err as Error).message === 'Aborted') throw err;
      lastError = err as Error;
      // Try next provider
    }
  }

  throw lastError ?? new Error('All providers failed');
}

// ── Stream with fallback (for pods) ──────────────────────────────────────────

export async function streamWithFallback(
  providers: ResolvedProvider[],
  role: 'manager' | 'pod' | 'verifier',
  system: string,
  messages: ApiMessage[],
  callbacks: StreamCallbacks & { onProviderSelect?: (providerId: string) => void },
  signal?: AbortSignal,
): Promise<string> {
  if (providers.length === 0) {
    callbacks.onError(new Error('No providers available. Enable at least one provider with a valid API key.'));
    return '';
  }

  for (const provider of providers) {
    if (signal?.aborted) { callbacks.onError(new Error('Aborted')); return ''; }
    const model =
      role === 'manager' ? provider.config.managerModel :
      role === 'verifier' ? (provider.config.verifierModel || provider.config.managerModel) :
      provider.config.podModel;
    callbacks.onProviderSelect?.(provider.definition.id);

    const success = await new Promise<boolean>(resolve => {
      streamWithProvider(
        provider,
        model,
        system,
        messages,
        {
          onChunk: callbacks.onChunk,
          onComplete: text => { callbacks.onComplete(text); resolve(true); },
          onError: err => {
            if (err.message === 'Aborted') { callbacks.onError(err); resolve(true); }
            else { resolve(false); } // try next provider
          },
        },
        signal,
      );
    });

    if (success) return provider.definition.id;
  }

  callbacks.onError(new Error('All providers failed'));
  return '';
}
