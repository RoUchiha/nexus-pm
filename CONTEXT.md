# NEXUS PM — Full Session Context

## Repo
**https://github.com/RoUchiha/nexus-pm**  
Local: `C:\Users\Roshaan\Documents\nexus-pm`  
Dev server: `npm install && npm run dev` → http://localhost:5173
**Live demo: https://rouchiha.github.io/nexus-pm/** (GitHub Pages, auto-deploys on push to main)

---

## What was built
A **Spec-Driven Development (SDD) AI Project Manager** — React 18 + TypeScript strict + Vite. No backend. Browser-only, all API calls go directly to provider endpoints.

---

## Architecture — 5-phase SDD pipeline

```
idle → spec_drafting → deploying → executing → verifying → synthesis → complete
```

| Phase | What happens |
|---|---|
| `spec_drafting` | NEXUS Manager writes `MissionSpec` + pod plan in one JSON call |
| `deploying` | Pod state initialized, brief visual pause |
| `executing` | Pods run in DAG-ordered **waves**. After each wave, NEXUS Manager reviews outputs and issues directives to next-wave pods (manager-as-SSOT). Live streaming, spec-locked. In company-worker mode, each pod waits for a connected worker agent to claim, submit, and pass manager review |
| `verifying` | Adversarial Verifier (separate model role from pods) audits every VC |
| `synthesis` | Executive report with compliance score, deliverables, roadmap |

---

## File map

```
src/
  types/index.ts          ← ALL types: MissionSpec, Pod, VC, VerificationResult, ProviderConfig,
                             ActivityLogEntry, ActivityAction, AppPhase…
  lib/
    api.ts                ← claudeStream() + StreamCallbacks interface — retry/backoff/abort
    providers.ts          ← 7 providers + resolveProviders() + streamWithFallback() +
                             jsonWithFallback() — supports 3 model roles: manager/pod/verifier
    bus.ts                ← parseBusMessages() — all bus tag types including report + directive
    prompts.ts            ← specDraftingSystem/User, podSystem (accepts managerDirectives),
                             verificationSystem/User, managerWaveCheckSystem/User,
                             workerHandoffPrompt, workerReviewSystem/User,
                             coordinationSystem/User, synthesisSystem/User
    security.ts           ← sanitizeInput, validateMission, validateApiKey, truncateForContext,
                             generateSessionId
    storage.ts            ← sessionStorage only: saveProviderConfigs/loadProviderConfigs
                             (backfills verifierModel on load), saveSession/loadSession
    constants.ts          ← PRIORITY_COLORS, STATUS_META, PHASE_META, BUS_TYPE_META
                             (includes report + directive), VC_STATUS_META, VC_CATEGORY_COLORS
  hooks/
    useNexus.ts           ← main reducer + runMission() orchestration + runDemo() — THE core file
  demo/
    demoData.ts           ← full scripted mission: DEMO_SPEC, DEMO_DISCOVERY, DEMO_POD_OUTPUTS
                             (4 pods), DEMO_WAVE_CHECK_DIRECTIVES, DEMO_VERIFICATION,
                             DEMO_COORDINATION, DEMO_SYNTHESIS
    useDemoRunner.ts      ← streaming replay engine — runDemoReplay() dispatches state transitions
                             with realistic char-by-char streaming, no API calls needed
    demoActivity.ts       ← makeActivityEntry() factory for demo log entries
  components/
    SpecPanel.tsx         ← tabbed: VCs (with compliance badges), Scope, Constraints, Meta
    VerificationPanel.tsx ← compliance gauge, per-VC expand (evidence + gap), violations,
                             spec update suggestions
    PodCard.tsx           ← streaming output, VC badges, provider label, spec responsibility
    ProvidersPanel.tsx    ← collapsed bar + expanded grid, per-provider toggle/key/model selectors
                             (manager + pod + verifier model per provider)
    WorkerAgentsPanel.tsx ← company worker-agent roster, worker routing toggle, pod claim,
                             handoff packet, output submission, manager revision display
    MessageBusPanel.tsx   ← live bus feed, auto-scroll
    DiscoveryPanel.tsx    ← analysis, resources, risks, pod plan with VC assignments
    SynthesisPanel.tsx    ← compliance score, deliverables, roadmap, risks, next steps,
                             full report toggle
    ActivityFeedPanel.tsx ← live scrolling agent action log, per-agent filter buttons,
                             expandable detail rows, auto-scroll with jump-to-latest
    Header.tsx            ← phase label + spinner + elapsed + Abort/New Mission buttons
    PhaseIndicator.tsx    ← 5-step progress bar
    MissionInput.tsx      ← textarea + example missions + ⌘+Enter submit + ▶ Watch Demo button
    ErrorBoundary.tsx     ← wraps each PodCard
  .github/
    workflows/deploy.yml  ← GitHub Actions: build + deploy to GitHub Pages on push to main
```

---

## Key types (types/index.ts)

```typescript
// Core spec contract
interface MissionSpec {
  id, version, createdAt, mission, status: SpecStatus
  outcomes: string[]
  scope: { in: string[], out: string[] }
  constraints: { always: string[], askFirst: string[], never: string[] }
  assumptions: string[], priorDecisions: string[]
  verificationCriteria: VerificationCriterion[]  // EARS-format, each assigned to a pod
  podSections: PodSpecSection[]   // podId + responsibility + vcIds[]
}

interface VerificationCriterion { id, description, category: VCCategory, testable }
interface VCResult { id, status: VCStatus, evidence, gap, satisfiedBy }
interface VerificationResult { overallCompliance: 0-1, vcResults, violations, specUpdates, verifiedAt }

interface Pod extends PodBlueprint {
  status: PodStatus, output, logs, startTime, endTime, retries
  usedProvider?, assignedWorkerAgentId?, vcCompliance?: Record<string, VCStatus>
}

interface PodBlueprint { id, name, role, priority, dependencies, deliverable, context, vcIds, responsibility }

// Activity log — every agent action recorded with reasoning
type ActivityAction =
  | 'spec_drafted' | 'pod_started' | 'pod_completed' | 'pod_failed'
  | 'worker_agent_claimed' | 'worker_submission_received'
  | 'worker_submission_approved' | 'worker_revision_requested'
  | 'manager_directive' | 'verification_result' | 'coordination_correction' | 'synthesis_complete'

interface WorkerAgentConnection { id, name, ownerName, capabilities, connectionNotes, enabled, createdAt }
interface WorkerPodAssignment { podId, workerAgentId?, status, handoffPrompt?, submittedOutput?, review? }

interface ActivityLogEntry {
  id, timestamp, agentId, agentName, phase: AppPhase, action: ActivityAction
  missionPortion: string  // which part of the mission this covers
  reasoning: string       // the logic that led to this action
  details?: string        // extra context, VC refs, etc.
}

type AppPhase = 'idle'|'spec_drafting'|'deploying'|'executing'|'verifying'|'synthesis'|'complete'|'error'
type VCStatus = 'pending'|'passed'|'failed'|'partial'
type MessageType = 'broadcast'|'signal'|'aligned'|'risk'|'spec_ref'|'spec_conflict'|'system'|'report'|'directive'
type ModelRole = 'manager' | 'pod' | 'verifier'

interface NexusState {
  phase, mission, sessionId, spec, discovery, pods, bus,
  verification, coordination, synthesis,
  workerMode, workerAgents, workerAssignments,
  activityLog: ActivityLogEntry[],   // ← added
  error, startTime
}
```

---

## Providers (providers.ts)

**7 providers, tried in order: free → freemium → paid**

| ID | Tier | Format | Key prefix |
|---|---|---|---|
| `ollama` | free | openai-compat | none (localhost:11434) |
| `groq` | freemium | openai-compat | `gsk_` |
| `gemini` | freemium | gemini | `AIza` |
| `mistral` | freemium | openai-compat | — |
| `together` | freemium | openai-compat | — |
| `openai` | paid | openai-compat | `sk-` |
| `anthropic` | paid | anthropic | `sk-ant-` |

**3 model roles per provider** (all configurable in UI):

| Role | Used for | Anthropic default |
|---|---|---|
| `manager` | Spec drafting, wave checks, coordination, synthesis | `claude-opus-4-8` |
| `pod` | Parallel pod execution | `claude-sonnet-4-6` |
| `verifier` | Adversarial spec auditor (separate from pods) | `claude-sonnet-4-6` |

Key functions:
- `resolveProviders(configs, role)` → sorted `ResolvedProvider[]` — role can be `'manager'|'pod'|'verifier'`
- `streamWithFallback(providers, role, system, messages, callbacks, signal)` → tries each provider, auto-fallbacks
- `jsonWithFallback<T>(providers, role, system, user, signal)` → returns `{result: T, usedProvider: string}`
- `verifier` role falls back to `managerModel` if `verifierModel` is not set in config

---

## useNexus.ts — orchestration

```typescript
// State managed by reducer:
NexusState { phase, mission, spec, discovery, pods, bus, verification,
             coordination, synthesis, activityLog, error, startTime }

// Refs (mutable, readable during async):
podOutputsRef        Map<podId, string>   // source of truth for pod outputs
busMessagesRef       BusMessage[]         // latest bus snapshot for pod prompts
busDedupeRef         Set<string>          // prevents duplicate bus messages
managerDirectivesRef Map<podId, string[]> // directives from manager wave checks
workerResolversRef   Map<podId, resolver> // pauses DAG waves for company-worker submissions
workerRunContextRef  { mission, spec, managerProviders, signal } // manager review context

// Flow in runMission():
1. jsonWithFallback → RawSpecResult → build MissionSpec + DiscoveryResult
   - If company-worker mode is enabled, connected worker agents are included in spec drafting context
2. computeWaves(pods) → string[][] — groups pods by DAG dependency level
3. For each wave:
   a. Autonomous mode: Promise.all(wave pods) via executePod() with managerDirectives injected
   b. Company-worker mode: executeWorkerPod() creates an assignment and waits until
      claimWorkerPod() + submitWorkerPodOutput() passes manager review
   c. After wave (not last): jsonWithFallback(managerProviders) → WaveCheckResult
      → store directives in managerDirectivesRef, emit [DIRECTIVE] bus messages
4. jsonWithFallback(verifierProviders) → VerificationResult
5. jsonWithFallback(managerProviders) → CoordinationResult
6. jsonWithFallback(managerProviders) → SynthesisResult

// Activity log emitted at:
- Spec draft complete (spec_drafted)
- Each pod start (pod_started) with directive count
- Each pod complete (pod_completed) with VCs addressed
- Each pod fail (pod_failed)
- Each manager wave check (manager_directive)
- Verification complete (verification_result) with compliance %
- Coordination corrections (coordination_correction)
- Synthesis complete (synthesis_complete)

// runDemo() — no API calls, replays scripted mission:
1. Resets state, fires runDemoReplay(dispatch, signal)
2. Streams all pod outputs char-by-char with setTimeout delays
3. Dispatches same actions as real run (SET_SPEC, INIT_PODS, APPEND_POD_OUTPUT, etc.)
```

---

## Bus protocol (bus.ts — parsed live from streaming chunks)

```
[BROADCAST]: text           → type: broadcast, to: ALL
[SIGNAL→pod_id]: text       → type: signal, to: pod_id
[ALIGNED]: decision         → type: aligned, to: ALL
[RISK]: description         → type: risk, to: ALL
[VC-REF: VC-001]: evidence  → type: spec_ref, to: ALL
[SPEC-CONFLICT: desc]       → type: spec_conflict, to: ALL
[REPORT→NEXUS]: update      → type: report, to: NEXUS  (pod → manager)
[DIRECTIVE]: instruction    → type: directive, to: ALL  (manager → pods, emitted between waves)
```

---

## Prompts (prompts.ts)

**specDraftingSystem()** — Returns JSON with `spec` + `pods` + `analysis`, `resources`, `risks`, `questions`, `complexity`, `estimatedDuration`

**podSystem(pod, mission, spec, depOutputs, busMessages, managerDirectives?)** — Injects full spec as BINDING CONTRACT, pod's assigned VCs, dep outputs, bus messages, and optional MANAGER DIRECTIVES section. Instructs use of `[REPORT→NEXUS]` tag.

**verificationSystem()** — Adversarial auditor. Returns `{overallCompliance, vcResults[], violations[], specUpdates[]}`.

**managerWaveCheckSystem/User(waveNumber, completedPods, pendingPodIds, spec, busMessages)** — Between-wave manager check. Returns `{waveSummary, directives[], specAlerts[], logEntry}`. Used after every non-final wave.

**coordinationSystem/User()** — Cross-pod misalignment check, returns corrections.

**synthesisSystem/User()** — Final report with `specComplianceSummary`.

---

## Demo mode (src/demo/)

The built-in demo replays a scripted mission without any API keys:
- **Mission:** "Build a real-time collaborative project tracking dashboard for remote engineering teams"
- **Spec:** 6 VCs (VC-001 through VC-006), 4 pods in 3 DAG waves
- **Wave 1:** `backend_api` + `realtime_engine` (parallel)
- **Manager check → 2 directives** issued to `frontend_ui`
- **Wave 2:** `frontend_ui` (uses manager directives)
- **Wave 3:** `integration_qa` (cross-validates all contracts)
- **Verification:** 87.5% compliance (5 passed, 1 partial, 1 minor violation)
- **Synthesis:** 9 deliverables, 8 roadmap steps
- Completes in ~30 seconds
- Triggered via **▶ Watch Demo** button on idle screen

---

## Security model
- API keys → `sessionStorage` only, cleared on tab close, never on disk
- `.env` is gitignored; optional `VITE_ANTHROPIC_API_KEY` for pre-fill only
- All input through `sanitizeInput()` + `validateMission()` before API
- `truncateForContext()` caps system prompts at 6000 chars, messages at 4000
- CSP in `index.html` whitelists: anthropic, groq, openai, googleapis, mistral, together, localhost:11434
- No eval(), no dynamic code

---

## Deployment (GitHub Pages)

- `.github/workflows/deploy.yml` — triggers on push to `main`/`master`, builds with `GITHUB_ACTIONS=true`, deploys `dist/` to Pages
- `vite.config.ts` — uses `base: '/nexus-pm/'` only when `GITHUB_ACTIONS=true`, so local dev stays at `/`
- Enable at: repo Settings → Pages → Source → GitHub Actions
- Live URL: **https://rouchiha.github.io/nexus-pm/**

---

## What's NOT done yet (good next PRs)
- Spec editor UI — let user edit the spec before pods fire
- Re-run failed pods individually
- Export spec as YAML/JSON file
- Persist completed sessions (currently session-only)
- Toast notifications for bus messages
- VC drill-down: click a VC to see which pod output section satisfies it
- Spec versioning — track spec edits over time
- Multi-mission history
- Activity feed filter persistence across sessions
- Slash commands in `.claude/commands/`

---

## Dev commands
```bash
npm run dev        # Vite dev server → localhost:3000
npm run build      # tsc + vite build
npm run typecheck  # tsc --noEmit only
```

## Claude Code
`CLAUDE.md` at root gives full context automatically.  
`.claude/agents/nexus-architect.md` activates on orchestration changes.
