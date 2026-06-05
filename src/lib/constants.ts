import type { Priority, PodStatus, AppPhase, MessageType, Complexity, VCStatus, VCCategory } from '../types';

export const MANAGER_MODEL = 'claude-opus-4-8';
export const POD_MODEL = 'claude-sonnet-4-6';

export const PRIORITY_COLORS: Record<Priority, string> = {
  critical: '#f85149',
  high: '#ff9a3c',
  medium: '#d29922',
  low: '#3fb950',
};

export const STATUS_META: Record<PodStatus, { label: string; color: string; pulse: boolean }> = {
  queued:    { label: 'Queued',    color: '#484f58', pulse: false },
  waiting:   { label: 'Waiting',   color: '#d29922', pulse: true  },
  running:   { label: 'Running',   color: '#58a6ff', pulse: true  },
  completed: { label: 'Done',      color: '#3fb950', pulse: false },
  failed:    { label: 'Failed',    color: '#f85149', pulse: false },
};

export const PHASE_META: Record<AppPhase, { label: string; description: string }> = {
  idle:         { label: 'Idle',         description: 'Enter a mission to begin' },
  spec_drafting:{ label: 'Spec',         description: 'NEXUS writing the mission spec' },
  deploying:    { label: 'Deploying',    description: 'Initializing agent pods' },
  executing:    { label: 'Executing',    description: 'Pods running against spec' },
  verifying:    { label: 'Verifying',    description: 'Auditing spec compliance' },
  synthesis:    { label: 'Synthesis',    description: 'Generating compliance report' },
  complete:     { label: 'Complete',     description: 'Mission complete' },
  error:        { label: 'Error',        description: 'Mission encountered an error' },
};

export const BUS_TYPE_META: Record<MessageType, { icon: string; color: string }> = {
  broadcast:     { icon: '📡', color: '#58a6ff' },
  signal:        { icon: '➤',  color: '#bc8cff' },
  aligned:       { icon: '✓',  color: '#3fb950' },
  risk:          { icon: '⚠',  color: '#f85149' },
  spec_ref:      { icon: '§',  color: '#58a6ff' },
  spec_conflict: { icon: '⊗',  color: '#f85149' },
  system:        { icon: '⬡',  color: '#8b949e' },
};

export const COMPLEXITY_COLORS: Record<Complexity, string> = {
  low:      '#3fb950',
  medium:   '#d29922',
  high:     '#ff9a3c',
  critical: '#f85149',
};

export const VC_STATUS_META: Record<VCStatus, { label: string; color: string; icon: string }> = {
  pending: { label: 'Pending', color: '#484f58', icon: '○' },
  passed:  { label: 'Passed',  color: '#3fb950', icon: '✓' },
  partial: { label: 'Partial', color: '#d29922', icon: '◑' },
  failed:  { label: 'Failed',  color: '#f85149', icon: '✗' },
};

export const VC_CATEGORY_COLORS: Record<VCCategory, string> = {
  functional:   '#58a6ff',
  quality:      '#3fb950',
  constraint:   '#d29922',
  integration:  '#bc8cff',
};

export const VIOLATION_SEVERITY_COLORS: Record<string, string> = {
  critical: '#f85149',
  major:    '#ff9a3c',
  minor:    '#d29922',
};

export const EXAMPLE_MISSIONS = [
  'Integrate Google Cloud Observability into our existing metrics visualization pipeline. We use Prometheus + Grafana today. Need full tracing, logging, and alerting migration plan.',
  'Design and implement a zero-downtime database migration strategy from PostgreSQL 14 to Aurora PostgreSQL. We have 3 production services writing to the DB with 99.9% uptime SLA.',
  'Build a comprehensive competitive analysis for launching a B2B SaaS project management tool. Focus on pricing strategy, differentiators, and go-to-market sequencing.',
  'Architect a multi-region disaster recovery solution for our e-commerce platform. RTO of 15 minutes, RPO of 5 minutes. Services run on AWS ECS with RDS.',
];
