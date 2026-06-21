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

| Phase             | What you'll see                                                              |
| ----------------- | ---------------------------------------------------------------------------- |
| Spec Drafting     | Manager generates 6 EARS-format VCs, scope, constraints, and a 4-pod plan    |
| Wave 1 (parallel) | `Backend API Pod` + `Realtime Engine Pod` stream simultaneously              |
| Manager Check     | NEXUS reviews wave 1 outputs and issues 2 directives to the frontend pod     |
| Wave 2            | `Frontend UI Pod` executes with manager directives injected into its context |
| Wave 3            | `Integration QA Pod` cross-validates all contracts and flags a risk          |
| Verification      | Verifier audits all 6 VCs — 5 pass, 1 partial, 1 minor violation             |
| Synthesis         | Full executive report with compliance score, 9 deliverables, 8-step roadmap  |

The demo completes in ~30 seconds and showcases the full pipeline including the activity feed, bus messages, and manager-as-SSOT coordination.

---

## Quick start

```bash
git clone https://github.com/RoUchiha/nexus-pm
cd nexus-pm
npm install
npm run dev        # → http://localhost:5173
```

The scripted demo and local Ollama work without cloud credentials. Remote providers require the authenticated server broker described in `.env.example`; provider keys are configured only as server environment variables and never enter the browser.

---

## Providers

| Tier        | Provider         | Credential location                |
| ----------- | ---------------- | ---------------------------------- |
| 🆓 Free     | Ollama (local)   | None; local loopback only          |
| ⚡ Freemium | Groq             | Server environment / managed vault |
| ⚡ Freemium | Google Gemini    | Server environment / managed vault |
| ⚡ Freemium | Mistral AI       | Server environment / managed vault |
| ⚡ Freemium | Together AI      | Server environment / managed vault |
| 💳 Paid     | OpenAI           | Server environment / managed vault |
| 💳 Paid     | Anthropic Claude | Server environment / managed vault |

NEXUS tries **free → freemium → paid** automatically and falls back if a provider fails or rate-limits.

---

## Connector Agent

The Connector Agent adds governed connection points for LLM gateways, PostgreSQL, MongoDB, GitHub, GitLab, MCP/remote agents, and REST APIs.

- Validates public HTTPS endpoints, authentication shape, and least-privilege scopes.
- Keeps credentials in memory and strips them from persisted state, diagnostics, routes, and model prompts.
- Requires explicit approval before routing, with supervised, autonomous-policy, and manual control modes.
- Shows actionable diagnostics and lets operators steer, pause, resume, or take over.
- Sends only approved capability metadata into mission planning.

The static browser app intentionally does not make arbitrary connector calls. Production execution requires the server-side broker described in [docs/connector-agent.md](docs/connector-agent.md). This avoids turning the browser into an SSRF pivot or shipping database and repository secrets to client code.

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
See [docs/security-assessment-2026-06-20.md](docs/security-assessment-2026-06-20.md) for the latest penetration-test findings, fixes, evidence, and residual risks.

---

## Security

- **Execution is bounded.** Provider requests and idle streams time out, retries are capped, and response size is limited.
- **Model plans are untrusted.** Pod identifiers, dependencies, verification ownership, and DAG integrity are validated before execution.
- **Cloud secrets are server-only.** Authenticated provider calls flow through `/api/llm`; the browser has no cloud-provider API-key field or direct cloud-provider data path.
- **Tenant controls fail closed.** Clerk JWT verification, authorized-party checks, Upstash-backed request/day/concurrency limits, and server allowlists run before provider or connector access.
- **Connector secrets are vaulted.** Credentials are tenant-bound with AES-256-GCM and replaced client-side by an opaque vault reference after diagnosis.
- **Security events are durable.** Redacted, correlation-aware events are retained in tenant-scoped Redis audit logs and emitted to structured platform logs.
- **Response headers are deployable.** `vercel.json` configures CSP `frame-ancestors`, clickjacking, MIME, referrer, permissions, COOP/CORP, and HSTS headers.

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

| Tag                            | Meaning                                      |
| ------------------------------ | -------------------------------------------- |
| `[BROADCAST]: text`            | Share finding with all pods                  |
| `[SIGNAL→pod_id]: text`        | Direct message to a specific pod             |
| `[ALIGNED]: decision`          | Confirm a shared decision                    |
| `[RISK]: description`          | Flag a blocker or conflict                   |
| `[VC-REF: VC-001]: evidence`   | Cite spec compliance inline                  |
| `[SPEC-CONFLICT: description]` | Flag a contradiction in the spec             |
| `[REPORT→NEXUS]: update`       | Pod reports a key decision to the manager    |
| `[DIRECTIVE]: instruction`     | Manager issues a directive to next-wave pods |

---

## Models

Three independent model roles — each configurable per provider in the UI:

| Role         | Used for                                            | Default (Anthropic) |
| ------------ | --------------------------------------------------- | ------------------- |
| **Manager**  | Spec drafting, wave checks, coordination, synthesis | `claude-opus-4-8`   |
| **Pod**      | Parallel agent execution                            | `claude-sonnet-4-6` |
| **Verifier** | Adversarial spec audit (separate from pods)         | `claude-sonnet-4-6` |

Using different models per role keeps context pressure off the expensive manager model during parallel pod execution, and lets the verifier use a large-context model optimized for reading many pod outputs at once.

---

## Claude Code integration

```bash
cd nexus-pm
claude   # CLAUDE.md is read automatically — full architectural context from session start
```
