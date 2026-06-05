import type { AppPhase } from '../types';

// Ordered display phases (deploying is a sub-state of executing, not shown separately)
const ORDER: AppPhase[] = ['spec_drafting', 'executing', 'verifying', 'synthesis', 'complete'];

const LABELS: Record<AppPhase, string> = {
  idle:          'Idle',
  spec_drafting: 'Spec',
  deploying:     'Execute',
  executing:     'Execute',
  verifying:     'Verify',
  synthesis:     'Synthesize',
  complete:      'Complete',
  error:         'Error',
};

function phaseIndex(phase: AppPhase): number {
  if (phase === 'deploying') return ORDER.indexOf('executing');
  return ORDER.indexOf(phase);
}

interface Props { phase: AppPhase; }

export function PhaseIndicator({ phase }: Props) {
  const current = phaseIndex(phase);
  const isError = phase === 'error';

  return (
    <div className="phase-bar">
      {ORDER.map((p, i) => {
        const idx = phaseIndex(p);
        const done   = current > idx;
        const active = current === idx;

        return (
          <div key={p} style={{ display: 'flex', alignItems: 'center' }}>
            <div className={`phase-step ${active ? (isError ? 'error' : 'active') : done ? 'done' : ''}`}>
              <div className="phase-dot" />
              {LABELS[p]}
            </div>
            {i < ORDER.length - 1 && <div className="phase-divider" />}
          </div>
        );
      })}
    </div>
  );
}
