import { useReducer, useRef, useCallback } from 'react';
import type {
  NexusState, Pod, BusMessage, AppPhase, PodBlueprint,
  ProviderConfig, MissionSpec, VerificationResult,
} from '../types';
import { parseBusMessages } from '../lib/bus';
import {
  specDraftingSystem, specDraftingUser,
  podSystem,
  verificationSystem, verificationUser,
  coordinationSystem, coordinationUser,
  synthesisSystem, synthesisUser,
} from '../lib/prompts';
import type { DiscoveryResult, CoordinationResult, SynthesisResult } from '../types';
import { generateSessionId } from '../lib/security';
import { clearSession } from '../lib/storage';
import { resolveProviders, jsonWithFallback, streamWithFallback } from '../lib/providers';

// ── Reducer ──────────────────────────────────────────────────────────────────

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

// ── Hook ─────────────────────────────────────────────────────────────────────

export interface NexusActions {
  runMission: (providerConfigs: ProviderConfig[], mission: string) => Promise<void>;
  abort: () => void;
  reset: () => void;
}

export function useNexus(): [NexusState, NexusActions] {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const abortRef = useRef<AbortController | null>(null);
  const podOutputsRef = useRef(new Map<string, string>());
  const busMessagesRef = useRef<BusMessage[]>([]);
  const busDedupeRef = useRef(new Set<string>());

  const abort = useCallback(() => { abortRef.current?.abort(); }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    podOutputsRef.current.clear();
    busMessagesRef.current = [];
    busDedupeRef.current = new Set();
    clearSession();
    dispatch({ type: 'RESET' });
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

        const podForPrompt: Pod = {
          ...blueprint,
          status: 'running',
          output: '',
          logs: [],
          retries: 0,
        };

        streamWithFallback(
          podProviders,
          'pod',
          podSystem(podForPrompt, mission, spec, depOutputs, busMessagesRef.current),
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
              resolve();
            },
            onError: err => {
              dispatch({
                type: 'UPDATE_POD',
                id: blueprint.id,
                patch: { status: 'failed', endTime: Date.now() },
              });
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
    [emitBusFromText],
  );

  const runMission = useCallback(async (providerConfigs: ProviderConfig[], mission: string) => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    podOutputsRef.current.clear();
    busMessagesRef.current = [];
    busDedupeRef.current = new Set();

    dispatch({ type: 'SET_MISSION', mission });
    dispatch({ type: 'SET_PHASE', phase: 'spec_drafting' });

    const managerProviders = resolveProviders(providerConfigs, 'manager');
    const podProviders = resolveProviders(providerConfigs, 'pod');

    if (managerProviders.length === 0) {
      dispatch({ type: 'SET_ERROR', error: 'No manager-capable provider configured. Enable at least one provider with a manager model.' });
      return;
    }
    if (podProviders.length === 0) {
      dispatch({ type: 'SET_ERROR', error: 'No pod-capable provider configured. Enable at least one provider with a pod model.' });
      return;
    }

    try {
      // ── Phase 1: Spec Drafting ────────────────────────────────────────────
      // Returns spec + discovery (pods, resources, etc.) in one call
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

      const pods: Pod[] = discovery.pods.map(bp => ({
        ...bp, status: 'queued', output: '', logs: [], retries: 0,
      }));
      dispatch({ type: 'INIT_PODS', pods });
      dispatch({ type: 'SET_PHASE', phase: 'deploying' });

      await new Promise(r => setTimeout(r, 300));
      if (ac.signal.aborted) return;

      // ── Phase 2: Execute pods (DAG-aware parallel, spec-locked) ──────────
      dispatch({ type: 'SET_PHASE', phase: 'executing' });

      const completedPromises = new Map<string, Promise<void>>();

      for (const bp of discovery.pods) {
        const depPromises = bp.dependencies
          .map(id => completedPromises.get(id))
          .filter((p): p is Promise<void> => p !== undefined);

        const podExecution = Promise.all(depPromises).then(async () => {
          if (ac.signal.aborted) return;
          dispatch({ type: 'UPDATE_POD', id: bp.id, patch: { status: 'waiting', startTime: Date.now() } });
          await executePod(bp, mission, spec, podProviders, ac.signal);
        });

        completedPromises.set(bp.id, podExecution);
      }

      await Promise.all([...completedPromises.values()]);
      if (ac.signal.aborted) return;

      // ── Phase 3: Adversarial Spec Verification ────────────────────────────
      dispatch({ type: 'SET_PHASE', phase: 'verifying' });

      const podSnapshots: Pod[] = discovery.pods.map(bp => ({
        ...bp,
        status: 'completed',
        output: podOutputsRef.current.get(bp.id) ?? '',
        logs: [],
        retries: 0,
      }));

      const { result: verification } = await jsonWithFallback<VerificationResult>(
        managerProviders,
        'manager',
        verificationSystem(),
        verificationUser(spec, podSnapshots, busMessagesRef.current),
        ac.signal,
      );
      if (ac.signal.aborted) return;

      // Normalize verification result
      const normalizedVerification: VerificationResult = {
        overallCompliance: verification.overallCompliance ?? 0,
        vcResults: verification.vcResults ?? [],
        violations: verification.violations ?? [],
        specUpdates: verification.specUpdates ?? [],
        verifiedAt: Date.now(),
      };

      dispatch({ type: 'SET_VERIFICATION', verification: normalizedVerification });

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
      dispatch({ type: 'SET_PHASE', phase: 'complete' });

    } catch (err) {
      if (ac.signal.aborted) return;
      dispatch({ type: 'SET_ERROR', error: (err as Error).message ?? 'Unknown error' });
    }
  }, [executePod]);

  return [state, { runMission, abort, reset }];
}
