# NEXUS — AI Project Manager

Autonomous multi-agent orchestration built on **Spec-Driven Development (SDD)**. Give NEXUS a mission — it writes a formal spec, spins up specialized AI pods, runs them in parallel, verifies outputs against the spec, and synthesizes an executive report.

---

## How it works

```
Mission → Spec Drafting → Pod Execution → Adversarial Verification → Synthesis
```

1. **Spec Drafting** — NEXUS writes a formal `MissionSpec`: outcomes, scope boundaries, three-tier constraints (always/ask-first/never), and EARS-format Verification Criteria (VCs) assigned to specific pods
2. **Pod Execution** — Pods run in parallel (DAG-aware dependency ordering), each bound to the spec and responsible for specific VCs. Live streaming output + inter-agent message bus
3. **Adversarial Verification** — A separate Verifier agent (not the implementing pods) audits every VC against pod outputs, flags violations and gaps
4. **Synthesis** — Executive report with spec compliance score, deliverables, roadmap, and next steps

## Quick start

```bash
git clone https://github.com/YOUR_USERNAME/nexus-pm
cd nexus-pm
npm install
npm run dev        # → http://localhost:3000
```

Enter your API key in the Providers panel (UI, not a config file). Pick a free provider like **Groq** or run **Ollama** locally for zero-cost execution.

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

## Security

- **API keys never leave your browser session.** They are stored in `sessionStorage` only — cleared when the tab closes, never written to disk or sent anywhere except directly to the provider's API endpoint.
- **No backend.** The app calls provider APIs directly from the browser.
- **No `.env` required.** You can optionally set `VITE_ANTHROPIC_API_KEY` in a local `.env` file (gitignored) to pre-fill the Anthropic key, but all keys can also be entered through the UI.
- **Content Security Policy** in `index.html` whitelists only known provider API domains.

```bash
# Optional: pre-fill a key at build time
cp .env.example .env
# Edit .env — this file is gitignored and never committed
```

## Architecture

```
src/
  types/index.ts          — all TypeScript interfaces (MissionSpec, Pod, VC, etc.)
  lib/
    api.ts                — streaming client with retry + abort
    providers.ts          — 7 provider implementations + priority fallback
    bus.ts                — inter-agent message bus parser
    prompts.ts            — all system prompts (spec-drafting, pod, verifier, synthesis)
    security.ts           — input validation, sanitization
    storage.ts            — sessionStorage (keys) — no localStorage
    constants.ts          — colors, status metadata
  hooks/
    useNexus.ts           — orchestration state machine (5-phase SDD pipeline)
  components/
    SpecPanel.tsx          — live spec display with VC compliance tracking
    VerificationPanel.tsx  — adversarial audit results per VC
    PodCard.tsx            — streaming pod output with VC badges
    ProvidersPanel.tsx     — multi-provider key management
    MessageBusPanel.tsx    — real-time inter-agent messages
    SynthesisPanel.tsx     — final report with compliance score
```

## Inter-agent message bus

Pods communicate mid-execution using structured tags:

| Tag | Meaning |
|-----|---------|
| `[BROADCAST]: text` | Share finding with all pods |
| `[SIGNAL→pod_id]: text` | Direct message to a specific pod |
| `[ALIGNED]: decision` | Confirm a shared decision |
| `[RISK]: description` | Flag a blocker or conflict |
| `[VC-REF: VC-001]: evidence` | Cite spec compliance |
| `[SPEC-CONFLICT: description]` | Flag a contradiction in the spec |

## Models

Default configuration — overridable per provider in the UI:

- **Manager** (spec drafting, verification, synthesis): best available model for the provider
- **Pods** (parallel execution): faster model for throughput

## Claude Code integration

The repo includes `.claude/` config for working in Claude Code:

```bash
cd nexus-pm
claude   # CLAUDE.md is read automatically — full architectural context from session start
```

Slash commands: none defined yet (good first PR).  
Agent: `nexus-architect` auto-activates when modifying pod orchestration or the execution model.
