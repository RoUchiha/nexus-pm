import { useState } from 'react';
import type { VerificationResult, MissionSpec } from '../types';
import { VC_STATUS_META, VIOLATION_SEVERITY_COLORS } from '../lib/constants';

interface Props {
  verification: VerificationResult;
  spec: MissionSpec;
}

export function VerificationPanel({ verification, spec }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const pct = Math.round(verification.overallCompliance * 100);

  const passed = verification.vcResults.filter((r) => r.status === 'passed').length;
  const partial = verification.vcResults.filter((r) => r.status === 'partial').length;
  const failed = verification.vcResults.filter((r) => r.status === 'failed').length;
  const total = verification.vcResults.length;

  const complianceColor = pct >= 80 ? 'var(--green)' : pct >= 50 ? 'var(--yellow)' : 'var(--red)';

  const vcById = new Map(spec.verificationCriteria.map((v) => [v.id, v]));

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      {/* Header */}
      <div className="card-header" style={{ background: `${complianceColor}08` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: complianceColor }}>
            ⊕ Spec Verification
          </span>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>
            Adversarial audit — independent from implementing pods
          </span>
        </div>

        {/* Compliance gauge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ display: 'flex', gap: 10, fontSize: 11 }}>
            <span style={{ color: 'var(--green)' }}>✓ {passed}</span>
            <span style={{ color: 'var(--yellow)' }}>◑ {partial}</span>
            <span style={{ color: 'var(--red)' }}>✗ {failed}</span>
            <span style={{ color: 'var(--dim)' }}>/ {total}</span>
          </div>
          <div
            style={{
              fontSize: 20,
              fontWeight: 800,
              fontFamily: 'var(--font-mono)',
              color: complianceColor,
            }}
          >
            {pct}%
          </div>
        </div>
      </div>

      {/* Compliance bar */}
      <div style={{ height: 4, background: 'var(--border)', position: 'relative' }}>
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            height: '100%',
            width: `${pct}%`,
            background: complianceColor,
            transition: 'width 0.6s ease',
          }}
        />
        {partial > 0 && (
          <div
            style={{
              position: 'absolute',
              left: `${(passed / total) * 100}%`,
              top: 0,
              height: '100%',
              width: `${(partial / total) * 50}%`,
              background: 'var(--yellow)',
              opacity: 0.6,
            }}
          />
        )}
      </div>

      <div style={{ padding: '14px 16px' }}>
        {/* VC Results */}
        <div style={{ marginBottom: verification.violations.length > 0 ? 16 : 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {verification.vcResults.map((result) => {
              const vc = vcById.get(result.id);
              const meta = VC_STATUS_META[result.status];
              const isOpen = expanded === result.id;

              return (
                <div
                  key={result.id}
                  style={{
                    borderRadius: 6,
                    border: `1px solid var(--border)`,
                    borderLeft: `3px solid ${meta.color}`,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    onClick={() => setExpanded(isOpen ? null : result.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px 12px',
                      cursor: 'pointer',
                      background: isOpen ? 'var(--surface)' : 'transparent',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 10,
                        fontWeight: 700,
                        color: 'var(--dim)',
                        flexShrink: 0,
                        minWidth: 48,
                      }}
                    >
                      {result.id}
                    </span>
                    <span style={{ flex: 1, fontSize: 12, color: 'var(--text)', lineHeight: 1.4 }}>
                      {vc?.description ?? result.id}
                    </span>
                    {result.satisfiedBy && (
                      <span
                        style={{
                          fontSize: 10,
                          color: 'var(--dim)',
                          fontFamily: 'var(--font-mono)',
                          flexShrink: 0,
                        }}
                      >
                        {result.satisfiedBy}
                      </span>
                    )}
                    <span
                      style={{ fontSize: 14, color: meta.color, flexShrink: 0, fontWeight: 700 }}
                    >
                      {meta.icon}
                    </span>
                    <span style={{ color: 'var(--dim)', fontSize: 10 }}>{isOpen ? '▲' : '▼'}</span>
                  </div>

                  {isOpen && (
                    <div
                      style={{
                        padding: '10px 12px',
                        borderTop: '1px solid var(--border)',
                        background: 'var(--surface)',
                      }}
                    >
                      {result.evidence && (
                        <div style={{ marginBottom: 8 }}>
                          <div
                            style={{
                              fontSize: 10,
                              color: 'var(--green)',
                              fontWeight: 700,
                              marginBottom: 4,
                            }}
                          >
                            EVIDENCE
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              color: 'var(--muted)',
                              fontFamily: 'var(--font-mono)',
                              background: 'var(--card)',
                              padding: '8px 10px',
                              borderRadius: 4,
                              borderLeft: '3px solid var(--green)',
                              lineHeight: 1.5,
                            }}
                          >
                            {result.evidence}
                          </div>
                        </div>
                      )}
                      {result.gap && (
                        <div>
                          <div
                            style={{
                              fontSize: 10,
                              color: 'var(--red)',
                              fontWeight: 700,
                              marginBottom: 4,
                            }}
                          >
                            GAP
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              color: 'var(--muted)',
                              fontFamily: 'var(--font-mono)',
                              background: 'var(--card)',
                              padding: '8px 10px',
                              borderRadius: 4,
                              borderLeft: '3px solid var(--red)',
                              lineHeight: 1.5,
                            }}
                          >
                            {result.gap}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Violations */}
        {verification.violations.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div
              style={{
                fontSize: 10,
                color: 'var(--red)',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: 8,
              }}
            >
              Spec Violations ({verification.violations.length})
            </div>
            {verification.violations.map((v, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  gap: 10,
                  padding: '7px 10px',
                  borderRadius: 5,
                  background: 'rgba(248,81,73,0.06)',
                  border: '1px solid rgba(248,81,73,0.2)',
                  marginBottom: 4,
                  fontSize: 12,
                }}
              >
                <span
                  style={{
                    fontSize: 10,
                    padding: '1px 5px',
                    borderRadius: 3,
                    flexShrink: 0,
                    color: VIOLATION_SEVERITY_COLORS[v.severity],
                    border: `1px solid ${VIOLATION_SEVERITY_COLORS[v.severity]}44`,
                    background: `${VIOLATION_SEVERITY_COLORS[v.severity]}11`,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                  }}
                >
                  {v.severity}
                </span>
                <span
                  style={{
                    color: 'var(--dim)',
                    fontSize: 10,
                    flexShrink: 0,
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {v.type}
                </span>
                <span style={{ color: 'var(--muted)', flex: 1 }}>{v.description}</span>
                <span
                  style={{
                    color: 'var(--dim)',
                    fontSize: 10,
                    fontFamily: 'var(--font-mono)',
                    flexShrink: 0,
                  }}
                >
                  {v.podId}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Spec updates suggested */}
        {verification.specUpdates.length > 0 && (
          <div>
            <div
              style={{
                fontSize: 10,
                color: 'var(--blue)',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: 8,
              }}
            >
              Suggested Spec Updates
            </div>
            {verification.specUpdates.map((u, i) => (
              <div
                key={i}
                style={{
                  padding: '7px 10px',
                  borderRadius: 5,
                  marginBottom: 4,
                  background: 'rgba(88,166,255,0.05)',
                  border: '1px solid rgba(88,166,255,0.15)',
                  fontSize: 12,
                }}
              >
                <span
                  style={{ fontSize: 10, color: 'var(--blue)', fontWeight: 700, marginRight: 8 }}
                >
                  {u.section}
                </span>
                <span style={{ color: 'var(--muted)' }}>{u.suggestion}</span>
                {u.rationale && (
                  <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 3 }}>
                    ↳ {u.rationale}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
