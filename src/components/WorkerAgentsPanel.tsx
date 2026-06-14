import { useEffect, useMemo, useState } from 'react';
import type {
  AppPhase,
  Pod,
  WorkerAgentConnection,
  WorkerMode,
  WorkerPodAssignment,
} from '../types';

interface Props {
  agents: WorkerAgentConnection[];
  mode: WorkerMode;
  phase: AppPhase;
  pods: Pod[];
  assignments: WorkerPodAssignment[];
  onAgentsChange: (agents: WorkerAgentConnection[]) => void;
  onModeChange: (mode: WorkerMode) => void;
  onClaim: (podId: string, workerAgentId: string) => void;
  onSubmit: (podId: string, output: string) => Promise<void>;
}

const STATUS_LABELS: Record<WorkerPodAssignment['status'], string> = {
  unassigned: 'Unassigned',
  assigned: 'Assigned',
  reviewing: 'Reviewing',
  revision_requested: 'Needs revision',
  accepted: 'Accepted',
};

export function WorkerAgentsPanel({
  agents,
  mode,
  phase,
  pods,
  assignments,
  onAgentsChange,
  onModeChange,
  onClaim,
  onSubmit,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftOwner, setDraftOwner] = useState('');
  const [draftCapabilities, setDraftCapabilities] = useState('');
  const [draftNotes, setDraftNotes] = useState('');
  const [selectedWorkers, setSelectedWorkers] = useState<Record<string, string>>({});
  const [outputDrafts, setOutputDrafts] = useState<Record<string, string>>({});
  const [submittingPods, setSubmittingPods] = useState<Set<string>>(new Set());
  const [copiedPodId, setCopiedPodId] = useState<string | null>(null);

  const isIdle = phase === 'idle';
  const enabledAgents = useMemo(() => agents.filter(agent => agent.enabled), [agents]);
  const activeAssignments = assignments.filter(assignment => pods.some(pod => pod.id === assignment.podId));

  useEffect(() => {
    if (activeAssignments.length > 0) setExpanded(true);
  }, [activeAssignments.length]);

  const setAgents = (next: WorkerAgentConnection[]) => {
    onAgentsChange(next);
  };

  const addAgent = () => {
    const name = draftName.trim();
    if (!name) return;

    setAgents([
      ...agents,
      {
        id: `worker_${Date.now()}`,
        name,
        ownerName: draftOwner.trim(),
        capabilities: draftCapabilities.trim(),
        connectionNotes: draftNotes.trim(),
        enabled: true,
        createdAt: Date.now(),
      },
    ]);
    setDraftName('');
    setDraftOwner('');
    setDraftCapabilities('');
    setDraftNotes('');
  };

  const updateAgent = (id: string, patch: Partial<WorkerAgentConnection>) => {
    setAgents(agents.map(agent => agent.id === id ? { ...agent, ...patch } : agent));
  };

  const removeAgent = (id: string) => {
    setAgents(agents.filter(agent => agent.id !== id));
  };

  const selectedWorkerFor = (podId: string): string => (
    selectedWorkers[podId] ?? enabledAgents[0]?.id ?? ''
  );

  const copyHandoff = async (assignment: WorkerPodAssignment) => {
    if (!assignment.handoffPrompt) return;
    try {
      await navigator.clipboard.writeText(assignment.handoffPrompt);
      setCopiedPodId(assignment.podId);
      window.setTimeout(() => setCopiedPodId(null), 1600);
    } catch {
      setCopiedPodId(null);
    }
  };

  const submitOutput = async (podId: string) => {
    const output = outputDrafts[podId]?.trim() ?? '';
    if (!output) return;

    setSubmittingPods(prev => new Set(prev).add(podId));
    try {
      await onSubmit(podId, output);
    } finally {
      setSubmittingPods(prev => {
        const next = new Set(prev);
        next.delete(podId);
        return next;
      });
    }
  };

  return (
    <section className="worker-panel">
      <div className="worker-panel-header" onClick={() => setExpanded(value => !value)}>
        <div>
          <div className="section-title">Company Worker Agents</div>
          <div className="worker-panel-sub">
            {enabledAgents.length}/{agents.length} connected
            {mode === 'company_workers' ? ' · worker routing on' : ' · autonomous routing'}
          </div>
        </div>

        <div className="worker-panel-actions" onClick={event => event.stopPropagation()}>
          <label className={`worker-mode-toggle ${mode === 'company_workers' ? 'active' : ''}`}>
            <input
              type="checkbox"
              checked={mode === 'company_workers'}
              disabled={!isIdle}
              onChange={event => onModeChange(event.target.checked ? 'company_workers' : 'autonomous')}
            />
            Worker routing
          </label>
          <button className="btn btn-ghost worker-expand-btn" onClick={() => setExpanded(value => !value)}>
            {expanded ? 'Hide' : 'Manage'}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="worker-panel-body">
          <div className="worker-roster">
            {agents.length === 0 ? (
              <div className="worker-empty">No company worker agents connected.</div>
            ) : (
              agents.map(agent => (
                <div key={agent.id} className="worker-agent-row">
                  <button
                    className={`worker-agent-toggle ${agent.enabled ? 'enabled' : ''}`}
                    onClick={() => updateAgent(agent.id, { enabled: !agent.enabled })}
                    disabled={!isIdle}
                    title={agent.enabled ? 'Disable worker agent' : 'Enable worker agent'}
                  />
                  <div className="worker-agent-main">
                    <div className="worker-agent-name">{agent.name}</div>
                    <div className="worker-agent-meta">
                      {agent.ownerName || 'Unassigned owner'} · {agent.capabilities || 'No capabilities declared'}
                    </div>
                  </div>
                  {isIdle && (
                    <button className="btn btn-ghost worker-remove-btn" onClick={() => removeAgent(agent.id)}>
                      Remove
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          {isIdle && (
            <div className="worker-agent-form">
              <input
                className="input"
                placeholder="Agent name"
                value={draftName}
                onChange={event => setDraftName(event.target.value)}
              />
              <input
                className="input"
                placeholder="Worker owner"
                value={draftOwner}
                onChange={event => setDraftOwner(event.target.value)}
              />
              <input
                className="input worker-capabilities-input"
                placeholder="Capabilities"
                value={draftCapabilities}
                onChange={event => setDraftCapabilities(event.target.value)}
              />
              <input
                className="input worker-notes-input"
                placeholder="Connection notes"
                value={draftNotes}
                onChange={event => setDraftNotes(event.target.value)}
              />
              <button className="btn btn-primary" onClick={addAgent} disabled={!draftName.trim()}>
                Connect Agent
              </button>
            </div>
          )}

          {activeAssignments.length > 0 && (
            <div className="worker-assignments">
              <div className="label">Manager Handoffs</div>
              {activeAssignments.map(assignment => {
                const pod = pods.find(item => item.id === assignment.podId);
                const worker = agents.find(agent => agent.id === assignment.workerAgentId);
                const selectedWorkerId = selectedWorkerFor(assignment.podId);
                const isSubmitting = submittingPods.has(assignment.podId);
                if (!pod) return null;

                return (
                  <div key={assignment.podId} className={`worker-assignment ${assignment.status}`}>
                    <div className="worker-assignment-header">
                      <div>
                        <div className="worker-assignment-title">{pod.name}</div>
                        <div className="worker-agent-meta">{pod.responsibility}</div>
                      </div>
                      <span className="worker-status-badge">{STATUS_LABELS[assignment.status]}</span>
                    </div>

                    {assignment.status === 'unassigned' && (
                      <div className="worker-claim-row">
                        <select
                          className="input"
                          value={selectedWorkerId}
                          onChange={event => setSelectedWorkers(prev => ({
                            ...prev,
                            [assignment.podId]: event.target.value,
                          }))}
                          disabled={enabledAgents.length === 0}
                        >
                          {enabledAgents.length === 0 ? (
                            <option value="">No enabled worker agents</option>
                          ) : (
                            enabledAgents.map(agent => (
                              <option key={agent.id} value={agent.id}>{agent.name}</option>
                            ))
                          )}
                        </select>
                        <button
                          className="btn btn-primary"
                          onClick={() => onClaim(assignment.podId, selectedWorkerId)}
                          disabled={!selectedWorkerId}
                        >
                          Claim
                        </button>
                      </div>
                    )}

                    {assignment.status !== 'unassigned' && (
                      <div className="worker-handoff">
                        <div className="worker-handoff-meta">
                          <span>Worker: {worker?.name ?? 'Unknown worker'}</span>
                          {assignment.review?.summary && <span>Manager: {assignment.review.summary}</span>}
                        </div>

                        {assignment.handoffPrompt && (
                          <>
                            <div className="worker-copy-row">
                              <span className="label">Handoff Packet</span>
                              <button className="btn btn-ghost" onClick={() => copyHandoff(assignment)}>
                                {copiedPodId === assignment.podId ? 'Copied' : 'Copy'}
                              </button>
                            </div>
                            <textarea
                              className="input worker-handoff-text"
                              value={assignment.handoffPrompt}
                              readOnly
                            />
                          </>
                        )}

                        {assignment.review && !assignment.review.approved && (
                          <div className="worker-review-box">
                            <div className="worker-review-title">Manager Revisions</div>
                            {assignment.review.requiredRevisions.length > 0 ? (
                              assignment.review.requiredRevisions.map((revision, index) => (
                                <div key={index} className="worker-review-item">{revision}</div>
                              ))
                            ) : (
                              <div className="worker-review-item">{assignment.review.managerGuidance}</div>
                            )}
                          </div>
                        )}

                        {assignment.status !== 'accepted' && (
                          <>
                            <textarea
                              className="input worker-output-input"
                              placeholder="Paste the worker agent output for manager review"
                              value={outputDrafts[assignment.podId] ?? assignment.submittedOutput ?? ''}
                              onChange={event => setOutputDrafts(prev => ({
                                ...prev,
                                [assignment.podId]: event.target.value,
                              }))}
                              disabled={assignment.status === 'reviewing'}
                            />
                            <button
                              className="btn btn-primary"
                              onClick={() => submitOutput(assignment.podId)}
                              disabled={assignment.status === 'reviewing' || isSubmitting}
                            >
                              {assignment.status === 'reviewing' || isSubmitting ? 'Reviewing' : 'Submit for Review'}
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
