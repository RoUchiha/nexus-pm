# NEXUS — AI Project Manager

Autonomous and company-assisted multi-agent orchestration built on **Spec-Driven Development (SDD)**. Give NEXUS a mission — it writes a formal spec, spins up specialized AI pods or connected worker agents, verifies outputs against the spec, and synthesizes an executive report.

**[Live Demo →](https://rouchiha.github.io/nexus-pm/)** — no API key needed, click **▶ Watch Demo**

---

## Try it now

**[https://rouchiha.github.io/nexus-pm/](https://rouchiha.github.io/nexus-pm/)**

Hit **▶ Watch Demo** on the landing page to watch a full scripted mission run through all 5 phases — no sign-up, no API key. The demo replays a real-time collaborative dashboard architecture mission and showcases every feature: live pod streaming, inter-agent bus messages, manager directives between waves, adversarial verification, and the activity feed log.

---

## How it works

```
Mission → Spec Drafting → Pod Execution → Adversarial Verification → Synthesis
```

1. **Spec Drafting** — NEXUS writes a formal `MissionSpec`: outcomes, scope boundaries, three-tier constraints (always/ask-first/never), and EARS-format Verification Criteria (VCs) assigned to specific pods
2. **Pod Execution** — Pods run in DAG-ordered waves. After each wave, the NEXUS Manager reviews outputs and issues directives to next-wave pods, maintaining a single source of truth. Live streaming + inter-agent message bus. In company-worker mode, human workers can claim pods with their own agents, paste the output back into NEXUS, and receive manager review before downstream agents continue
3. **Adversarial Verification** — A separate Verifier agent (distinct model from the implementing pods) audits every VC against pod outputs, flags violations and gaps
4. **Coordination** — Manager scans for cross-pod misalignments and issues corrections
5. **Synthesis** — Executive report with spec compliance score, deliverables, roadmap, and next steps

---

## Demo

The built-in demo requires no API key. Click **▶ Watch Demo** from the idle screen to replay:

| Phase | What you'll see |
|---|---|
| Spec Drafting | Manager generates 6 EARS-format VCs, scope, constraints, and a 4-pod plan |
| Wave 1 (parallel) | `Backend API Pod` + `Realtime Engine Pod` stream simultaneously |
| Manager Check | NEXUS reviews wave 1 outputs and issues 2 directives to the frontend pod |
| Wave 2 | `Frontend UI Pod` executes with manager directives injected into its context |
| Wave 3 | `Integration QA Pod` cross-validates all contracts and flags a risk |
| Verification | Verifier audits all 6 VCs — 5 pass, 1 partial, 1 minor violation |
| Synthesis | Full executive report with compliance score, 9 deliverables, 8-step roadmap |

The demo completes in ~30 seconds and showcases the full pipeline including the activity feed, bus messages, and manager-as-SSOT coordination.

---

## Quick start (with your own API key)

```bash
git clone https://github.com/RoUchiha/nexus-pm
cd nexus-pm
npm install
npm run dev        # → http://localhost:5173
```

Enter your API key in the Providers panel (UI, not a config file). Pick a free provider like **Groq** or run **Ollama** locally for zero-cost execution.

---

## Providers

| Tier | Provider | Key needed |
|------|----------|-----------|
| 🆓 Free | Ollama (local) | No — runs on your machine |
| ⚡ Freemium | Groq | Yes — free tier at console.groq.com |
| ⚡ Freemium | Google Gemini | Yes — free tier at aistudio.google.com |
| ⚡ Freemium | Mistral AI | Yes — free tier at console.mistral.ai |
| ⚡ Freemium | Together AI | Yes — $25 free credit on signup |
| 💳 Paid | OpenAI | Yes |
| 💳 Paid | Anthropic Claude | Yes |

NEXUS tries **free → freemium → paid** automatically and falls back if a provider fails or rate-limits.

---

## Company worker agents

Use **Company Worker Agents** when employees want to bring their own agents into the NEXUS workflow and manually fulfill tasks.

1. Connect one or more worker agents with an owner and capability summary.
2. Enable **Worker routing** before launching a mission.
3. NEXUS drafts the spec and pod plan with the connected worker roster in context.
4. Each DAG wave pauses for worker claims. NEXUS generates a handoff packet containing the binding spec, assigned VCs, dependency outputs, manager directives, and message-bus protocol.
5. Workers run that packet in their own agent, paste the output back, and NEXUS reviews it before accepting the pod as complete.
6. Accepted worker output is added to the official pod record, parsed for bus messages, summarized by the manager, and used by downstream pods, verification, coordination, and synthesis.

The manager remains the single source of truth: worker submissions can be rejected with required revisions if they miss VCs, drift out of scope, or omit downstream contracts.

See [docs/company-worker-agents.md](docs/company-worker-agents.md) for the full worker routing flow, handoff contents, review rules, and state model.
See [docs/production-readiness.md](docs/production-readiness.md) for the security controls, validation checklist, and enterprise deployment boundaries.

---

## Security

- **API keys are memory-only.** Provider choices are saved for the current tab, but API keys are stripped before `sessionStorage` writes and are cleared on reload or tab close.
- **Provider calls are allowlisted.** The CSP allows only supported provider API domains plus local Ollama on `localhost:11434` / `127.0.0.1:11434`.
- **No backend.** The app calls provider APIs directly from the browser.
- **No `.env` required.** You can optionally set `VITE_ANTHROPIC_API_KEY` in a local `.env` file (gitignored) to pre-fill the Anthropic key, but all keys can be entered through the UI.
- **Content Security Policy** in `index.html` whitelists only known provider API domains.

---

## Architecture

```
src/
  types/index.ts          — all TypeScript interfaces (MissionSpec, Pod, VC, ActivityLogEntry…)
  lib/
    api.ts                — provider streaming type contracts
    providers.ts          — 7 providers, 3 model roles (manager/pod/verifier), priority fallback, retry + abort
    bus.ts                — inter-agent message bus parser (broadcast, signal, directive, report…)
    prompts.ts            — all system prompts (spec-drafting, pod, verifier, wave-check, worker review, synthesis)
    security.ts           — input validation, sanitization
    storage.ts            — tab-scoped provider/worker settings; API keys stripped before storage
    constants.ts          — colors, status metadata
  hooks/
    useNexus.ts           — orchestration state machine (5-phase SDD pipeline + wave/worker manager)
  demo/
    demoData.ts           — scripted mission spec, pod outputs, verification + synthesis results
    useDemoRunner.ts      — streaming replay engine (no API calls needed)
    demoActivity.ts       — activity log entry factory
  components/
    SpecPanel.tsx          — live spec display with VC compliance tracking
    VerificationPanel.tsx  — adversarial audit results per VC
    PodCard.tsx            — streaming pod output with VC badges
    ProvidersPanel.tsx     — multi-provider key management (manager / pod / verifier models)
    WorkerAgentsPanel.tsx  — company worker-agent roster, handoff, submission review
    MessageBusPanel.tsx    — real-time inter-agent messages
    ActivityFeedPanel.tsx  — agent action log (what each agent did, why, which mission portion)
    SynthesisPanel.tsx     — final report with compliance score
```

---

## Inter-agent message bus

Pods communicate mid-execution using structured tags parsed live from the stream:

| Tag | Meaning |
|-----|---------|
| `[BROADCAST]: text` | Share finding with all pods |
| `[SIGNAL→pod_id]: text` | Direct message to a specific pod |
| `[ALIGNED]: decision` | Confirm a shared decision |
| `[RISK]: description` | Flag a blocker or conflict |
| `[VC-REF: VC-001]: evidence` | Cite spec compliance inline |
| `[SPEC-CONFLICT: description]` | Flag a contradiction in the spec |
| `[REPORT→NEXUS]: update` | Pod reports a key decision to the manager |
| `[DIRECTIVE]: instruction` | Manager issues a directive to next-wave pods |

---

## Models

Three independent model roles — each configurable per provider in the UI:

| Role | Used for | Default (Anthropic) |
|------|----------|---------------------|
| **Manager** | Spec drafting, wave checks, coordination, synthesis | `claude-opus-4-8` |
| **Pod** | Parallel agent execution | `claude-sonnet-4-6` |
| **Verifier** | Adversarial spec audit (separate from pods) | `claude-sonnet-4-6` |

Using different models per role keeps context pressure off the expensive manager model during parallel pod execution, and lets the verifier use a large-context model optimized for reading many pod outputs at once.

---

## Claude Code integration

```bash
cd nexus-pm
claude   # CLAUDE.md is read automatically — full architectural context from session start
```
