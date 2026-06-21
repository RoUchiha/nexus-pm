interface BrokerRequest {
  providerId: string;
  model: string;
  system: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
}

interface ProviderRoute {
  format: 'anthropic' | 'openai' | 'gemini';
  baseUrl: string;
  apiKey: string;
}

const ROUTES: Record<string, { format: ProviderRoute['format']; baseUrl: string; env: string }> = {
  anthropic: {
    format: 'anthropic',
    baseUrl: 'https://api.anthropic.com',
    env: 'ANTHROPIC_API_KEY',
  },
  gemini: {
    format: 'gemini',
    baseUrl: 'https://generativelanguage.googleapis.com',
    env: 'GOOGLE_GENERATIVE_AI_API_KEY',
  },
  groq: { format: 'openai', baseUrl: 'https://api.groq.com/openai', env: 'GROQ_API_KEY' },
  mistral: { format: 'openai', baseUrl: 'https://api.mistral.ai', env: 'MISTRAL_API_KEY' },
  openai: { format: 'openai', baseUrl: 'https://api.openai.com', env: 'OPENAI_API_KEY' },
  together: { format: 'openai', baseUrl: 'https://api.together.xyz', env: 'TOGETHER_API_KEY' },
};

export function validateBrokerRequest(value: unknown): BrokerRequest {
  if (!value || typeof value !== 'object') throw new Response('Invalid request', { status: 400 });
  const body = value as Partial<BrokerRequest>;
  if (!body.providerId || !ROUTES[body.providerId]) {
    throw new Response('Unsupported provider', { status: 400 });
  }
  if (!body.model || !/^[a-zA-Z0-9._:/-]{1,120}$/.test(body.model)) {
    throw new Response('Invalid model', { status: 400 });
  }
  if (typeof body.system !== 'string' || body.system.length > 6_000) {
    throw new Response('Invalid system prompt', { status: 400 });
  }
  if (!Array.isArray(body.messages) || body.messages.length < 1 || body.messages.length > 20) {
    throw new Response('Invalid messages', { status: 400 });
  }
  const messages = body.messages.map((message) => {
    if (
      !message ||
      (message.role !== 'user' && message.role !== 'assistant') ||
      typeof message.content !== 'string' ||
      message.content.length > 4_000
    ) {
      throw new Response('Invalid message', { status: 400 });
    }
    return { role: message.role, content: message.content };
  });
  return { providerId: body.providerId, model: body.model, system: body.system, messages };
}

function routeFor(providerId: string): ProviderRoute {
  const config = ROUTES[providerId];
  const apiKey = process.env[config.env];
  if (!apiKey) throw new Response('Provider unavailable', { status: 503 });
  return { ...config, apiKey };
}

export async function invokeProvider(request: BrokerRequest, signal: AbortSignal): Promise<string> {
  const route = routeFor(request.providerId);
  if (route.format === 'anthropic') return invokeAnthropic(route, request, signal);
  if (route.format === 'gemini') return invokeGemini(route, request, signal);
  return invokeOpenAi(route, request, signal);
}

async function providerJson(response: Response): Promise<Record<string, unknown>> {
  const raw = await response.text();
  if (raw.length > 1_000_000) throw new Error('Provider response too large');
  if (!response.ok) throw new Error(`Provider HTTP ${response.status}`);
  return JSON.parse(raw) as Record<string, unknown>;
}

async function invokeOpenAi(
  route: ProviderRoute,
  request: BrokerRequest,
  signal: AbortSignal,
): Promise<string> {
  const response = await fetch(`${route.baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${route.apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: request.model,
      max_tokens: 4096,
      messages: [{ role: 'system', content: request.system }, ...request.messages],
      stream: false,
    }),
    signal,
  });
  const json = await providerJson(response);
  const text = (json.choices as Array<{ message?: { content?: string } }> | undefined)?.[0]?.message
    ?.content;
  if (!text?.trim()) throw new Error('Provider returned no content');
  return text;
}

async function invokeAnthropic(
  route: ProviderRoute,
  request: BrokerRequest,
  signal: AbortSignal,
): Promise<string> {
  const response = await fetch(`${route.baseUrl}/v1/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': route.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: request.model,
      max_tokens: 4096,
      system: request.system,
      messages: request.messages,
    }),
    signal,
  });
  const json = await providerJson(response);
  const text = (json.content as Array<{ type?: string; text?: string }> | undefined)
    ?.filter((item) => item.type === 'text')
    .map((item) => item.text ?? '')
    .join('');
  if (!text?.trim()) throw new Error('Provider returned no content');
  return text;
}

async function invokeGemini(
  route: ProviderRoute,
  request: BrokerRequest,
  signal: AbortSignal,
): Promise<string> {
  const response = await fetch(
    `${route.baseUrl}/v1beta/models/${encodeURIComponent(request.model)}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': route.apiKey },
      body: JSON.stringify({
        contents: request.messages.map((message) => ({
          role: message.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: message.content }],
        })),
        systemInstruction: { parts: [{ text: request.system }] },
        generationConfig: { maxOutputTokens: 4096 },
      }),
      signal,
    },
  );
  const json = await providerJson(response);
  const text = (
    json.candidates as Array<{ content?: { parts?: Array<{ text?: string }> } }> | undefined
  )?.[0]?.content?.parts
    ?.map((part) => part.text ?? '')
    .join('');
  if (!text?.trim()) throw new Error('Provider returned no content');
  return text;
}
