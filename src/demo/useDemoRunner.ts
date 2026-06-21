import type { Dispatch } from 'react';
import type { BusMessage } from '../types';
import {
  DEMO_MISSION,
  DEMO_SPEC,
  DEMO_DISCOVERY,
  DEMO_POD_OUTPUTS,
  DEMO_WAVE_CHECK_DIRECTIVES,
  DEMO_VERIFICATION,
  DEMO_COORDINATION,
  DEMO_SYNTHESIS,
} from './demoData';
import { parseBusMessages } from '../lib/bus';
import { makeActivityEntry } from './demoActivity';

// Re-exported for useNexus to call
export type DemoDispatch = Dispatch<import('../hooks/useNexus').DemoAction>;

// Realistic streaming: emit chunks of varying sizes with natural pauses
async function streamText(
  text: string,
  onChunk: (chunk: string) => void,
  signal: AbortSignal,
  speed: 'fast' | 'normal' = 'normal',
): Promise<void> {
  const chunkSize = speed === 'fast' ? 40 : 18;
  const delayMs = speed === 'fast' ? 12 : 22;

  for (let i = 0; i < text.length; i += chunkSize) {
    if (signal.aborted) return;
    const chunk = text.slice(i, i + chunkSize);
    onChunk(chunk);
    await sleep(delayMs + Math.random() * 10);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

let _busCounter = 0;
function nextBusId(): string {
  return `demo_msg_${Date.now()}_${++_busCounter}`;
}

export async function runDemoReplay(dispatch: DemoDispatch, signal: AbortSignal): Promise<void> {
  const busDedupeRef = new Set<string>();
  const busMessages: BusMessage[] = [];
  const streamedOutputs = new Map<string, string>();

  function addBus(msgs: BusMessage[]) {
    msgs.forEach((m) => busMessages.push(m));
    dispatch({ type: 'ADD_BUS_MESSAGES', messages: msgs });
  }

  function emitBusFromText(text: string, fromId: string) {
    const msgs = parseBusMessages(text, fromId, busDedupeRef);
    if (msgs.length > 0) addBus(msgs);
  }

  function appendDemoOutput(podId: string, chunk: string) {
    const accumulated = (streamedOutputs.get(podId) ?? '') + chunk;
    streamedOutputs.set(podId, accumulated);
    dispatch({ type: 'APPEND_POD_OUTPUT', id: podId, chunk });
    emitBusFromText(accumulated, podId);
  }

  // ── Phase 1: Spec drafting ─────────────────────────────────────────────────
  dispatch({ type: 'SET_MISSION', mission: DEMO_MISSION });
  dispatch({ type: 'SET_PHASE', phase: 'spec_drafting' });

  await sleep(2400);
  if (signal.aborted) return;

  dispatch({ type: 'SET_SPEC', spec: DEMO_SPEC });
  dispatch({ type: 'SET_DISCOVERY', discovery: DEMO_DISCOVERY });

  dispatch({
    type: 'ADD_ACTIVITY_LOG',
    entry: makeActivityEntry(
      'nexus-manager',
      'NEXUS Manager',
      'spec_drafting',
      'spec_drafted',
      `Full mission: ${DEMO_MISSION}`,
      `Analyzed mission and drafted spec with ${DEMO_SPEC.verificationCriteria.length} verification criteria across ${DEMO_DISCOVERY.pods.length} pods. Complexity: ${DEMO_DISCOVERY.complexity}. Estimated duration: ${DEMO_DISCOVERY.estimatedDuration}.`,
      `Outcomes: ${DEMO_SPEC.outcomes.slice(0, 3).join('; ')}…`,
    ),
  });

  // Init pods
  const pods = DEMO_DISCOVERY.pods.map((bp) => ({
    ...bp,
    status: 'queued' as const,
    output: '',
    logs: [],
    retries: 0,
  }));
  dispatch({ type: 'INIT_PODS', pods });
  dispatch({ type: 'SET_PHASE', phase: 'deploying' });

  await sleep(500);
  if (signal.aborted) return;

  dispatch({ type: 'SET_PHASE', phase: 'executing' });

  // ── Wave 1: backend_api + realtime_engine (parallel) ─────────────────────
  const wave1 = ['backend_api', 'realtime_engine'];

  for (const podId of wave1) {
    dispatch({
      type: 'UPDATE_POD',
      id: podId,
      patch: { status: 'waiting', startTime: Date.now() },
    });
  }
  await sleep(200);

  for (const podId of wave1) {
    dispatch({ type: 'UPDATE_POD', id: podId, patch: { status: 'running' } });
    dispatch({
      type: 'ADD_ACTIVITY_LOG',
      entry: makeActivityEntry(
        `pod:${podId}`,
        DEMO_DISCOVERY.pods.find((p) => p.id === podId)!.name,
        'executing',
        'pod_started',
        DEMO_DISCOVERY.pods.find((p) => p.id === podId)!.responsibility,
        `Starting wave 1 execution. Assigned VCs: ${DEMO_DISCOVERY.pods.find((p) => p.id === podId)!.vcIds.join(', ')}.`,
        DEMO_DISCOVERY.pods.find((p) => p.id === podId)!.deliverable,
      ),
    });
  }

  // Stream both pods concurrently
  await Promise.all(
    wave1.map(async (podId) => {
      await streamText(
        DEMO_POD_OUTPUTS[podId],
        (chunk) => {
          appendDemoOutput(podId, chunk);
        },
        signal,
        'normal',
      );
      if (signal.aborted) return;
      dispatch({
        type: 'UPDATE_POD',
        id: podId,
        patch: { status: 'completed', endTime: Date.now(), usedProvider: 'anthropic' },
      });
      dispatch({
        type: 'ADD_ACTIVITY_LOG',
        entry: makeActivityEntry(
          `pod:${podId}`,
          DEMO_DISCOVERY.pods.find((p) => p.id === podId)!.name,
          'executing',
          'pod_completed',
          DEMO_DISCOVERY.pods.find((p) => p.id === podId)!.responsibility,
          `Pod completed. Addressed VCs: ${DEMO_DISCOVERY.pods.find((p) => p.id === podId)!.vcIds.join(', ')}.`,
          `Deliverable: ${DEMO_DISCOVERY.pods.find((p) => p.id === podId)!.deliverable}`,
        ),
      });
    }),
  );
  if (signal.aborted) return;

  // ── Manager wave check ─────────────────────────────────────────────────────
  await sleep(800);
  if (signal.aborted) return;

  // Emit manager directives as bus messages
  const directives = DEMO_WAVE_CHECK_DIRECTIVES.map((d) => ({
    ...d,
    id: nextBusId(),
    timestamp: Date.now(),
  }));
  addBus(directives);

  dispatch({
    type: 'ADD_ACTIVITY_LOG',
    entry: makeActivityEntry(
      'nexus-manager',
      'NEXUS Manager',
      'executing',
      'manager_directive',
      'Wave 1 → Wave 2 transition: API contract and WebSocket schema review',
      'Wave 1 complete. backend_api and realtime_engine outputs reviewed. Issuing 2 directives to frontend_ui to ensure type-safe consumption of the published contracts.',
      'Directives: use published WebSocket hook, use TaskStatusEnum from backend schema',
    ),
  });

  // ── Wave 2: frontend_ui ───────────────────────────────────────────────────
  await sleep(400);
  if (signal.aborted) return;

  dispatch({
    type: 'UPDATE_POD',
    id: 'frontend_ui',
    patch: { status: 'waiting', startTime: Date.now() },
  });
  await sleep(200);
  dispatch({ type: 'UPDATE_POD', id: 'frontend_ui', patch: { status: 'running' } });
  dispatch({
    type: 'ADD_ACTIVITY_LOG',
    entry: makeActivityEntry(
      'pod:frontend_ui',
      'Frontend UI Pod',
      'executing',
      'pod_started',
      'Dashboard UI, task views, onboarding flow',
      'Starting wave 2. Has manager directives: use realtime_engine hook, use TaskStatusEnum from backend_api. Assigned VCs: VC-004.',
      'React dashboard with live task board and 3-step onboarding wizard',
    ),
  });

  await streamText(
    DEMO_POD_OUTPUTS.frontend_ui,
    (chunk) => {
      appendDemoOutput('frontend_ui', chunk);
    },
    signal,
    'normal',
  );
  if (signal.aborted) return;

  dispatch({
    type: 'UPDATE_POD',
    id: 'frontend_ui',
    patch: { status: 'completed', endTime: Date.now(), usedProvider: 'anthropic' },
  });
  dispatch({
    type: 'ADD_ACTIVITY_LOG',
    entry: makeActivityEntry(
      'pod:frontend_ui',
      'Frontend UI Pod',
      'executing',
      'pod_completed',
      'Dashboard UI, task views, onboarding flow',
      'Completed. Live task board with WebSocket integration and 3-step onboarding wizard targeting <90s completion. VC-004 addressed.',
      'Deliverable: React dashboard with RBAC navigation, live task board, onboarding wizard',
    ),
  });

  // ── Wave 3: integration_qa ────────────────────────────────────────────────
  await sleep(400);
  if (signal.aborted) return;

  dispatch({
    type: 'UPDATE_POD',
    id: 'integration_qa',
    patch: { status: 'waiting', startTime: Date.now() },
  });
  await sleep(200);
  dispatch({ type: 'UPDATE_POD', id: 'integration_qa', patch: { status: 'running' } });
  dispatch({
    type: 'ADD_ACTIVITY_LOG',
    entry: makeActivityEntry(
      'pod:integration_qa',
      'Integration QA Pod',
      'executing',
      'pod_started',
      'Cross-system integration verification, E2E contract validation',
      'Starting wave 3. All prior pods complete. Reviewing cross-system contracts for VC-001, VC-002, VC-003, VC-005.',
      'Integration test plan validating WebSocket latency, RBAC, API completeness, reconnection',
    ),
  });

  await streamText(
    DEMO_POD_OUTPUTS.integration_qa,
    (chunk) => {
      appendDemoOutput('integration_qa', chunk);
    },
    signal,
    'normal',
  );
  if (signal.aborted) return;

  dispatch({
    type: 'UPDATE_POD',
    id: 'integration_qa',
    patch: { status: 'completed', endTime: Date.now(), usedProvider: 'anthropic' },
  });
  dispatch({
    type: 'ADD_ACTIVITY_LOG',
    entry: makeActivityEntry(
      'pod:integration_qa',
      'Integration QA Pod',
      'executing',
      'pod_completed',
      'Cross-system integration verification, E2E contract validation',
      'Completed. All cross-system contracts validated. E2E latency budget confirmed at 156–236ms (VC-001). RBAC test written (VC-002). Reconnection test written (VC-005). One risk flagged: cross-region deployment.',
      'Deliverable: Integration test plan covering VC-001, VC-002, VC-003, VC-005',
    ),
  });

  // ── Phase 3: Verification ─────────────────────────────────────────────────
  await sleep(600);
  if (signal.aborted) return;

  dispatch({ type: 'SET_PHASE', phase: 'verifying' });

  await sleep(2800);
  if (signal.aborted) return;

  dispatch({
    type: 'SET_VERIFICATION',
    verification: { ...DEMO_VERIFICATION, verifiedAt: Date.now() },
  });
  dispatch({
    type: 'ADD_ACTIVITY_LOG',
    entry: makeActivityEntry(
      'nexus-verifier',
      'NEXUS Verifier',
      'verifying',
      'verification_result',
      'Full spec — all 6 verification criteria',
      `Adversarial audit complete. 87.5% compliance: 5/6 VCs passed. 1 violation (minor): VC-006 Zod coverage not demonstrated on auth/project routes.`,
      'VC-006 is partial — auth and project route validation not evidenced. Spec update suggested re: cross-region latency.',
    ),
  });

  // ── Phase 4: Coordination ─────────────────────────────────────────────────
  await sleep(2000);
  if (signal.aborted) return;

  dispatch({ type: 'SET_COORDINATION', coordination: DEMO_COORDINATION });
  dispatch({
    type: 'ADD_ACTIVITY_LOG',
    entry: makeActivityEntry(
      'nexus-manager',
      'NEXUS Manager',
      'verifying',
      'coordination_correction',
      'Cross-pod alignment: backend_api ↔ realtime_engine event emission',
      'Found 1 misalignment: broadcastToOrg() needs to be called in route handler body, not lifecycle hook, to guarantee ordering with DB commit.',
      'Correction: backend_api — add explicit broadcastToOrg() after db.update() in PATCH /tasks handler [VC-001]',
    ),
  });

  // ── Phase 5: Synthesis ────────────────────────────────────────────────────
  await sleep(400);
  if (signal.aborted) return;

  dispatch({ type: 'SET_PHASE', phase: 'synthesis' });

  await sleep(2600);
  if (signal.aborted) return;

  dispatch({ type: 'SET_SYNTHESIS', synthesis: DEMO_SYNTHESIS });
  dispatch({
    type: 'ADD_ACTIVITY_LOG',
    entry: makeActivityEntry(
      'nexus-manager',
      'NEXUS Manager',
      'synthesis',
      'synthesis_complete',
      `Full mission: ${DEMO_MISSION}`,
      `Synthesized final report. 9 deliverables, 8 roadmap steps, 87.5% spec compliance. One coordination correction issued. One VC gap (VC-006) with clear remediation path.`,
      'Next: apply broadcastToOrg correction, extend Zod to auth/project routes, run integration test suite',
    ),
  });

  dispatch({ type: 'SET_PHASE', phase: 'complete' });
}
