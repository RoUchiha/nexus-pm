# NEXUS AI Project Manager

Autonomous multi-agent orchestration system. NEXUS (the manager) spins up specialized AI pods, runs them in parallel, facilitates inter-agent communication via a message bus, coordinates alignment, and synthesizes a final report.

## Architecture

```
src/
  types/index.ts        — all TypeScript interfaces
  lib/
    api.ts              — Anthropic streaming client (retry + abort)
    security.ts         — input validation, sanitization, API key checks
    bus.ts              — inter-agent message bus parser
    prompts.ts          — all 4 system prompts (discovery, pod, coordination, synthesis)
    constants.ts        — colors, status meta, example missions
    storage.ts          — sessionStorage persistence
  hooks/
    useNexus.ts         — main orchestration state machine
  components/           — all UI components
```

## Execution Phases

1. **Discovery** — NEXUS analyzes mission, inventories resources, defines pod blueprints
2. **Deploying** — pods spin up in dependency order (DAG-aware parallel execution)
3. **Executing** — pods run with live streaming; inter-agent messages appear on the bus
4. **Coordinating** — NEXUS scans for misalignments, issues corrections
5. **Synthesis** — NEXUS produces the unified executive report

## Pod Communication Protocol

Pods emit structured messages mid-output:
- `[BROADCAST]: message` — all pods see this
- `[SIGNAL→pod_id]: message` — direct to a specific pod
- `[ALIGNED]: decision` — confirms shared decision
- `[RISK]: description` — flags a blocker

## Models

- Manager (discovery, coordination, synthesis): `claude-opus-4-8`
- Pods (parallel execution): `claude-sonnet-4-6`

## Security Notes

- API key stored in sessionStorage only (cleared on tab close), never persisted to disk
- All user input sanitized before hitting the API
- CSP header set in index.html
- No eval(), no dynamic code execution
- Inputs capped at 2000 chars (mission) / 8000 chars (context)

## Dev Commands

```bash
npm install
npm run dev        # → localhost:3000
npm run build
npm run typecheck
```
