import { useState, useRef, useEffect } from 'react';
import type { ActivityLogEntry, ActivityAction } from '../types';

const ACTION_META: Record<ActivityAction, { label: string; color: string }> = {
  spec_drafted: { label: 'SPEC DRAFTED', color: 'var(--blue)' },
  pod_started: { label: 'POD STARTED', color: 'var(--muted)' },
  pod_completed: { label: 'POD COMPLETE', color: 'var(--green)' },
  pod_failed: { label: 'POD FAILED', color: 'var(--red)' },
  worker_agent_claimed: { label: 'WORKER CLAIMED', color: 'var(--blue)' },
  worker_submission_received: { label: 'WORKER SUBMIT', color: 'var(--purple)' },
  worker_submission_approved: { label: 'WORK APPROVED', color: 'var(--green)' },
  worker_revision_requested: { label: 'REVISION', color: 'var(--yellow)' },
  manager_directive: { label: 'DIRECTIVE', color: 'var(--yellow)' },
  verification_result: { label: 'VERIFIED', color: 'var(--purple)' },
  coordination_correction: { label: 'CORRECTION', color: 'var(--orange)' },
  synthesis_complete: { label: 'SYNTHESIZED', color: 'var(--green)' },
};

const AGENT_ICONS: Record<string, string> = {
  'nexus-manager': '⬡',
  'nexus-verifier': '◈',
};

function agentIcon(agentId: string): string {
  if (agentId.startsWith('worker:')) return '◇';
  if (agentId.startsWith('pod:')) return '◉';
  return AGENT_ICONS[agentId] ?? '○';
}

function agentColor(agentId: string): string {
  if (agentId === 'nexus-manager') return 'var(--blue)';
  if (agentId === 'nexus-verifier') return 'var(--purple)';
  if (agentId.startsWith('worker:')) return 'var(--orange)';
  if (agentId.startsWith('pod:')) return 'var(--green)';
  return 'var(--muted)';
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

interface Props {
  entries: ActivityLogEntry[];
}

export function ActivityFeedPanel({ entries }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [autoScroll, setAutoScroll] = useState(true);
  const [filterAgent, setFilterAgent] = useState<string>('ALL');
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll when new entries arrive
  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [entries.length, autoScroll]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
    setAutoScroll(atBottom);
  };

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const agents = ['ALL', ...Array.from(new Set(entries.map((e) => e.agentId)))];

  const visible =
    filterAgent === 'ALL' ? entries : entries.filter((e) => e.agentId === filterAgent);

  if (entries.length === 0) return null;

  return (
    <div
      style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        overflow: 'hidden',
        marginTop: 16,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '10px 14px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--surface)',
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--muted)',
          }}
        >
          Agent Activity Feed
        </span>
        <span
          style={{
            fontSize: 10,
            padding: '1px 6px',
            borderRadius: 10,
            background: 'rgba(88,166,255,0.12)',
            color: 'var(--blue)',
            border: '1px solid rgba(88,166,255,0.25)',
          }}
        >
          {entries.length} event{entries.length !== 1 ? 's' : ''}
        </span>

        <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
          {agents.map((agent) => (
            <button
              key={agent}
              onClick={() => setFilterAgent(agent)}
              style={{
                fontSize: 10,
                padding: '2px 7px',
                borderRadius: 10,
                border: '1px solid var(--border)',
                background: filterAgent === agent ? 'var(--border)' : 'transparent',
                color: filterAgent === agent ? 'var(--text)' : 'var(--dim)',
                cursor: 'pointer',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {agent === 'ALL' ? 'All' : agent.replace('pod:', '')}
            </button>
          ))}
        </div>
      </div>

      {/* Feed */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        style={{ maxHeight: 420, overflowY: 'auto', padding: '8px 0' }}
      >
        {visible.map((entry) => {
          const meta = ACTION_META[entry.action] ?? {
            label: entry.action.toUpperCase(),
            color: 'var(--muted)',
          };
          const isExpanded = expanded.has(entry.id);
          const hasDetails = !!(entry.details || entry.reasoning);

          return (
            <div
              key={entry.id}
              style={{
                padding: '6px 14px',
                borderBottom: '1px solid var(--border)',
                cursor: hasDetails ? 'pointer' : 'default',
                transition: 'background 0.1s',
              }}
              role={hasDetails ? 'button' : undefined}
              tabIndex={hasDetails ? 0 : undefined}
              aria-expanded={hasDetails ? isExpanded : undefined}
              onMouseEnter={(e) => {
                if (hasDetails)
                  (e.currentTarget as HTMLDivElement).style.background = 'var(--surface)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.background = 'transparent';
              }}
              onClick={() => hasDetails && toggleExpand(entry.id)}
              onKeyDown={(event) => {
                if (hasDetails && (event.key === 'Enter' || event.key === ' ')) {
                  event.preventDefault();
                  toggleExpand(entry.id);
                }
              }}
            >
              {/* Main row */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                {/* Agent icon + name */}
                <span style={{ fontSize: 13, color: agentColor(entry.agentId), flexShrink: 0 }}>
                  {agentIcon(entry.agentId)}
                </span>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span
                      style={{ fontSize: 11, fontWeight: 600, color: agentColor(entry.agentId) }}
                    >
                      {entry.agentName}
                    </span>
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        letterSpacing: '0.07em',
                        color: meta.color,
                        border: `1px solid ${meta.color}44`,
                        padding: '0px 5px',
                        borderRadius: 3,
                        background: `${meta.color}14`,
                      }}
                    >
                      {meta.label}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        color: 'var(--dim)',
                        marginLeft: 'auto',
                        flexShrink: 0,
                      }}
                    >
                      {formatTime(entry.timestamp)}
                    </span>
                    {hasDetails && (
                      <span style={{ fontSize: 9, color: 'var(--dim)' }}>
                        {isExpanded ? '▲' : '▼'}
                      </span>
                    )}
                  </div>

                  {/* Mission portion */}
                  <div
                    style={{
                      fontSize: 11,
                      color: 'var(--muted)',
                      marginTop: 2,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    <span style={{ color: 'var(--dim)', fontSize: 10 }}>SCOPE </span>
                    {entry.missionPortion}
                  </div>

                  {/* Reasoning (always shown, truncated) */}
                  <div
                    style={{
                      fontSize: 11,
                      color: 'var(--text)',
                      marginTop: 3,
                      lineHeight: 1.45,
                      display: isExpanded ? undefined : '-webkit-box',
                      WebkitLineClamp: isExpanded ? undefined : 2,
                      WebkitBoxOrient: isExpanded ? undefined : 'vertical',
                      overflow: isExpanded ? undefined : 'hidden',
                    }}
                  >
                    {entry.reasoning}
                  </div>

                  {/* Details — only shown when expanded */}
                  {isExpanded && entry.details && (
                    <div
                      style={{
                        fontSize: 10,
                        color: 'var(--dim)',
                        marginTop: 6,
                        padding: '6px 8px',
                        background: 'var(--surface)',
                        borderRadius: 4,
                        border: '1px solid var(--border)',
                        fontFamily: 'var(--font-mono)',
                        lineHeight: 1.5,
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {entry.details}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        <div ref={bottomRef} />
      </div>

      {/* Footer */}
      {!autoScroll && (
        <div
          style={{
            textAlign: 'center',
            padding: '6px',
            cursor: 'pointer',
            fontSize: 11,
            color: 'var(--blue)',
            borderTop: '1px solid var(--border)',
          }}
          onClick={() => {
            setAutoScroll(true);
            bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
          }}
        >
          ↓ Jump to latest
        </div>
      )}
    </div>
  );
}
