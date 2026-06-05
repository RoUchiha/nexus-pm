import { useState, useEffect, useRef } from 'react';
import type { Pod, MissionSpec } from '../types';
import { STATUS_META, PRIORITY_COLORS, VC_STATUS_META } from '../lib/constants';

interface Props {
  pod: Pod;
  spec?: MissionSpec | null;
  vcStatuses?: Record<string, import('../types').VCStatus>;
}

export function PodCard({ pod, spec, vcStatuses }: Props) {
  const [expanded, setExpanded] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);
  const isRunning = pod.status === 'running';
  const meta = STATUS_META[pod.status];

  useEffect(() => { if (isRunning) setExpanded(true); }, [isRunning]);

  useEffect(() => {
    if (expanded && outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [pod.output, expanded]);

  const elapsed = pod.startTime
    ? ((pod.endTime ?? Date.now()) - pod.startTime) / 1000
    : null;

  const cleanOutput = pod.output
    .replace(/\[BROADCAST\]:[^\n]*/gi, '')
    .replace(/\[ALIGNED\]:[^\n]*/gi, '')
    .replace(/\[RISK\]:[^\n]*/gi, '')
    .replace(/\[SIGNAL→\w+\]:[^\n]*/gi, '')
    .replace(/\[VC-REF:[^\]]*\]:[^\n]*/gi, '')
    .replace(/\[SPEC-CONFLICT:[^\]]*\]/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // VC assignment badges from spec
  const assignedVCs = spec?.verificationCriteria.filter(v => pod.vcIds.includes(v.id)) ?? [];

  return (
    <div className={`pod-card ${pod.status}`}>
      {/* Header */}
      <div className="pod-card-header" onClick={() => setExpanded(e => !e)}>
        <div
          className={`pod-status-indicator ${isRunning || pod.status === 'waiting' ? 'pulse' : ''}`}
          style={{ background: meta.color }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="pod-name" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {pod.name}
            {isRunning && <span className="spinner" />}
          </div>
          <div className="pod-role">{pod.role}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <span className="pod-priority-badge" style={{ color: PRIORITY_COLORS[pod.priority] }}>
            {pod.priority}
          </span>
          {pod.usedProvider && (
            <span style={{ fontSize: 10, color: 'var(--dim)', fontFamily: 'var(--font-mono)' }}>
              {pod.usedProvider}
            </span>
          )}
          {elapsed !== null && (
            <span className="pod-timing">{elapsed.toFixed(1)}s</span>
          )}
          <span style={{ color: 'var(--dim)', fontSize: 11 }}>{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {/* VC assignment bar */}
      {assignedVCs.length > 0 && (
        <div style={{
          display: 'flex', gap: 5, padding: '6px 14px', flexWrap: 'wrap',
          borderBottom: '1px solid var(--border)', background: 'rgba(0,0,0,0.15)',
        }}>
          {assignedVCs.map(vc => {
            const status = vcStatuses?.[vc.id] ?? 'pending';
            const statusMeta = VC_STATUS_META[status];
            return (
              <span
                key={vc.id}
                title={vc.description}
                style={{
                  fontSize: 10, padding: '1px 6px', borderRadius: 3,
                  fontFamily: 'var(--font-mono)', fontWeight: 700,
                  color: statusMeta.color,
                  border: `1px solid ${statusMeta.color}44`,
                  background: `${statusMeta.color}11`,
                }}
              >
                {statusMeta.icon} {vc.id}
              </span>
            );
          })}
        </div>
      )}

      {/* Expandable body */}
      <div className={`pod-card-body ${expanded ? 'expanded' : ''}`} ref={outputRef}>
        <div className="pod-deliverable">→ {pod.deliverable}</div>
        {pod.responsibility && (
          <div style={{ fontSize: 10, color: 'var(--dim)', padding: '0 14px 6px', fontStyle: 'italic' }}>
            § {pod.responsibility}
          </div>
        )}
        {cleanOutput ? (
          <div className={`pod-output${isRunning ? ' pod-output-cursor' : ''}`}>
            {cleanOutput}
          </div>
        ) : (
          <div className="pod-output" style={{ color: 'var(--dim)', fontStyle: 'italic' }}>
            {pod.status === 'waiting' ? 'Waiting for dependencies…' :
             pod.status === 'queued'  ? 'Queued…' :
             pod.status === 'running' ? 'Starting…' : 'No output.'}
          </div>
        )}
      </div>
    </div>
  );
}
