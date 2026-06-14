import type { NexusState, ProviderConfig, WorkerAgentConnection, WorkerMode } from '../types';
import { defaultConfigs, PROVIDER_MAP } from './providers';

const SESSION_KEY = 'nexus_session';
const PROVIDERS_KEY = 'nexus_providers';
const WORKER_AGENTS_KEY = 'nexus_worker_agents';
const WORKER_MODE_KEY = 'nexus_worker_mode';

// ── Provider configs ──────────────────────────────────────────────────────────
// Stored in sessionStorage — API keys never written to disk

export function saveProviderConfigs(configs: ProviderConfig[]): void {
  try {
    sessionStorage.setItem(PROVIDERS_KEY, JSON.stringify(configs));
  } catch { /* quota — best effort */ }
}

export function loadProviderConfigs(): ProviderConfig[] {
  try {
    const raw = sessionStorage.getItem(PROVIDERS_KEY);
    if (!raw) return defaultConfigs();
    const parsed = JSON.parse(raw) as ProviderConfig[];
    // Merge with defaults to handle new providers added in updates
    const defaults = defaultConfigs();
    const existingIds = new Set(parsed.map(c => c.providerId));
    const merged = parsed.map(c => {
      // Backfill verifierModel if missing (added in newer versions)
      if (!c.verifierModel) {
        const def = PROVIDER_MAP.get(c.providerId);
        return { ...c, verifierModel: def?.defaultVerifierModel ?? c.managerModel };
      }
      return c;
    });
    for (const d of defaults) {
      if (!existingIds.has(d.providerId)) merged.push(d);
    }
    return merged;
  } catch {
    return defaultConfigs();
  }
}

export function clearProviderConfigs(): void {
  sessionStorage.removeItem(PROVIDERS_KEY);
}

// ── Company worker agent configs ─────────────────────────────────────────────

export function saveWorkerAgents(agents: WorkerAgentConnection[]): void {
  try {
    sessionStorage.setItem(WORKER_AGENTS_KEY, JSON.stringify(agents));
  } catch { /* quota — best effort */ }
}

export function loadWorkerAgents(): WorkerAgentConnection[] {
  try {
    const raw = sessionStorage.getItem(WORKER_AGENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as WorkerAgentConnection[];
    return parsed.map(agent => ({
      ...agent,
      enabled: agent.enabled ?? true,
      connectionNotes: agent.connectionNotes ?? '',
      createdAt: agent.createdAt ?? Date.now(),
    }));
  } catch {
    return [];
  }
}

export function saveWorkerMode(mode: WorkerMode): void {
  try {
    sessionStorage.setItem(WORKER_MODE_KEY, mode);
  } catch { /* quota — best effort */ }
}

export function loadWorkerMode(): WorkerMode {
  try {
    return sessionStorage.getItem(WORKER_MODE_KEY) === 'company_workers'
      ? 'company_workers'
      : 'autonomous';
  } catch {
    return 'autonomous';
  }
}

// ── Session state ─────────────────────────────────────────────────────────────

export function saveSession(state: Partial<NexusState>): void {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(state));
  } catch { /* quota — best effort */ }
}

export function loadSession(): Partial<NexusState> | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Partial<NexusState>;
  } catch { return null; }
}

export function clearSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
}
