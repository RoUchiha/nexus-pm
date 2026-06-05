import type { DiscoveryResult } from '../types';
import { COMPLEXITY_COLORS } from '../lib/constants';

const RESOURCE_COLORS: Record<string, string> = {
  available: 'var(--green)',
  unknown:   'var(--yellow)',
  required:  'var(--orange)',
  missing:   'var(--red)',
};

interface Props { discovery: DiscoveryResult; }

export function DiscoveryPanel({ discovery }: Props) {
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="section-title">Execution Plan</span>
          <span
            className="complexity-badge"
            style={{ color: COMPLEXITY_COLORS[discovery.complexity] }}
          >
            {discovery.complexity.toUpperCase()}
          </span>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>
            est. {discovery.estimatedDuration}
          </span>
        </div>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>
          {discovery.pods.length} pods · {discovery.resources.length} resources
        </span>
      </div>

      <div className="card-body">
        <p style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6, marginBottom: 16 }}>
          {discovery.analysis}
        </p>

        <div className="discovery-grid">
          <div>
            <div className="label">Resources</div>
            {discovery.resources.map((r, i) => (
              <div key={i} className="resource-item">
                <div className="resource-status-dot" style={{ background: RESOURCE_COLORS[r.status] ?? 'var(--dim)' }} />
                <div>
                  <div className="resource-name">{r.name}</div>
                  <div className="resource-notes">{r.status} — {r.notes}</div>
                </div>
              </div>
            ))}
          </div>

          <div>
            {discovery.risks.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div className="label">Risks</div>
                {discovery.risks.map((r, i) => (
                  <div key={i} className="risk-item">{r}</div>
                ))}
              </div>
            )}
            {discovery.questions.length > 0 && (
              <div>
                <div className="label">Open Questions</div>
                {discovery.questions.map((q, i) => (
                  <div key={i} className="question-item">{q}</div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Pod plan with VC assignments */}
        <div style={{ marginTop: 16 }}>
          <div className="label">Pod Plan</div>
          {discovery.pods.map(pod => (
            <div key={pod.id} className="pod-blueprint">
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--blue)', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{pod.name}</span>
                <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 8 }}>{pod.role}</span>
              </div>
              {pod.vcIds.length > 0 && (
                <div style={{ display: 'flex', gap: 4 }}>
                  {pod.vcIds.map(id => (
                    <span key={id} style={{
                      fontSize: 9, padding: '1px 5px', borderRadius: 3,
                      color: 'var(--blue)', border: '1px solid rgba(88,166,255,0.3)',
                      background: 'rgba(88,166,255,0.08)', fontFamily: 'var(--font-mono)',
                    }}>
                      {id}
                    </span>
                  ))}
                </div>
              )}
              {pod.dependencies.length > 0 && (
                <span style={{ fontSize: 10, color: 'var(--dim)' }}>
                  needs: {pod.dependencies.join(', ')}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
