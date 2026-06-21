import type { AppPhase } from '../types';
import { PHASE_META } from '../lib/constants';

interface Props {
  phase: AppPhase;
  elapsed: number | null;
  onAbort: () => void;
  onReset: () => void;
}

export function Header({ phase, elapsed, onAbort, onReset }: Props) {
  const running = ['spec_drafting', 'deploying', 'executing', 'verifying', 'synthesis'].includes(
    phase,
  );
  const meta = PHASE_META[phase];

  return (
    <header className="header">
      <div className="header-brand">
        <span className="header-logo">⬡</span>
        <div>
          <div className="header-title">NEXUS</div>
          <div className="header-sub">AI PROJECT MANAGER</div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {phase !== 'idle' && (
          <div style={{ textAlign: 'right' }}>
            <div
              style={{
                fontSize: 12,
                color: running
                  ? 'var(--blue)'
                  : phase === 'complete'
                    ? 'var(--green)'
                    : phase === 'aborted'
                      ? 'var(--orange)'
                      : phase === 'error'
                        ? 'var(--red)'
                        : 'var(--muted)',
                fontWeight: 600,
              }}
            >
              {meta.label}
              {running && (
                <span
                  className="spinner"
                  style={{ display: 'inline-block', marginLeft: 6, verticalAlign: 'middle' }}
                />
              )}
            </div>
            <div style={{ fontSize: 11, color: 'var(--dim)' }}>{meta.description}</div>
          </div>
        )}
        {elapsed !== null && (
          <div style={{ fontSize: 11, color: 'var(--dim)', fontFamily: 'var(--font-mono)' }}>
            {formatElapsed(elapsed)}
          </div>
        )}
      </div>

      <div className="header-right">
        {running && (
          <button className="btn btn-danger" onClick={onAbort}>
            Abort
          </button>
        )}
        {phase !== 'idle' && !running && (
          <button className="btn btn-ghost" onClick={onReset}>
            New Mission
          </button>
        )}
      </div>
    </header>
  );
}

function formatElapsed(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}
