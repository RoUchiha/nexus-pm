import type { ApiMessage, StreamCallbacks } from './api';
import type { ConnectorConfig, ConnectorIssue, ConnectorStatus } from '../types';

type TokenProvider = () => Promise<string | null | undefined>;

let tokenProvider: TokenProvider | null = null;
let publicDemoMode = false;

export function setPublicDemoMode(enabled: boolean): void {
  publicDemoMode = enabled;
  if (enabled) tokenProvider = null;
}

export function setBrokerTokenProvider(provider: TokenProvider | null): void {
  tokenProvider = provider;
}

export function isBrokerConfigured(): boolean {
  if (publicDemoMode) return false;
  return (
    import.meta.env.VITE_AUTH0_ENABLED === 'true' ||
    Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY)
  );
}

async function authorizationHeaders(): Promise<Record<string, string>> {
  if (publicDemoMode) throw new Error('Managed providers are disabled in the public demo.');
  if (!tokenProvider) throw new Error('Sign in before using managed providers.');
  const token = await tokenProvider();
  if (token === null) throw new Error('Sign in before using managed providers.');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function invokeBroker(
  providerId: string,
  model: string,
  system: string,
  messages: ApiMessage[],
  callbacks: StreamCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  try {
    const response = await fetch('/api/llm', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Correlation-Id': crypto.randomUUID(),
        ...(await authorizationHeaders()),
      },
      body: JSON.stringify({ providerId, model, system, messages }),
      signal,
    });
    const body = (await response.json().catch(() => ({}))) as {
      text?: string;
      correlationId?: string;
    };
    if (!response.ok || !body.text?.trim()) {
      throw new Error(
        response.status === 429
          ? 'Provider quota exceeded. Retry after the displayed cooldown.'
          : `Managed provider request failed (${response.status}). Correlation: ${body.correlationId ?? 'unavailable'}`,
      );
    }
    callbacks.onChunk(body.text);
    callbacks.onComplete(body.text);
  } catch (error) {
    callbacks.onError(
      signal?.aborted
        ? new Error('Aborted')
        : error instanceof Error
          ? error
          : new Error('Broker failed'),
    );
  }
}

export async function emitSecurityEvent(
  type: 'client.mission.started' | 'client.mission.aborted' | 'client.mission.failed',
  correlationId: string,
  errorCode?: string,
): Promise<boolean> {
  try {
    if (!isBrokerConfigured()) return false;
    const response = await fetch('/api/security-events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await authorizationHeaders()) },
      body: JSON.stringify({ type, correlationId, errorCode }),
      keepalive: true,
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function diagnoseManagedConnector(config: ConnectorConfig): Promise<{
  status: ConnectorStatus;
  credentialRef?: string;
  credentials: Record<string, never>;
  diagnostics: string[];
  issues: ConnectorIssue[];
  lastCheckAt: number;
}> {
  const response = await fetch('/api/connectors/diagnose', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authorizationHeaders()) },
    body: JSON.stringify({
      id: config.id,
      endpoint: config.endpoint,
      authType: config.authType,
      credentials: config.credentials,
      approved: config.approved,
    }),
  });
  const body = (await response.json().catch(() => ({}))) as {
    status?: ConnectorStatus;
    credentialRef?: string;
    diagnostics?: string[];
    issues?: ConnectorIssue[];
    error?: string;
  };
  if (!response.ok || !body.status) {
    throw new Error(body.error ?? `Connector broker failed (${response.status}).`);
  }
  return {
    status: body.status,
    credentialRef: body.credentialRef,
    credentials: {},
    diagnostics: body.diagnostics ?? [],
    issues: body.issues ?? [],
    lastCheckAt: Date.now(),
  };
}
