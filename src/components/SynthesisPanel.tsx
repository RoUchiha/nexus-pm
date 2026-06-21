import { useState } from 'react';
import type { SynthesisResult, CoordinationResult, VerificationResult } from '../types';

interface Props {
  synthesis: SynthesisResult;
  coordination: CoordinationResult | null;
  verification: VerificationResult | null;
  elapsed: number | null;
}

export function SynthesisPanel({ synthesis, coordination, verification, elapsed }: Props) {
  const [showFullReport, setShowFullReport] = useState(false);

  const pct = verification ? Math.round(verification.overallCompliance * 100) : null;
  const complianceColor =
    pct === null
      ? 'var(--muted)'
      : pct >= 80
        ? 'var(--green)'
        : pct >= 50
          ? 'var(--yellow)'
          : 'var(--red)';

  const copyReport = () => {
    navigator.clipboard.writeText(synthesis.fullReport).catch(() => {});
  };

  return (
    <div className="synthesis-section">
      <div className="synthesis-card">
        <div className="synthesis-header">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 18 }}>⬡</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--blue)' }}>
                  Mission Complete
                  {pct !== null && (
                    <span style={{ marginLeft: 12, fontSize: 13, color: complianceColor }}>
                      {pct}% spec compliance
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                  {elapsed !== null
                    ? `Completed in ${formatElapsed(elapsed)}`
                    : 'NEXUS Executive Report'}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={copyReport}>
                Copy Report
              </button>
              <button
                className="btn btn-ghost"
                style={{ fontSize: 12 }}
                onClick={() => setShowFullReport((v) => !v)}
              >
                {showFullReport ? 'Hide' : 'Full Report'}
              </button>
            </div>
          </div>
        </div>

        <div className="synthesis-body">
          <p className="synthesis-summary">{synthesis.summary}</p>

          {/* Spec compliance summary */}
          {synthesis.specComplianceSummary && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 6,
                marginBottom: 20,
                background: `${complianceColor}08`,
                border: `1px solid ${complianceColor}22`,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: complianceColor,
                  marginBottom: 5,
                }}
              >
                § Spec Compliance
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>
                {synthesis.specComplianceSummary}
              </div>
            </div>
          )}

          {/* Coordination misalignments */}
          {coordination && coordination.misalignments.length > 0 && (
            <div
              style={{
                marginBottom: 20,
                padding: '10px 14px',
                background: 'rgba(210,153,34,0.06)',
                borderRadius: 6,
                border: '1px solid rgba(210,153,34,0.2)',
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: 'var(--yellow)',
                  marginBottom: 6,
                }}
              >
                Coordinated Misalignments ({coordination.misalignments.length})
              </div>
              {coordination.misalignments.map((m, i) => (
                <div key={i} style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>
                  <span style={{ color: 'var(--yellow)' }}>{m.pods.join(' × ')}</span>: {m.issue} →{' '}
                  {m.resolution}
                </div>
              ))}
            </div>
          )}

          <div className="synthesis-grid-2">
            <div>
              <div className="synthesis-section-title">Deliverables</div>
              <ul className="synthesis-list">
                {synthesis.deliverables.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            </div>
            <div>
              <div className="synthesis-section-title">Implementation Roadmap</div>
              <ul className="synthesis-list">
                {synthesis.roadmap.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="synthesis-grid-2">
            <div>
              <div className="synthesis-section-title">Risks & Mitigations</div>
              <ul className="synthesis-list">
                {synthesis.risks.map((r, i) => (
                  <li key={i} style={{ color: 'var(--orange)' }}>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="synthesis-section-title">Immediate Next Steps</div>
              <ul className="synthesis-list">
                {synthesis.nextSteps.map((s, i) => (
                  <li key={i} style={{ color: 'var(--green)' }}>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {showFullReport && (
            <div>
              <div className="synthesis-section-title" style={{ marginBottom: 8 }}>
                Full Report
              </div>
              <div className="full-report">{synthesis.fullReport}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatElapsed(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}
