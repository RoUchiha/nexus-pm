import type { NexusState, ProviderConfig } from '../types';
import { defaultConfigs, PROVIDER_MAP } from './providers';

const SESSION_KEY = 'nexus_session';
const PROVIDERS_KEY = 'nexus_providers';

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
