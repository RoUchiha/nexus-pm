import { useState, useCallback } from 'react';
import type { ProviderConfig } from '../types';
import { PROVIDER_DEFINITIONS, resolveProviders } from '../lib/providers';
import { saveProviderConfigs } from '../lib/storage';
import { isBrokerConfigured } from '../lib/broker';

const TIER_COLORS: Record<string, string> = {
  free: 'var(--green)',
  freemium: 'var(--blue)',
  paid: 'var(--purple)',
};
const TIER_BG: Record<string, string> = {
  free: 'rgba(63,185,80,0.12)',
  freemium: 'rgba(88,166,255,0.10)',
  paid: 'rgba(188,140,255,0.10)',
};

interface Props {
  configs: ProviderConfig[];
  onChange: (configs: ProviderConfig[]) => void;
}

export function ProvidersPanel({ configs, onChange }: Props) {
  const [expanded, setExpanded] = useState(false);

  const update = useCallback(
    (providerId: string, patch: Partial<ProviderConfig>) => {
      const next = configs.map((c) => (c.providerId === providerId ? { ...c, ...patch } : c));
      onChange(next);
      saveProviderConfigs(next);
    },
    [configs, onChange],
  );

  const managerCount = resolveProviders(configs, 'manager').length;
  const podCount = resolveProviders(configs, 'pod').length;
  const verifierCount = resolveProviders(configs, 'verifier').length;
  const enabledCount = configs.filter((c) => c.enabled).length;

  // Group by tier for display
  const byTier = {
    free: PROVIDER_DEFINITIONS.filter((d) => d.tier === 'free'),
    freemium: PROVIDER_DEFINITIONS.filter((d) => d.tier === 'freemium'),
    paid: PROVIDER_DEFINITIONS.filter((d) => d.tier === 'paid'),
  };

  return (
    <div style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
      {/* Collapsed header bar */}
      <div
        className="provider-summary"
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '8px 20px',
          cursor: 'pointer',
          userSelect: 'none',
        }}
        onClick={() => setExpanded((e) => !e)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setExpanded((value) => !value);
          }
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '0.06em',
            color: 'var(--muted)',
            textTransform: 'uppercase',
          }}
        >
          Providers
        </span>

        <div className="provider-badges" style={{ display: 'flex', gap: 6, flex: 1 }}>
          {PROVIDER_DEFINITIONS.map((def) => {
            const cfg = configs.find((c) => c.providerId === def.id);
            const isEnabled = cfg?.enabled && (def.id === 'ollama' || isBrokerConfigured());
            return (
              <span
                key={def.id}
                title={`${def.name} (${def.tier})`}
                style={{
                  fontSize: 10,
                  padding: '1px 6px',
                  borderRadius: 3,
                  background: isEnabled ? TIER_BG[def.tier] : 'transparent',
                  color: isEnabled ? TIER_COLORS[def.tier] : 'var(--dim)',
                  border: `1px solid ${isEnabled ? TIER_COLORS[def.tier] + '44' : 'var(--border)'}`,
                  fontWeight: 600,
                  transition: 'all 0.15s',
                }}
              >
                {def.name}
              </span>
            );
          })}
        </div>

        <div
          className="provider-stats"
          style={{ display: 'flex', gap: 16, fontSize: 11, color: 'var(--muted)' }}
        >
          <span>
            <span style={{ color: managerCount > 0 ? 'var(--green)' : 'var(--red)' }}>●</span>{' '}
            {managerCount} manager
          </span>
          <span>
            <span style={{ color: podCount > 0 ? 'var(--green)' : 'var(--red)' }}>●</span>{' '}
            {podCount} pod
          </span>
          <span>
            <span style={{ color: verifierCount > 0 ? 'var(--green)' : 'var(--yellow)' }}>●</span>{' '}
            {verifierCount} verifier
          </span>
          <span style={{ color: 'var(--dim)' }}>{enabledCount} enabled</span>
        </div>

        <span style={{ color: 'var(--dim)', fontSize: 11 }}>{expanded ? '▲' : '▼'}</span>
      </div>

      {/* Expanded panel */}
      {expanded && (
        <div style={{ padding: '0 20px 20px' }}>
          <div style={{ fontSize: 11, color: 'var(--dim)', marginBottom: 14 }}>
            Remote credentials are held only by the authenticated server broker. This browser never
            receives, stores, or transmits raw provider keys.
          </div>

          {(['free', 'freemium', 'paid'] as const).map((tier) => (
            <div key={tier} style={{ marginBottom: 20 }}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: TIER_COLORS[tier],
                  marginBottom: 10,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span
                  style={{
                    background: TIER_BG[tier],
                    border: `1px solid ${TIER_COLORS[tier]}44`,
                    padding: '2px 8px',
                    borderRadius: 10,
                  }}
                >
                  {tier === 'free' ? '🆓 Free' : tier === 'freemium' ? '⚡ Freemium' : '💳 Paid'}
                </span>
                <span style={{ color: 'var(--dim)', fontWeight: 400 }}>
                  {tier === 'free' && '— runs locally, no API key needed'}
                  {tier === 'freemium' && '— free tier available, API key required'}
                  {tier === 'paid' && '— pay per token, highest quality'}
                </span>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                  gap: 10,
                }}
              >
                {byTier[tier].map((def) => {
                  const cfg = configs.find((c) => c.providerId === def.id)!;
                  const brokerReady = def.id === 'ollama' || isBrokerConfigured();
                  const isReady = cfg.enabled && brokerReady;

                  const managerModels = def.models.filter((m) => m.roles.includes('manager'));
                  const podModels = def.models.filter((m) => m.roles.includes('pod'));
                  const verifierModels = def.models.filter((m) => m.roles.includes('verifier'));

                  return (
                    <div
                      key={def.id}
                      style={{
                        background: 'var(--card)',
                        border: `1px solid ${isReady ? TIER_COLORS[def.tier] + '33' : 'var(--border)'}`,
                        borderRadius: 8,
                        padding: '12px 14px',
                        transition: 'border-color 0.2s',
                      }}
                    >
                      {/* Header row */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 10,
                          marginBottom: 10,
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontWeight: 700, fontSize: 13 }}>{def.name}</span>
                            {isReady && (
                              <span style={{ fontSize: 10, color: 'var(--green)' }}>✓ ready</span>
                            )}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>
                            {def.tagline}
                          </div>
                        </div>

                        {/* Toggle */}
                        <button
                          onClick={() => update(def.id, { enabled: !cfg.enabled })}
                          style={{
                            width: 38,
                            height: 20,
                            borderRadius: 10,
                            border: 'none',
                            cursor: 'pointer',
                            background: cfg.enabled ? TIER_COLORS[def.tier] : 'var(--dim)',
                            position: 'relative',
                            flexShrink: 0,
                            transition: 'background 0.2s',
                          }}
                          title={cfg.enabled ? 'Disable' : 'Enable'}
                        >
                          <span
                            style={{
                              position: 'absolute',
                              top: 2,
                              left: cfg.enabled ? 20 : 2,
                              width: 16,
                              height: 16,
                              borderRadius: '50%',
                              background: '#fff',
                              transition: 'left 0.2s',
                              display: 'block',
                            }}
                          />
                        </button>
                      </div>

                      {/* Managed credential boundary */}
                      {def.apiKeyRequired && (
                        <div
                          style={{
                            marginBottom: 10,
                            fontSize: 10,
                            color: brokerReady ? 'var(--green)' : 'var(--yellow)',
                          }}
                        >
                          {brokerReady
                            ? 'Managed server credential'
                            : 'Enterprise broker is not configured'}
                          {def.apiKeyPrefix &&
                            cfg.apiKey &&
                            !cfg.apiKey.startsWith(def.apiKeyPrefix) && (
                              <div style={{ fontSize: 10, color: 'var(--yellow)', marginTop: 3 }}>
                                ⚠ Key should start with {def.apiKeyPrefix}
                              </div>
                            )}
                        </div>
                      )}

                      {/* Ollama base URL */}
                      {def.id === 'ollama' && (
                        <div style={{ marginBottom: 10 }}>
                          <div style={{ fontSize: 10, color: 'var(--dim)', marginBottom: 4 }}>
                            BASE URL
                          </div>
                          <input
                            className="input"
                            placeholder="http://localhost:11434"
                            value={cfg.customBaseUrl ?? ''}
                            maxLength={80}
                            onChange={(e) =>
                              update(def.id, { customBaseUrl: e.target.value || undefined })
                            }
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: 11,
                              padding: '5px 8px',
                            }}
                          />
                          <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 3 }}>
                            Localhost only; port 11434.
                          </div>
                        </div>
                      )}

                      {/* Model selection */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <div>
                          <div style={{ fontSize: 10, color: 'var(--dim)', marginBottom: 4 }}>
                            MANAGER MODEL
                          </div>
                          <select
                            className="input"
                            value={cfg.managerModel}
                            onChange={(e) => update(def.id, { managerModel: e.target.value })}
                            style={{ fontSize: 11, padding: '4px 8px' }}
                            disabled={managerModels.length === 0}
                          >
                            {managerModels.length === 0 ? (
                              <option value="">— no manager models</option>
                            ) : (
                              managerModels.map((m) => (
                                <option key={m.id} value={m.id}>
                                  {m.name}
                                  {m.notes ? ` (${m.notes})` : ''}
                                </option>
                              ))
                            )}
                          </select>
                        </div>
                        <div>
                          <div style={{ fontSize: 10, color: 'var(--dim)', marginBottom: 4 }}>
                            POD MODEL
                          </div>
                          <select
                            className="input"
                            value={cfg.podModel}
                            onChange={(e) => update(def.id, { podModel: e.target.value })}
                            style={{ fontSize: 11, padding: '4px 8px' }}
                            disabled={podModels.length === 0}
                          >
                            {podModels.length === 0 ? (
                              <option value="">— no pod models</option>
                            ) : (
                              podModels.map((m) => (
                                <option key={m.id} value={m.id}>
                                  {m.name}
                                  {m.notes ? ` (${m.notes})` : ''}
                                </option>
                              ))
                            )}
                          </select>
                        </div>
                      </div>

                      {/* Verifier model — full width */}
                      {verifierModels.length > 0 && (
                        <div style={{ marginTop: 8 }}>
                          <div style={{ fontSize: 10, color: 'var(--dim)', marginBottom: 4 }}>
                            VERIFIER MODEL
                            <span style={{ color: 'var(--dim)', fontWeight: 400, marginLeft: 4 }}>
                              (adversarial auditor — defaults to manager if unset)
                            </span>
                          </div>
                          <select
                            className="input"
                            value={cfg.verifierModel ?? def.defaultVerifierModel}
                            onChange={(e) => update(def.id, { verifierModel: e.target.value })}
                            style={{ fontSize: 11, padding: '4px 8px' }}
                          >
                            {verifierModels.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.name}
                                {m.notes ? ` (${m.notes})` : ''}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
