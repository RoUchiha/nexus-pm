# Company Worker Agents

NEXUS can run in two execution modes:

- **Autonomous routing**: NEXUS assigns every pod to configured model providers and streams pod output directly.
- **Company worker routing**: NEXUS keeps the manager, verifier, spec, message bus, and synthesis pipeline in control, while human workers claim pod work and run their own agents outside the app.

The purpose of worker routing is to let employees use their preferred agents without losing the manager-agent guardrails that make NEXUS useful: the mission spec remains the single source of truth, work is reviewed before downstream pods continue, and accepted output is communicated to the rest of the fleet.

## Worker Flow

1. A company worker connects an agent in the **Company Worker Agents** panel.
2. The user enables **Worker routing** before launching a mission.
3. NEXUS includes the connected worker roster while drafting the mission spec and pod plan.
4. During execution, each DAG wave opens pod assignments instead of immediately calling a pod model.
5. A worker claims a pod, then NEXUS generates a handoff packet for that worker's agent.
6. The worker runs the packet in their own agent and submits the output back to NEXUS.
7. The NEXUS Manager reviews the submission against scope, constraints, assigned VCs, dependency outputs, manager directives, and bus history.
8. If approved, the submitted output becomes the official pod output and downstream pods continue.
9. If revisions are required, the pod stays blocked until the worker submits a corrected output.

## Handoff Packet Contents

Each handoff packet contains:

- Worker-agent identity, owner, capabilities, and connection notes.
- The original company mission.
- The binding `MissionSpec`, including outcomes, scope, constraints, assumptions, and verification criteria.
- The pod's responsibility, deliverable, role, and assigned VCs.
- Dependency outputs from completed pods.
- Current message-bus history.
- Any NEXUS manager directives targeted at that pod.
- A submission checklist requiring explicit VC evidence and downstream coordination notes.

## Manager Review Rules

The manager accepts a worker submission only when:

- All assigned VCs are directly addressed with evidence.
- The output stays inside `scope.in` and avoids `scope.out`.
- No `constraints.never` item is violated.
- Any `constraints.askFirst` item is surfaced instead of silently assumed.
- Downstream contracts or risks are communicated with bus tags such as `[BROADCAST]`, `[SIGNAL→pod_id]`, `[RISK]`, `[ALIGNED]`, or `[REPORT→NEXUS]`.

When accepted, NEXUS parses worker-authored bus tags, publishes manager summaries/directives, marks the pod complete, and uses the output in verification, coordination, and synthesis.

## State Model

Worker routing is represented in the shared domain model rather than isolated UI state:

- `WorkerAgentConnection` stores connected worker-agent metadata.
- `WorkerPodAssignment` tracks claim status, handoff prompt, submitted output, manager review, and timestamps.
- `WorkerReviewResult` stores approval, revision guidance, VC status, manager directives, and bus summary.
- `workerMode`, `workerAgents`, and `workerAssignments` live in `NexusState`.

This keeps worker routing aligned with the same reducer and orchestration flow as autonomous model pods.

## Validation

The current implementation has been checked with:

- `npm.cmd run typecheck`
- `npm.cmd run build`
- `git diff --check`

Browser automation could not launch in this Windows sandbox, but the local Vite server responded successfully during manual HTTP verification.
