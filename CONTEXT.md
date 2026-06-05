# NEXUS PM — Full Session Context

## Repo
**https://github.com/RoUchiha/nexus-pm**  
Local: `C:\Users\Roshaan\Documents\nexus-pm`  
Dev server: `npm install && npm run dev` → http://localhost:3000

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
| `spec_drafting` | NEXUS (manager model) writes `MissionSpec` + pod plan in one JSON call |
| `deploying` | Pod state initialized, brief visual pause |
| `executing` | Pods run DAG-parallel, each spec-locked with assigned VCs, live streaming |
| `verifying` | Adversarial Verifier (separate from pods) audits every VC |
| `synthesis` | Executive report with compliance score, deliverables, roadmap |

---

## File map

```
src/
  types/index.ts          ← ALL types: MissionSpec, Pod, VC, VerificationResult, ProviderConfig, AppPhase…
  lib/
    api.ts                ← claudeStream() + StreamCallbacks interface — retry/backoff/abort
    providers.ts          ← 7 providers + resolveProviders() + streamWithFallback() + jsonWithFallback()
    bus.ts                ← parseBusMessages() — [BROADCAST],[SIGNAL→],[ALIGNED],[RISK],[VC-REF],[SPEC-CONFLICT]
    prompts.ts            ← specDraftingSystem/User, podSystem, verificationSystem/User, coordinationSystem/User, synthesisSystem/User
    security.ts           ← sanitizeInput, validateMission, validateApiKey, truncateForContext, generateSessionId
    storage.ts            ← sessionStorage only: saveProviderConfigs/loadProviderConfigs, saveSession/loadSession
    constants.ts          ← PRIORITY_COLORS, STATUS_META, PHASE_META, BUS_TYPE_META, VC_STATUS_META, VC_CATEGORY_COLORS
  hooks/
    useNexus.ts           ← main reducer + runMission() orchestration (THE core file)
  components/
    SpecPanel.tsx         ← tabbed: VCs (with compliance badges), Scope, Constraints, Meta
    VerificationPanel.tsx ← compliance gauge, per-VC expand (evidence + gap), violations, spec update suggestions
    PodCard.tsx           ← streaming output, VC badges, provider label, spec responsibility
    ProvidersPanel.tsx    ← collapsed bar + expanded grid, per-provider toggle/key/model selectors
    MessageBusPanel.tsx   ← live bus feed, auto-scroll
    DiscoveryPanel.tsx    ← analysis, resources, risks, pod plan with VC assignments
    SynthesisPanel.tsx    ← compliance score, deliverables, roadmap, risks, next steps, full report toggle
    Header.tsx            ← phase label + spinner + elapsed + Abort/New Mission buttons
    PhaseIndicator.tsx    ← 5-step progress bar
    MissionInput.tsx      ← textarea + example missions + ⌘+Enter submit
    ErrorBoundary.tsx     ← wraps each PodCard
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
  usedProvider?, vcCompliance?: Record<string, VCStatus>
}

interface PodBlueprint { id, name, role, priority, dependencies, deliverable, context, vcIds, responsibility }

type AppPhase = 'idle'|'spec_drafting'|'deploying'|'executing'|'verifying'|'synthesis'|'complete'|'error'
type VCStatus = 'pending'|'passed'|'failed'|'partial'
type MessageType = 'broadcast'|'signal'|'aligned'|'risk'|'spec_ref'|'spec_conflict'|'system'
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

Key functions:
- `resolveProviders(configs, role)` → sorted `ResolvedProvider[]` (free first, filtered to those with keys + matching model roles)
- `streamWithFallback(providers, role, system, messages, callbacks, signal)` → tries each provider, auto-fallbacks, calls `onProviderSelect` when switching
- `jsonWithFallback<T>(providers, role, system, user, signal)` → same but returns `{result: T, usedProvider: string}`

---

## useNexus.ts — orchestration

```typescript
// State managed by reducer:
NexusState { phase, mission, spec, discovery, pods, bus, verification, coordination, synthesis, error, startTime }

// Refs (mutable, readable during async):
podOutputsRef   Map<podId, string>   // source of truth for pod outputs cross-pods
busMessagesRef  BusMessage[]         // latest bus snapshot for pod prompts
busDedupeRef    Set<string>          // prevents duplicate bus messages

// Flow in runMission():
1. jsonWithFallback → RawSpecResult → build MissionSpec + DiscoveryResult
2. DAG execution: for each pod, Promise.all(depPromises).then(() => executePod())
3. jsonWithFallback → VerificationResult (adversarial, separate from pods)
4. jsonWithFallback → CoordinationResult
5. jsonWithFallback → SynthesisResult
```

---

## Prompts (prompts.ts)

**specDraftingSystem()** — Returns JSON with `spec` (outcomes, scope, constraints, VCs) + `pods` (with `vcIds`, `responsibility`) + `analysis`, `resources`, `risks`, `questions`, `complexity`, `estimatedDuration`

**podSystem(pod, _mission, spec, depOutputs, busMessages)** — Injects full spec as BINDING CONTRACT, lists pod's assigned VCs, enforces `[VC-REF: VC-XXX]: evidence` citation format and `[SPEC-CONFLICT: ...]` flag

**verificationSystem()** — Adversarial auditor prompt. Returns `{overallCompliance, vcResults[], violations[], specUpdates[]}`. Explicitly told: "implementing agents are optimistic; you are not"

**coordinationSystem/User()** — Checks cross-pod misalignments, returns corrections

**synthesisSystem/User()** — Final report with `specComplianceSummary` field

---

## Bus protocol (parsed live from streaming chunks)

```
[BROADCAST]: text           → type: broadcast, to: ALL
[SIGNAL→pod_id]: text       → type: signal, to: pod_id
[ALIGNED]: decision         → type: aligned, to: ALL
[RISK]: description         → type: risk, to: ALL
[VC-REF: VC-001]: evidence  → type: spec_ref, to: ALL
[SPEC-CONFLICT: desc]       → type: spec_conflict, to: ALL
```

---

## Security model
- API keys → `sessionStorage` only, cleared on tab close, never on disk
- `.env` is gitignored; optional `VITE_ANTHROPIC_API_KEY` for pre-fill only
- All input through `sanitizeInput()` + `validateMission()` before API
- `truncateForContext()` caps system prompts at 6000 chars, messages at 4000
- CSP in `index.html` whitelists: anthropic, groq, openai, googleapis, mistral, together, localhost:11434
- No eval(), no dynamic code

---

## What's NOT done yet (good next PRs)
- Spec editor UI — let user edit the spec before pods fire
- Re-run failed pods individually
- Export spec as YAML/JSON file
- Persist completed sessions (currently session-only)
- Slash commands in `.claude/commands/`
- Toast notifications for bus messages
- VC drill-down: click a VC to see which pod output section satisfies it
- Spec versioning — track spec edits over time
- Multi-mission history

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
