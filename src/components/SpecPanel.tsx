import { useState } from 'react';
import type { MissionSpec, VerificationCriterion } from '../types';
import { VC_CATEGORY_COLORS, VC_STATUS_META } from '../lib/constants';

interface Props {
  spec: MissionSpec;
  vcStatuses?: Record<string, import('../types').VCStatus>; // populated after verification
}

const CATEGORY_LABELS: Record<string, string> = {
  functional: 'Func',
  quality: 'Qual',
  constraint: 'Const',
  integration: 'Integ',
};

export function SpecPanel({ spec, vcStatuses }: Props) {
  const [section, setSection] = useState<'vcs' | 'scope' | 'constraints' | 'meta'>('vcs');

  const tabs = [
    { key: 'vcs', label: `VCs (${spec.verificationCriteria.length})` },
    { key: 'scope', label: 'Scope' },
    { key: 'constraints', label: 'Constraints' },
    { key: 'meta', label: 'Meta' },
  ] as const;

  const passedCount = spec.verificationCriteria.filter(
    (v) => vcStatuses?.[v.id] === 'passed',
  ).length;
  const failedCount = spec.verificationCriteria.filter(
    (v) => vcStatuses?.[v.id] === 'failed',
  ).length;
  const partialCount = spec.verificationCriteria.filter(
    (v) => vcStatuses?.[v.id] === 'partial',
  ).length;
  const pendingCount = spec.verificationCriteria.filter(
    (v) => !vcStatuses || vcStatuses[v.id] === 'pending' || !vcStatuses[v.id],
  ).length;

  return (
    <div className="card spec-panel" style={{ marginBottom: 20 }}>
      {/* Header */}
      <div className="card-header" style={{ background: 'rgba(88,166,255,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span
            style={{ fontSize: 14, color: 'var(--blue)', fontWeight: 700, letterSpacing: '0.04em' }}
          >
            § MISSION SPEC
          </span>
          <span
            style={{
              fontSize: 10,
              padding: '1px 6px',
              borderRadius: 3,
              background: 'rgba(88,166,255,0.12)',
              color: 'var(--blue)',
              fontFamily: 'var(--font-mono)',
              border: '1px solid rgba(88,166,255,0.3)',
            }}
          >
            v{spec.version} · {spec.status.toUpperCase()}
          </span>
        </div>

        {vcStatuses && (
          <div style={{ display: 'flex', gap: 10, fontSize: 11 }}>
            {passedCount > 0 && (
              <span style={{ color: 'var(--green)' }}>✓ {passedCount} passed</span>
            )}
            {partialCount > 0 && (
              <span style={{ color: 'var(--yellow)' }}>◑ {partialCount} partial</span>
            )}
            {failedCount > 0 && <span style={{ color: 'var(--red)' }}>✗ {failedCount} failed</span>}
            {pendingCount > 0 && (
              <span style={{ color: 'var(--dim)' }}>○ {pendingCount} pending</span>
            )}
          </div>
        )}
      </div>

      {/* Outcomes */}
      <div
        style={{
          padding: '10px 16px',
          borderBottom: '1px solid var(--border)',
          background: 'rgba(88,166,255,0.02)',
        }}
      >
        <div
          style={{
            fontSize: 10,
            color: 'var(--dim)',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: 6,
          }}
        >
          Required Outcomes
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {spec.outcomes.map((o, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, fontSize: 12, color: 'var(--text)' }}>
              <span style={{ color: 'var(--blue)', flexShrink: 0 }}>→</span>
              <span>{o}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tab bar */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--border)',
          background: 'var(--surface)',
        }}
      >
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setSection(t.key)}
            style={{
              padding: '7px 14px',
              fontSize: 11,
              fontWeight: 600,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: section === t.key ? 'var(--blue)' : 'var(--muted)',
              borderBottom: section === t.key ? '2px solid var(--blue)' : '2px solid transparent',
              transition: 'all 0.15s',
              letterSpacing: '0.03em',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ padding: '14px 16px' }}>
        {section === 'vcs' && (
          <VCTable
            vcs={spec.verificationCriteria}
            vcStatuses={vcStatuses}
            podSections={spec.podSections}
          />
        )}
        {section === 'scope' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div>
              <div
                style={{
                  fontSize: 10,
                  color: 'var(--green)',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  marginBottom: 8,
                }}
              >
                ✓ In Scope
              </div>
              {spec.scope.in.map((s, i) => (
                <div
                  key={i}
                  style={{
                    fontSize: 12,
                    color: 'var(--text)',
                    padding: '3px 0',
                    display: 'flex',
                    gap: 6,
                  }}
                >
                  <span style={{ color: 'var(--green)' }}>+</span>
                  {s}
                </div>
              ))}
            </div>
            <div>
              <div
                style={{
                  fontSize: 10,
                  color: 'var(--red)',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  marginBottom: 8,
                }}
              >
                ✗ Out of Scope
              </div>
              {spec.scope.out.map((s, i) => (
                <div
                  key={i}
                  style={{
                    fontSize: 12,
                    color: 'var(--muted)',
                    padding: '3px 0',
                    display: 'flex',
                    gap: 6,
                  }}
                >
                  <span style={{ color: 'var(--red)' }}>−</span>
                  {s}
                </div>
              ))}
            </div>
          </div>
        )}
        {section === 'constraints' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            <ConstraintGroup
              label="Always Do"
              items={spec.constraints.always}
              color="var(--green)"
              icon="✓"
            />
            <ConstraintGroup
              label="Ask First"
              items={spec.constraints.askFirst}
              color="var(--yellow)"
              icon="?"
            />
            <ConstraintGroup
              label="Never Do"
              items={spec.constraints.never}
              color="var(--red)"
              icon="✗"
            />
          </div>
        )}
        {section === 'meta' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <div
                style={{
                  fontSize: 10,
                  color: 'var(--muted)',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  marginBottom: 8,
                }}
              >
                Assumptions
              </div>
              {spec.assumptions.length > 0 ? (
                spec.assumptions.map((a, i) => (
                  <div key={i} style={{ fontSize: 12, color: 'var(--muted)', padding: '2px 0' }}>
                    · {a}
                  </div>
                ))
              ) : (
                <div style={{ fontSize: 12, color: 'var(--dim)' }}>None</div>
              )}
            </div>
            <div>
              <div
                style={{
                  fontSize: 10,
                  color: 'var(--muted)',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  marginBottom: 8,
                }}
              >
                Prior Decisions
              </div>
              {spec.priorDecisions.length > 0 ? (
                spec.priorDecisions.map((d, i) => (
                  <div key={i} style={{ fontSize: 12, color: 'var(--muted)', padding: '2px 0' }}>
                    · {d}
                  </div>
                ))
              ) : (
                <div style={{ fontSize: 12, color: 'var(--dim)' }}>None recorded</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function VCTable({
  vcs,
  vcStatuses,
  podSections,
}: {
  vcs: VerificationCriterion[];
  vcStatuses?: Record<string, import('../types').VCStatus>;
  podSections: MissionSpec['podSections'];
}) {
  const podFor = (vcId: string) => podSections.find((s) => s.vcIds.includes(vcId))?.podId ?? '—';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {vcs.map((vc) => {
        const status = vcStatuses?.[vc.id] ?? 'pending';
        const statusMeta = VC_STATUS_META[status];
        const catColor = VC_CATEGORY_COLORS[vc.category];

        return (
          <div
            key={vc.id}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              padding: '8px 10px',
              borderRadius: 6,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderLeft: `3px solid ${statusMeta.color}`,
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                fontWeight: 700,
                color: 'var(--dim)',
                flexShrink: 0,
                marginTop: 1,
                minWidth: 48,
              }}
            >
              {vc.id}
            </span>
            <span
              style={{
                fontSize: 10,
                padding: '1px 5px',
                borderRadius: 3,
                color: catColor,
                border: `1px solid ${catColor}44`,
                background: `${catColor}11`,
                flexShrink: 0,
                marginTop: 1,
              }}
            >
              {CATEGORY_LABELS[vc.category]}
            </span>
            <span style={{ flex: 1, fontSize: 12, color: 'var(--text)', lineHeight: 1.5 }}>
              {vc.description}
            </span>
            <span
              style={{
                fontSize: 10,
                color: 'var(--dim)',
                flexShrink: 0,
                marginTop: 1,
                fontFamily: 'var(--font-mono)',
              }}
            >
              {podFor(vc.id)}
            </span>
            <span style={{ fontSize: 13, color: statusMeta.color, flexShrink: 0 }}>
              {statusMeta.icon}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function ConstraintGroup({
  label,
  items,
  color,
  icon,
}: {
  label: string;
  items: string[];
  color: string;
  icon: string;
}) {
  return (
    <div>
      <div
        style={{
          fontSize: 10,
          color,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          marginBottom: 8,
          display: 'flex',
          alignItems: 'center',
          gap: 5,
        }}
      >
        <span>{icon}</span> {label}
      </div>
      {items.length > 0 ? (
        items.map((c, i) => (
          <div
            key={i}
            style={{
              fontSize: 11,
              color: 'var(--muted)',
              padding: '3px 0',
              lineHeight: 1.5,
              display: 'flex',
              gap: 6,
            }}
          >
            <span style={{ color, flexShrink: 0 }}>{icon}</span>
            {c}
          </div>
        ))
      ) : (
        <div style={{ fontSize: 11, color: 'var(--dim)' }}>None</div>
      )}
    </div>
  );
}
