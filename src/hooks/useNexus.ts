import { useReducer, useRef, useCallback } from 'react';
import type {
  NexusState, Pod, BusMessage, AppPhase, PodBlueprint,
  ProviderConfig, MissionSpec, VerificationResult, ActivityLogEntry, ActivityAction,
} from '../types';
import { parseBusMessages } from '../lib/bus';
import {
  specDraftingSystem, specDraftingUser,
  podSystem,
  verificationSystem, verificationUser,
  coordinationSystem, coordinationUser,
  synthesisSystem, synthesisUser,
  managerWaveCheckSystem, managerWaveCheckUser,
} from '../lib/prompts';
import type { DiscoveryResult, CoordinationResult, SynthesisResult } from '../types';
import { generateSessionId } from '../lib/security';
import { clearSession } from '../lib/storage';
import { resolveProviders, jsonWithFallback, streamWithFallback } from '../lib/providers';
import { runDemoReplay } from '../demo/useDemoRunner';

// ── Reducer ──────────────────────────────────────────────────────────────────

export type DemoAction = Action;

type Action =
  | { type: 'SET_PHASE'; phase: AppPhase }
  | { type: 'SET_MISSION'; mission: string }
  | { type: 'SET_SPEC'; spec: MissionSpec }
  | { type: 'SET_DISCOVERY'; discovery: DiscoveryResult }
  | { type: 'INIT_PODS'; pods: Pod[] }
  | { type: 'UPDATE_POD'; id: string; patch: Partial<Pod> }
  | { type: 'APPEND_POD_OUTPUT'; id: string; chunk: string }
  | { type: 'ADD_BUS_MESSAGES'; messages: BusMessage[] }
  | { type: 'SET_VERIFICATION'; verification: VerificationResult }
  | { type: 'SET_COORDINATION'; coordination: CoordinationResult }
  | { type: 'SET_SYNTHESIS'; synthesis: SynthesisResult }
  | { type: 'ADD_ACTIVITY_LOG'; entry: ActivityLogEntry }
  | { type: 'SET_ERROR'; error: string }
  | { type: 'RESET' };

function initialState(): NexusState {
  return {
    phase: 'idle',
    mission: '',
    sessionId: generateSessionId(),
    spec: null,
    discovery: null,
    pods: [],
    bus: [],
    verification: null,
    coordination: null,
    synthesis: null,
    activityLog: [],
    error: null,
    startTime: null,
  };
}

function reducer(state: NexusState, action: Action): NexusState {
  switch (action.type) {
    case 'SET_PHASE':      return { ...state, phase: action.phase };
    case 'SET_MISSION':    return { ...state, mission: action.mission, startTime: Date.now() };
    case 'SET_SPEC':       return { ...state, spec: action.spec };
    case 'SET_DISCOVERY':  return { ...state, discovery: action.discovery };
    case 'INIT_PODS':      return { ...state, pods: action.pods };
    case 'SET_VERIFICATION': return { ...state, verification: action.verification };
    case 'SET_COORDINATION': return { ...state, coordination: action.coordination };
    case 'SET_SYNTHESIS':  return { ...state, synthesis: action.synthesis };
    case 'ADD_ACTIVITY_LOG':
      return { ...state, activityLog: [...state.activityLog, action.entry] };
    case 'SET_ERROR':      return { ...state, phase: 'error', error: action.error };
    case 'RESET':          return { ...initialState(), sessionId: generateSessionId() };
    case 'UPDATE_POD':
      return {
        ...state,
        pods: state.pods.map(p => p.id === action.id ? { ...p, ...action.patch } : p),
      };
    case 'APPEND_POD_OUTPUT':
      return {
        ...state,
        pods: state.pods.map(p => p.id === action.id ? { ...p, output: p.output + action.chunk } : p),
      };
    case 'ADD_BUS_MESSAGES':
      return { ...state, bus: [...state.bus, ...action.messages] };
    default:
      return state;
  }
}

// ── Activity log helpers ──────────────────────────────────────────────────────

let _logCounter = 0;
function makeLogEntry(
  agentId: string,
  agentName: string,
  phase: AppPhase,
  action: ActivityAction,
  missionPortion: string,
  reasoning: string,
  details?: string,
): ActivityLogEntry {
  return {
    id: `log_${Date.now()}_${++_logCounter}`,
    timestamp: Date.now(),
    agentId,
    agentName,
    phase,
    action,
    missionPortion,
    reasoning,
    details,
  };
}

// ── Raw spec/discovery from LLM ───────────────────────────────────────────────

interface RawSpecResult {
  spec: {
    outcomes: string[];
    scope: { in: string[]; out: string[] };
    constraints: { always: string[]; askFirst: string[]; never: string[] };
    assumptions: string[];
    priorDecisions: string[];
    verificationCriteria: Array<{
      id: string; description: string; category: string; testable: boolean;
    }>;
  };
  analysis: string;
  resources: Array<{ name: string; status: string; notes: string }>;
  risks: string[];
  questions: string[];
  pods: Array<{
    id: string; name: string; role: string; priority: string;
    dependencies: string[]; deliverable: string; context: string;
    responsibility: string; vcIds: string[];
  }>;
  complexity: string;
  estimatedDuration: string;
}

// ── Manager wave check result ─────────────────────────────────────────────────

interface WaveCheckResult {
  waveSummary: string;
  directives: Array<{
    targetPodId: string;
    instruction: string;
    reasoning: string;
  }>;
  specAlerts: string[];
  logEntry: {
    missionPortion: string;
    reasoning: string;
  };
}

// ── DAG wave computation ──────────────────────────────────────────────────────

function computeWaves(pods: PodBlueprint[]): string[][] {
  const waves: string[][] = [];
  const scheduled = new Set<string>();

  while (scheduled.size < pods.length) {
    const wave = pods
      .filter(p => !scheduled.has(p.id) && p.dependencies.every(d => scheduled.has(d)))
      .map(p => p.id);

    if (wave.length === 0) break; // circular dep guard
    wave.forEach(id => scheduled.add(id));
    waves.push(wave);
  }

  return waves;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export interface NexusActions {
  runMission: (providerConfigs: ProviderConfig[], mission: string) => Promise<void>;
  runDemo: () => Promise<void>;
  abort: () => void;
  reset: () => void;
}

export function useNexus(): [NexusState, NexusActions] {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const abortRef = useRef<AbortController | null>(null);
  const podOutputsRef = useRef(new Map<string, string>());
  const busMessagesRef = useRef<BusMessage[]>([]);
  const busDedupeRef = useRef(new Set<string>());
  const managerDirectivesRef = useRef<Map<string, string[]>>(new Map()); // podId → directives

  const abort = useCallback(() => { abortRef.current?.abort(); }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    podOutputsRef.current.clear();
    busMessagesRef.current = [];
    busDedupeRef.current = new Set();
    managerDirectivesRef.current = new Map();
    clearSession();
    dispatch({ type: 'RESET' });
  }, []);

  const addLog = useCallback((entry: ActivityLogEntry) => {
    dispatch({ type: 'ADD_ACTIVITY_LOG', entry });
  }, []);

  const emitBusFromText = useCallback((text: string, podId: string) => {
    const msgs = parseBusMessages(text, podId, busDedupeRef.current);
    if (msgs.length > 0) {
      busMessagesRef.current = [...busMessagesRef.current, ...msgs];
      dispatch({ type: 'ADD_BUS_MESSAGES', messages: msgs });
    }
  }, []);

  const executePod = useCallback(
    (
      blueprint: PodBlueprint,
      mission: string,
      spec: MissionSpec,
      podProviders: ReturnType<typeof resolveProviders>,
      signal: AbortSignal,
    ): Promise<void> => {
      return new Promise<void>((resolve, reject) => {
        const depOutputs: Record<string, string> = {};
        for (const depId of blueprint.dependencies) {
          depOutputs[depId] = podOutputsRef.current.get(depId) ?? '';
        }

        // Build manager directives string for this pod
        const myDirectives = managerDirectivesRef.current.get(blueprint.id) ?? [];
        const allDirectives = managerDirectivesRef.current.get('ALL') ?? [];
        const directiveText = [...allDirectives, ...myDirectives].length > 0
          ? [...allDirectives, ...myDirectives].map(d => `- ${d}`).join('\n')
          : undefined;

        const podForPrompt: Pod = {
          ...blueprint,
          status: 'running',
          output: '',
          logs: [],
          retries: 0,
        };

        addLog(makeLogEntry(
          `pod:${blueprint.id}`,
          blueprint.name,
          'executing',
          'pod_started',
          blueprint.responsibility,
          `Starting pod execution. Assigned VCs: ${blueprint.vcIds.join(', ') || 'none'}.${directiveText ? ' Has manager directives.' : ''}`,
          blueprint.deliverable,
        ));

        streamWithFallback(
          podProviders,
          'pod',
          podSystem(podForPrompt, mission, spec, depOutputs, busMessagesRef.current, directiveText),
          [{ role: 'user', content: `Execute your deliverable: ${blueprint.deliverable}. Address all assigned VCs explicitly.` }],
          {
            onChunk: chunk => {
              podOutputsRef.current.set(
                blueprint.id,
                (podOutputsRef.current.get(blueprint.id) ?? '') + chunk,
              );
              dispatch({ type: 'APPEND_POD_OUTPUT', id: blueprint.id, chunk });
              emitBusFromText(chunk, blueprint.id);
            },
            onComplete: () => {
              dispatch({
                type: 'UPDATE_POD',
                id: blueprint.id,
                patch: { status: 'completed', endTime: Date.now() },
              });
              addLog(makeLogEntry(
                `pod:${blueprint.id}`,
                blueprint.name,
                'executing',
                'pod_completed',
                blueprint.responsibility,
                `Pod completed deliverable. VCs addressed: ${blueprint.vcIds.join(', ') || 'none'}.`,
                `Deliverable: ${blueprint.deliverable}`,
              ));
              resolve();
            },
            onError: err => {
              dispatch({
                type: 'UPDATE_POD',
                id: blueprint.id,
                patch: { status: 'failed', endTime: Date.now() },
              });
              addLog(makeLogEntry(
                `pod:${blueprint.id}`,
                blueprint.name,
                'executing',
                'pod_failed',
                blueprint.responsibility,
                `Pod failed: ${err.message}`,
              ));
              reject(err);
            },
            onProviderSelect: providerId => {
              dispatch({
                type: 'UPDATE_POD',
                id: blueprint.id,
                patch: { usedProvider: providerId },
              });
            },
          },
          signal,
        );
      });
    },
    [emitBusFromText, addLog],
  );

  const runMission = useCallback(async (providerConfigs: ProviderConfig[], mission: string) => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    podOutputsRef.current.clear();
    busMessagesRef.current = [];
    busDedupeRef.current = new Set();
    managerDirectivesRef.current = new Map();

    dispatch({ type: 'SET_MISSION', mission });
    dispatch({ type: 'SET_PHASE', phase: 'spec_drafting' });

    const managerProviders = resolveProviders(providerConfigs, 'manager');
    const podProviders = resolveProviders(providerConfigs, 'pod');
    const verifierProviders = resolveProviders(providerConfigs, 'verifier');

    if (managerProviders.length === 0) {
      dispatch({ type: 'SET_ERROR', error: 'No manager-capable provider configured. Enable at least one provider with a manager model.' });
      return;
    }
    if (podProviders.length === 0) {
      dispatch({ type: 'SET_ERROR', error: 'No pod-capable provider configured. Enable at least one provider with a pod model.' });
      return;
    }
    // Verifier falls back to manager if none configured
    const effectiveVerifierProviders = verifierProviders.length > 0 ? verifierProviders : managerProviders;

    try {
      // ── Phase 1: Spec Drafting ────────────────────────────────────────────
      const { result: rawResult } = await jsonWithFallback<RawSpecResult>(
        managerProviders,
        'manager',
        specDraftingSystem(),
        specDraftingUser(mission),
        ac.signal,
      );
      if (ac.signal.aborted) return;

      // Construct typed MissionSpec
      const spec: MissionSpec = {
        id: `spec_${Date.now()}`,
        version: '1.0.0',
        createdAt: Date.now(),
        mission,
        outcomes: rawResult.spec.outcomes ?? [],
        scope: {
          in: rawResult.spec.scope?.in ?? [],
          out: rawResult.spec.scope?.out ?? [],
        },
        constraints: {
          always: rawResult.spec.constraints?.always ?? [],
          askFirst: rawResult.spec.constraints?.askFirst ?? [],
          never: rawResult.spec.constraints?.never ?? [],
        },
        assumptions: rawResult.spec.assumptions ?? [],
        priorDecisions: rawResult.spec.priorDecisions ?? [],
        verificationCriteria: (rawResult.spec.verificationCriteria ?? []).map(v => ({
          id: v.id,
          description: v.description,
          category: (v.category as 'functional' | 'quality' | 'constraint' | 'integration') ?? 'functional',
          testable: v.testable ?? true,
        })),
        podSections: (rawResult.pods ?? []).map(p => ({
          podId: p.id,
          responsibility: p.responsibility ?? '',
          vcIds: p.vcIds ?? [],
        })),
        status: 'active',
      };

      const discovery: DiscoveryResult = {
        analysis: rawResult.analysis ?? '',
        resources: (rawResult.resources ?? []).map(r => ({
          name: r.name,
          status: (r.status as 'available' | 'unknown' | 'required' | 'missing') ?? 'unknown',
          notes: r.notes ?? '',
        })),
        risks: rawResult.risks ?? [],
        questions: rawResult.questions ?? [],
        pods: (rawResult.pods ?? []).map(p => ({
          id: p.id,
          name: p.name,
          role: p.role,
          priority: (p.priority as 'critical' | 'high' | 'medium' | 'low') ?? 'medium',
          dependencies: p.dependencies ?? [],
          deliverable: p.deliverable,
          context: p.context,
          responsibility: p.responsibility ?? '',
          vcIds: p.vcIds ?? [],
        })),
        complexity: (rawResult.complexity as 'low' | 'medium' | 'high' | 'critical') ?? 'medium',
        estimatedDuration: rawResult.estimatedDuration ?? '',
      };

      dispatch({ type: 'SET_SPEC', spec });
      dispatch({ type: 'SET_DISCOVERY', discovery });

      const vcCount = spec.verificationCriteria.length;
      const podCount = discovery.pods.length;
      addLog(makeLogEntry(
        'nexus-manager',
        'NEXUS Manager',
        'spec_drafting',
        'spec_drafted',
        `Full mission: ${mission}`,
        `Analyzed mission and drafted spec with ${vcCount} verification criteria across ${podCount} pods. Complexity: ${discovery.complexity}. Estimated duration: ${discovery.estimatedDuration}.`,
        `Outcomes: ${spec.outcomes.join('; ')}`,
      ));

      const pods: Pod[] = discovery.pods.map(bp => ({
        ...bp, status: 'queued', output: '', logs: [], retries: 0,
      }));
      dispatch({ type: 'INIT_PODS', pods });
      dispatch({ type: 'SET_PHASE', phase: 'deploying' });

      await new Promise(r => setTimeout(r, 300));
      if (ac.signal.aborted) return;

      // ── Phase 2: Execute pods in DAG waves with manager checks ────────────
      dispatch({ type: 'SET_PHASE', phase: 'executing' });

      const waves = computeWaves(discovery.pods);
      const completedPromises = new Map<string, Promise<void>>();

      for (let waveIdx = 0; waveIdx < waves.length; waveIdx++) {
        const wave = waves[waveIdx];
        if (ac.signal.aborted) return;

        // Run all pods in this wave in parallel (each waits for its own deps)
        const wavePromises = wave.map(podId => {
          const bp = discovery.pods.find(p => p.id === podId)!;
          const depPromises = bp.dependencies
            .map(id => completedPromises.get(id))
            .filter((p): p is Promise<void> => p !== undefined);

          const podExecution = Promise.all(depPromises).then(async () => {
            if (ac.signal.aborted) return;
            dispatch({ type: 'UPDATE_POD', id: bp.id, patch: { status: 'waiting', startTime: Date.now() } });
            await executePod(bp, mission, spec, podProviders, ac.signal);
          });

          completedPromises.set(bp.id, podExecution);
          return podExecution;
        });

        await Promise.all(wavePromises);
        if (ac.signal.aborted) return;

        // After each wave (except the last), run a manager check
        const isLastWave = waveIdx === waves.length - 1;
        if (!isLastWave) {
          const nextWave = waves[waveIdx + 1];
          const completedPods = wave.map(id => ({
            ...discovery.pods.find(p => p.id === id)!,
            status: 'completed' as const,
            output: podOutputsRef.current.get(id) ?? '',
            logs: [],
            retries: 0,
          }));

          try {
            const { result: waveCheck } = await jsonWithFallback<WaveCheckResult>(
              managerProviders,
              'manager',
              managerWaveCheckSystem(),
              managerWaveCheckUser(waveIdx + 1, completedPods, nextWave, spec, busMessagesRef.current),
              ac.signal,
            );
            if (ac.signal.aborted) return;

            // Store directives for next-wave pods
            for (const directive of (waveCheck.directives ?? [])) {
              const target = directive.targetPodId;
              const existing = managerDirectivesRef.current.get(target) ?? [];
              managerDirectivesRef.current.set(target, [...existing, directive.instruction]);
            }

            // Emit directives onto the bus
            const directiveCount = waveCheck.directives?.length ?? 0;
            if (directiveCount > 0) {
              const directiveMsgs = (waveCheck.directives ?? []).map(d => ({
                id: `msg_${Date.now()}_wave${waveIdx}`,
                timestamp: Date.now(),
                from: 'nexus-manager',
                to: d.targetPodId,
                type: 'directive' as const,
                content: `${d.instruction} (Reason: ${d.reasoning})`,
              }));
              busMessagesRef.current = [...busMessagesRef.current, ...directiveMsgs];
              dispatch({ type: 'ADD_BUS_MESSAGES', messages: directiveMsgs });
            }

            // Emit spec alerts as risk messages
            for (const alert of (waveCheck.specAlerts ?? [])) {
              const alertMsg = {
                id: `msg_${Date.now()}_alert`,
                timestamp: Date.now(),
                from: 'nexus-manager',
                to: 'ALL',
                type: 'risk' as const,
                content: alert,
              };
              busMessagesRef.current = [...busMessagesRef.current, alertMsg];
              dispatch({ type: 'ADD_BUS_MESSAGES', messages: [alertMsg] });
            }

            addLog(makeLogEntry(
              'nexus-manager',
              'NEXUS Manager',
              'executing',
              'manager_directive',
              waveCheck.logEntry?.missionPortion ?? `Wave ${waveIdx + 1} review`,
              waveCheck.logEntry?.reasoning ?? waveCheck.waveSummary,
              `Issued ${directiveCount} directive(s) for wave ${waveIdx + 2}: ${nextWave.join(', ')}`,
            ));
          } catch {
            // Non-fatal: wave check failure doesn't stop execution
          }
        }
      }

      if (ac.signal.aborted) return;

      // ── Phase 3: Adversarial Spec Verification (using verifier model) ─────
      dispatch({ type: 'SET_PHASE', phase: 'verifying' });

      const podSnapshots: Pod[] = discovery.pods.map(bp => ({
        ...bp,
        status: 'completed',
        output: podOutputsRef.current.get(bp.id) ?? '',
        logs: [],
        retries: 0,
      }));

      const { result: verification } = await jsonWithFallback<VerificationResult>(
        effectiveVerifierProviders,
        'verifier',
        verificationSystem(),
        verificationUser(spec, podSnapshots, busMessagesRef.current),
        ac.signal,
      );
      if (ac.signal.aborted) return;

      const normalizedVerification: VerificationResult = {
        overallCompliance: verification.overallCompliance ?? 0,
        vcResults: verification.vcResults ?? [],
        violations: verification.violations ?? [],
        specUpdates: verification.specUpdates ?? [],
        verifiedAt: Date.now(),
      };

      dispatch({ type: 'SET_VERIFICATION', verification: normalizedVerification });

      const passedVCs = normalizedVerification.vcResults.filter(r => r.status === 'passed').length;
      const totalVCs = normalizedVerification.vcResults.length;
      const compliancePct = Math.round(normalizedVerification.overallCompliance * 100);
      addLog(makeLogEntry(
        'nexus-verifier',
        'NEXUS Verifier',
        'verifying',
        'verification_result',
        'Full spec — all verification criteria',
        `Adversarial audit complete. ${compliancePct}% compliance: ${passedVCs}/${totalVCs} VCs passed. ${normalizedVerification.violations.length} violation(s) found.`,
        normalizedVerification.violations.length > 0
          ? `Violations: ${normalizedVerification.violations.map(v => v.description).join('; ')}`
          : 'No violations.',
      ));

      // ── Phase 4: Coordination ─────────────────────────────────────────────
      const { result: coordination } = await jsonWithFallback<CoordinationResult>(
        managerProviders,
        'manager',
        coordinationSystem(),
        coordinationUser(mission, spec, podSnapshots, busMessagesRef.current),
        ac.signal,
      );
      if (ac.signal.aborted) return;

      dispatch({ type: 'SET_COORDINATION', coordination });

      if ((coordination.corrections ?? []).length > 0) {
        addLog(makeLogEntry(
          'nexus-manager',
          'NEXUS Manager',
          'verifying',
          'coordination_correction',
          'Cross-pod alignment review',
          `Found ${coordination.misalignments?.length ?? 0} misalignment(s). Issued ${coordination.corrections.length} correction(s) to reconcile pod outputs.`,
          `Corrections: ${coordination.corrections.map(c => `${c.podId}: ${c.task}`).join('; ')}`,
        ));
      }

      // ── Phase 5: Synthesis ─────────────────────────────────────────────────
      dispatch({ type: 'SET_PHASE', phase: 'synthesis' });

      const { result: synthesis } = await jsonWithFallback<SynthesisResult>(
        managerProviders,
        'manager',
        synthesisSystem(),
        synthesisUser(mission, spec, podSnapshots, normalizedVerification, coordination.corrections),
        ac.signal,
      );
      if (ac.signal.aborted) return;

      dispatch({ type: 'SET_SYNTHESIS', synthesis });

      addLog(makeLogEntry(
        'nexus-manager',
        'NEXUS Manager',
        'synthesis',
        'synthesis_complete',
        `Full mission: ${mission}`,
        `Synthesized final report. ${synthesis.deliverables?.length ?? 0} deliverable(s), ${synthesis.roadmap?.length ?? 0} roadmap step(s). ${synthesis.specComplianceSummary?.slice(0, 120) ?? ''}`,
        `Risks: ${synthesis.risks?.join('; ') ?? 'none'}`,
      ));

      dispatch({ type: 'SET_PHASE', phase: 'complete' });

    } catch (err) {
      if (ac.signal.aborted) return;
      dispatch({ type: 'SET_ERROR', error: (err as Error).message ?? 'Unknown error' });
    }
  }, [executePod, addLog]);

  const runDemo = useCallback(async () => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    podOutputsRef.current.clear();
    busMessagesRef.current = [];
    busDedupeRef.current = new Set();
    managerDirectivesRef.current = new Map();
    dispatch({ type: 'RESET' });
    // Small delay to let RESET settle before re-starting
    await new Promise(r => setTimeout(r, 50));
    await runDemoReplay(dispatch, ac.signal);
  }, []);

  return [state, { runMission, runDemo, abort, reset }];
}
