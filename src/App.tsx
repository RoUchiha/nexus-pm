import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { Header } from './components/Header';
import { ProvidersPanel } from './components/ProvidersPanel';
import { WorkerAgentsPanel } from './components/WorkerAgentsPanel';
import { ConnectionsPanel } from './components/ConnectionsPanel';
import { MissionInput } from './components/MissionInput';
import { PhaseIndicator } from './components/PhaseIndicator';
import { SpecPanel } from './components/SpecPanel';
import { DiscoveryPanel } from './components/DiscoveryPanel';
import { PodCard } from './components/PodCard';
import { MessageBusPanel } from './components/MessageBusPanel';
import { VerificationPanel } from './components/VerificationPanel';
import { SynthesisPanel } from './components/SynthesisPanel';
import { ActivityFeedPanel } from './components/ActivityFeedPanel';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useNexus } from './hooks/useNexus';
import { useConnectors } from './hooks/useConnectors';
import {
  loadProviderConfigs,
  loadWorkerAgents,
  loadWorkerMode,
  saveWorkerAgents,
  saveWorkerMode,
} from './lib/storage';
import { resolveProviders } from './lib/providers';
import type { ProviderConfig, WorkerAgentConnection, WorkerMode } from './types';

interface Props {
  sessionControl?: ReactNode;
}

export function App({ sessionControl }: Props = {}) {
  const [providerConfigs, setProviderConfigs] = useState<ProviderConfig[]>(() =>
    loadProviderConfigs(),
  );
  const [workerAgents, setWorkerAgents] = useState<WorkerAgentConnection[]>(() =>
    loadWorkerAgents(),
  );
  const [workerMode, setWorkerMode] = useState<WorkerMode>(() => loadWorkerMode());
  const [elapsed, setElapsed] = useState<number | null>(null);
  const [state, actions] = useNexus();
  const [connectors, connectorActions] = useConnectors();

  const {
    phase,
    mission,
    spec,
    discovery,
    pods,
    bus,
    verification,
    coordination,
    synthesis,
    workerAssignments,
    activityLog,
    error,
  } = state;

  const isRunning = ['spec_drafting', 'deploying', 'executing', 'verifying', 'synthesis'].includes(
    phase,
  );

  // Elapsed timer
  useEffect(() => {
    if (!state.startTime) {
      setElapsed(null);
      return;
    }
    if (phase === 'complete' || phase === 'aborted' || phase === 'error') {
      setElapsed(Date.now() - state.startTime);
      return;
    }
    const id = setInterval(() => {
      setElapsed(Date.now() - (state.startTime ?? Date.now()));
    }, 500);
    return () => clearInterval(id);
  }, [state.startTime, phase]);

  const handleMission = useCallback(
    (m: string) => {
      actions.runMission(providerConfigs, m, {
        mode: workerMode,
        agents: workerAgents,
        connectors,
      });
    },
    [providerConfigs, workerMode, workerAgents, connectors, actions],
  );

  const handleWorkerAgentsChange = useCallback((next: WorkerAgentConnection[]) => {
    setWorkerAgents(next);
    saveWorkerAgents(next);
  }, []);

  const handleWorkerModeChange = useCallback((next: WorkerMode) => {
    setWorkerMode(next);
    saveWorkerMode(next);
  }, []);

  // Build VC status map from verification results
  const vcStatuses = verification
    ? Object.fromEntries(verification.vcResults.map((r) => [r.id, r.status]))
    : undefined;

  const running = pods.filter((p) => p.status === 'running').length;
  const done = pods.filter((p) => p.status === 'completed').length;
  const hasRunnableConfig =
    resolveProviders(providerConfigs, 'manager').length > 0 &&
    (workerMode === 'company_workers'
      ? workerAgents.some((agent) => agent.enabled)
      : resolveProviders(providerConfigs, 'pod').length > 0);

  return (
    <div className="app">
      <Header
        phase={phase}
        elapsed={elapsed}
        onAbort={actions.abort}
        onReset={actions.reset}
        sessionControl={sessionControl}
      />

      <ProvidersPanel configs={providerConfigs} onChange={setProviderConfigs} />
      <ConnectionsPanel
        connectors={connectors}
        actions={connectorActions}
        locked={phase !== 'idle'}
      />
      <WorkerAgentsPanel
        agents={
          phase === 'idle' || state.workerAgents.length === 0 ? workerAgents : state.workerAgents
        }
        mode={phase === 'idle' ? workerMode : state.workerMode}
        phase={phase}
        pods={pods}
        assignments={workerAssignments}
        onAgentsChange={handleWorkerAgentsChange}
        onModeChange={handleWorkerModeChange}
        onClaim={actions.claimWorkerPod}
        onSubmit={actions.submitWorkerPodOutput}
      />

      <main className="main">
        {/* ── Idle: mission input ── */}
        {phase === 'idle' && (
          <MissionInput
            onSubmit={handleMission}
            onDemo={actions.runDemo}
            disabled={isRunning}
            hasApiKey={hasRunnableConfig}
          />
        )}

        {/* ── Active: phase indicator + mission label ── */}
        {phase !== 'idle' && (
          <>
            <PhaseIndicator phase={phase} />
            <div
              style={{
                fontSize: 13,
                color: 'var(--muted)',
                marginBottom: 16,
                padding: '10px 14px',
                background: 'var(--surface)',
                borderRadius: 6,
                border: '1px solid var(--border)',
                lineHeight: 1.5,
              }}
            >
              <span style={{ color: 'var(--dim)', fontSize: 11, marginRight: 8 }}>MISSION</span>
              {mission}
            </div>
          </>
        )}

        {/* ── Spec drafting spinner ── */}
        {phase === 'spec_drafting' && (
          <div className="spec-drafting-indicator">
            <span className="spinner" style={{ width: 20, height: 20, borderWidth: 3 }} />
            <div>
              <div className="spec-drafting-text">Drafting Mission Spec</div>
              <div className="spec-drafting-sub">
                Writing verification criteria, scope boundaries, and pod assignments…
              </div>
            </div>
          </div>
        )}

        {/* ── Error ── */}
        {error && (
          <div className="error-banner">
            <span className="error-icon">⚠</span>
            <div>
              <div className="error-title">Mission Failed</div>
              <div className="error-msg">{error}</div>
              <button
                className="btn btn-ghost"
                style={{ marginTop: 10, fontSize: 12 }}
                onClick={actions.reset}
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* ── Spec panel (shown as soon as spec is ready) ── */}
        {spec && <SpecPanel spec={spec} vcStatuses={vcStatuses} />}

        {/* ── Execution plan ── */}
        {discovery && <DiscoveryPanel discovery={discovery} />}

        {/* ── Agent pods ── */}
        {pods.length > 0 && (
          <div className="pods-section">
            <div className="pods-header">
              <span className="section-title">Agent Pods</span>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                {running > 0 && <span style={{ color: 'var(--blue)' }}>{running} running · </span>}
                {done}/{pods.length} complete
              </span>
            </div>
            <div className="pods-grid">
              {pods.map((pod) => (
                <ErrorBoundary key={pod.id}>
                  <PodCard pod={pod} spec={spec} vcStatuses={vcStatuses} />
                </ErrorBoundary>
              ))}
            </div>
          </div>
        )}

        {/* ── Inter-agent message bus ── */}
        {bus.length > 0 && <MessageBusPanel messages={bus} />}

        {/* ── Agent activity feed ── */}
        {activityLog.length > 0 && <ActivityFeedPanel entries={activityLog} />}

        {/* ── Verifying spinner ── */}
        {phase === 'verifying' && !verification && (
          <div className="verifying-indicator">
            <span
              className="spinner"
              style={{ width: 18, height: 18, borderWidth: 2, borderTopColor: 'var(--purple)' }}
            />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--purple)' }}>
                Adversarial Spec Verification
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                Independent verifier auditing each criterion — separate from implementing pods
              </div>
            </div>
          </div>
        )}

        {/* ── Verification results ── */}
        {verification && spec && <VerificationPanel verification={verification} spec={spec} />}

        {/* ── Final synthesis ── */}
        {synthesis && (
          <SynthesisPanel
            synthesis={synthesis}
            coordination={coordination}
            verification={verification}
            elapsed={elapsed}
          />
        )}

        {phase === 'complete' && (
          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <button className="btn btn-ghost" onClick={actions.reset}>
              ⬡ Launch New Mission
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
