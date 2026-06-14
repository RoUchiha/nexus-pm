import { useState, useCallback } from 'react';
import { validateMission, sanitizeInput } from '../lib/security';
import { EXAMPLE_MISSIONS } from '../lib/constants';

interface Props {
  onSubmit: (mission: string) => void;
  onDemo?: () => void;
  disabled: boolean;
  hasApiKey: boolean;
}

export function MissionInput({ onSubmit, onDemo, disabled, hasApiKey }: Props) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');

  const submit = useCallback(() => {
    const clean = sanitizeInput(text);
    const { valid, error: err } = validateMission(clean);
    if (!valid) { setError(err ?? 'Invalid mission'); return; }
    setError('');
    onSubmit(clean);
    setText('');
  }, [text, onSubmit]);

  const loadExample = useCallback((ex: string) => {
    setText(ex);
    setError('');
  }, []);

  return (
    <div className="mission-section">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span className="section-title">Mission Briefing</span>
        <span style={{ fontSize: 11, color: 'var(--dim)' }}>{text.length}/2000</span>
      </div>

      <textarea
        className={`mission-textarea${error ? ' input-error' : ''}`}
        placeholder="Describe the mission for NEXUS. Be specific about goals, constraints, and context..."
        value={text}
        onChange={e => { setText(e.target.value); setError(''); }}
        onKeyDown={e => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit();
        }}
        disabled={disabled}
      />

      {error && (
        <div style={{ fontSize: 12, color: 'var(--red)', marginTop: 4 }}>{error}</div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
        <div className="mission-examples">
          {EXAMPLE_MISSIONS.map((ex, i) => (
            <button key={i} className="mission-example" onClick={() => loadExample(ex)} title={ex}>
              {ex.slice(0, 60)}…
            </button>
          ))}
        </div>

        <button
          className="btn btn-primary"
          onClick={submit}
          disabled={disabled || !hasApiKey || !text.trim()}
          style={{ flexShrink: 0, marginLeft: 12 }}
        >
          {disabled ? (
            <><span className="spinner" />Running…</>
          ) : (
            <>⬡ Launch Mission</>
          )}
        </button>
      </div>

      {!hasApiKey && (
        <div style={{ fontSize: 11, color: 'var(--yellow)', marginTop: 6 }}>
          ⚠ Configure a manager-capable provider, or connect worker agents for worker routing.
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
        <span style={{ fontSize: 11, color: 'var(--dim)' }}>⌘ + Enter to launch</span>
        {onDemo && (
          <button
            className="btn btn-ghost"
            onClick={onDemo}
            disabled={disabled}
            style={{ fontSize: 11, opacity: 0.8, display: 'flex', alignItems: 'center', gap: 5 }}
          >
            <span style={{ fontSize: 13 }}>▶</span> Watch Demo
          </button>
        )}
      </div>
    </div>
  );
}
