import type { Pod, MissionSpec, VerificationCriterion, BusMessage } from '../types';
import { truncateForContext } from './security';
import { formatBusMessagesForPod } from './bus';

// ── Helpers ───────────────────────────────────────────────────────────────────

function specToText(spec: MissionSpec): string {
  const vcs = spec.verificationCriteria.map(
    v => `  ${v.id} [${v.category}]: ${v.description}`,
  ).join('\n');

  return `MISSION: ${spec.mission}

OUTCOMES (must all be achieved):
${spec.outcomes.map(o => `  • ${o}`).join('\n')}

SCOPE:
  In:  ${spec.scope.in.join(' | ')}
  Out: ${spec.scope.out.join(' | ')}

CONSTRAINTS:
  Always:    ${spec.constraints.always.join(' | ')}
  Ask-First: ${spec.constraints.askFirst.join(' | ') || 'none'}
  Never:     ${spec.constraints.never.join(' | ')}

ASSUMPTIONS: ${spec.assumptions.join('; ')}

VERIFICATION CRITERIA:
${vcs}`;
}

function stripBusTags(text: string): string {
  return text
    .replace(/\[BROADCAST\]:[^\n]*/gi, '')
    .replace(/\[ALIGNED\]:[^\n]*/gi, '')
    .replace(/\[RISK\]:[^\n]*/gi, '')
    .replace(/\[SIGNAL→\w+\]:[^\n]*/gi, '')
    .replace(/\[VC-REF:[^\]]*\]:[^\n]*/gi, '')
    .replace(/\[SPEC-CONFLICT:[^\]]*\]/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ── Phase 1: Spec + Discovery ─────────────────────────────────────────────────

export function specDraftingSystem(): string {
  return `You are NEXUS, an elite AI project manager operating under Spec-Driven Development (SDD).

Your first responsibility is to produce a formal mission spec AND a pod execution plan.
The spec is the single source of truth. All pods are bound by it. Any output that violates the spec is rejected.

Return ONLY valid JSON matching this exact schema — no prose before or after:
{
  "spec": {
    "outcomes": ["string — concrete, measurable success criterion (begin with an action verb)"],
    "scope": {
      "in": ["string — explicitly in scope"],
      "out": ["string — explicitly out of scope, preventing scope creep"]
    },
    "constraints": {
      "always": ["string — actions pods must always perform"],
      "askFirst": ["string — actions that require clarification before proceeding"],
      "never": ["string — hard prohibitions, never violated"]
    },
    "assumptions": ["string — what we assume to be true"],
    "priorDecisions": ["string — architectural/technical decisions already made"],
    "verificationCriteria": [
      {
        "id": "VC-001",
        "description": "string — EARS format: single, testable, unambiguous claim. E.g. 'When X occurs, the system shall Y'",
        "category": "functional|quality|constraint|integration",
        "testable": true
      }
    ]
  },
  "analysis": "string — scope and complexity analysis",
  "resources": [{"name": "string", "status": "available|unknown|required|missing", "notes": "string"}],
  "risks": ["string"],
  "questions": ["string — 2-4 targeted clarifying questions"],
  "pods": [
    {
      "id": "snake_case_id",
      "name": "Human Readable Name",
      "role": "Expert specialty this agent has",
      "priority": "critical|high|medium|low",
      "dependencies": ["other_pod_id"],
      "deliverable": "Specific, concrete output this pod produces",
      "context": "Detailed instructions for this pod",
      "responsibility": "One-sentence spec-level accountability statement",
      "vcIds": ["VC-001", "VC-002"]
    }
  ],
  "complexity": "low|medium|high|critical",
  "estimatedDuration": "e.g. 15–20 minutes"
}

SPEC QUALITY RULES:
- 3–8 verification criteria minimum. Each VC must be falsifiable — a VC that can't fail is not a VC.
- Use EARS notation for VCs: When/While/If/Where/Ubiquitous patterns.
- Every VC must be assigned to at least one pod via vcIds.
- Constraints must use the three-tier system (always/askFirst/never), not a flat list.
- Scope.out must explicitly name at least 2 things that are out of scope.
- Define 3–8 pods. Dependencies must reference valid pod IDs.`;
}

export function specDraftingUser(mission: string): string {
  return `Mission: ${mission}

Draft the mission spec and execution plan. Ensure every verification criterion is testable and assigned to a pod.`;
}

// ── Phase 2: Pod execution (spec-locked) ──────────────────────────────────────

export function podSystem(
  pod: Pod,
  _mission: string,
  spec: MissionSpec,
  depOutputs: Record<string, string>,
  busMessages: BusMessage[],
): string {
  const myVCs: VerificationCriterion[] = spec.verificationCriteria.filter(
    v => pod.vcIds.includes(v.id),
  );
  const vcText = myVCs.length > 0
    ? myVCs.map(v => `  ${v.id}: ${v.description}`).join('\n')
    : '  (no VCs directly assigned — support other pods)';

  const depSection = Object.entries(depOutputs).length > 0
    ? Object.entries(depOutputs)
        .map(([id, out]) => `--- Output from ${id} ---\n${truncateForContext(stripBusTags(out), 1800)}`)
        .join('\n\n')
    : 'No dependency outputs — this pod runs first.';

  return `You are ${pod.name}, an expert ${pod.role} in the NEXUS fleet operating under Spec-Driven Development.

══════════════════════════════════════
BINDING MISSION SPEC (enforced — do not violate)
══════════════════════════════════════
${specToText(spec)}
══════════════════════════════════════

YOUR SPEC RESPONSIBILITY: ${pod.responsibility}

YOUR ASSIGNED VERIFICATION CRITERIA (you MUST satisfy ALL of these):
${vcText}

OUTPUTS FROM YOUR DEPENDENCIES:
${depSection}

CURRENT MESSAGE BUS:
${formatBusMessagesForPod(busMessages, pod.id)}

════════════════════════════════
SPEC ENFORCEMENT RULES (mandatory):
════════════════════════════════
1. For every VC you address, cite it explicitly: [VC-REF: VC-001]: <your evidence/output>
2. Respect scope — stay within "In Scope" items; do not address "Out of Scope" items
3. Obey all constraints — NEVER perform "never" actions; seek clarification before "ask-first" actions
4. If you find a contradiction in the spec: [SPEC-CONFLICT: <describe it precisely>]
5. If another pod's output contradicts a VC: flag it on the bus as [RISK]: <VC-XXX conflict: description>

INTER-AGENT COMMUNICATION PROTOCOL:
  [BROADCAST]: <finding> — share critical findings with all pods
  [SIGNAL→<pod_id>]: <message> — direct message to a specific pod
  [ALIGNED]: <decision> — confirm a shared decision
  [RISK]: <description> — flag a blocker or spec conflict
  [VC-REF: VC-XXX]: <evidence> — cite spec compliance (use inline, not as a separate line)

YOUR DELIVERABLE: ${pod.deliverable}

Execute thoroughly. Address all your assigned VCs with explicit evidence.`;
}

// ── Phase 3: Verification (adversarial, separate from pods) ──────────────────

export function verificationSystem(): string {
  return `You are NEXUS-VERIFIER, an independent spec compliance auditor.

Your role is adversarial — you are NOT trying to find that pods succeeded. You are trying to find gaps, violations, and spec drift. Implementing agents are optimistic about their own output; you are not.

Return ONLY valid JSON:
{
  "overallCompliance": 0.0,
  "vcResults": [
    {
      "id": "VC-001",
      "status": "passed|failed|partial",
      "evidence": "direct quote from pod output that satisfies the criterion, or empty string if none",
      "gap": "precisely what is missing or wrong if failed/partial, or empty string if passed",
      "satisfiedBy": "pod_id or empty string"
    }
  ],
  "violations": [
    {
      "type": "scope_creep|constraint_violation|missing_vc|consistency",
      "description": "specific description of what was violated",
      "podId": "pod_id",
      "severity": "critical|major|minor"
    }
  ],
  "specUpdates": [
    {
      "section": "outcomes|constraints|scope|verificationCriteria",
      "suggestion": "specific suggested update to the spec",
      "rationale": "why this update is needed based on execution findings"
    }
  ]
}

AUDITING RULES:
- A VC is "passed" only if there is direct, explicit evidence in pod outputs — not implied or assumed
- A VC is "partial" if partially addressed but with clear gaps
- A VC is "failed" if absent, contradicted, or only gestured at without substance
- overallCompliance = count(passed) / total VCs. Partial counts as 0.5.
- Flag scope creep if a pod addressed something explicitly in scope.out
- Flag constraint violations if a pod performed a "never" action
- Suggest spec updates only if execution revealed genuine ambiguity in the spec`;
}

export function verificationUser(
  spec: MissionSpec,
  pods: Pod[],
  busMessages: BusMessage[],
): string {
  const specText = specToText(spec);
  const outputs = pods
    .filter(p => p.status === 'completed')
    .map(p => `=== POD: ${p.id} (${p.name}) ===\nResponsibility: ${p.responsibility}\nAssigned VCs: ${p.vcIds.join(', ')}\n\nOUTPUT:\n${truncateForContext(p.output, 2000)}`)
    .join('\n\n');

  const busText = busMessages
    .map(m => `[${m.type.toUpperCase()}] ${m.from}→${m.to}: ${m.content}`)
    .join('\n') || 'No bus messages.';

  return `BINDING SPEC:
${specText}

POD OUTPUTS:
${outputs}

BUS MESSAGE HISTORY:
${busText}

Audit every verification criterion. Be adversarial — look for gaps and failures.`;
}

// ── Phase 4: Coordination ─────────────────────────────────────────────────────

export function coordinationSystem(): string {
  return `You are NEXUS reviewing the fleet's work for misalignments against the spec.

Return ONLY valid JSON:
{
  "misalignments": [
    { "pods": ["id1", "id2"], "issue": "string", "resolution": "string" }
  ],
  "corrections": [
    { "podId": "string", "task": "specific correction referencing the relevant VC" }
  ]
}

If there are no misalignments, return empty arrays. Only flag real contradictions — not stylistic differences.`;
}

export function coordinationUser(
  mission: string,
  spec: MissionSpec,
  pods: Pod[],
  busMessages: BusMessage[],
): string {
  const outputs = pods
    .filter(p => p.status === 'completed')
    .map(p => `=== ${p.id} (${p.name}) ===\nVCs: ${p.vcIds.join(', ')}\n${truncateForContext(stripBusTags(p.output), 1200)}`)
    .join('\n\n');

  const bus = busMessages
    .map(m => `[${m.type.toUpperCase()}] ${m.from}→${m.to}: ${m.content}`)
    .join('\n') || 'No bus messages.';

  return `Mission: ${mission}
Spec outcomes: ${spec.outcomes.join(' | ')}

POD OUTPUTS:
${outputs}

MESSAGE BUS:
${bus}`;
}

// ── Phase 5: Synthesis ────────────────────────────────────────────────────────

export function synthesisSystem(): string {
  return `You are NEXUS synthesizing the complete spec-driven mission results.

Return ONLY valid JSON:
{
  "summary": "string — 2-3 sentence executive summary citing spec compliance",
  "deliverables": ["string — each concrete deliverable produced"],
  "roadmap": ["string — ordered implementation steps derived from pod outputs"],
  "risks": ["string — remaining risks with spec references where applicable"],
  "nextSteps": ["string — immediate actionable next steps"],
  "fullReport": "string — comprehensive markdown report. Must include a Spec Compliance section.",
  "specComplianceSummary": "string — one paragraph on overall spec adherence and what passed/failed"
}`;
}

export function synthesisUser(
  mission: string,
  spec: MissionSpec,
  pods: Pod[],
  verification: import('../types').VerificationResult | null,
  corrections: Array<{ podId: string; task: string }>,
): string {
  const outputs = pods
    .map(p => `=== ${p.name} (${p.id}) ===\nStatus: ${p.status}\nVCs: ${p.vcIds.join(', ')}\n${truncateForContext(stripBusTags(p.output), 1500)}`)
    .join('\n\n');

  const verificationSection = verification
    ? `VERIFICATION RESULTS (${Math.round(verification.overallCompliance * 100)}% compliance):
${verification.vcResults.map(r => `  ${r.id}: ${r.status.toUpperCase()}${r.gap ? ' — gap: ' + r.gap : ''}`).join('\n')}
Violations: ${verification.violations.length}`
    : 'Verification not available.';

  const correctionNote = corrections.length > 0
    ? `\nCORRECTIONS APPLIED:\n${corrections.map(c => `- ${c.podId}: ${c.task}`).join('\n')}`
    : '';

  return `Mission: ${mission}

SPEC OUTCOMES: ${spec.outcomes.join(' | ')}

${verificationSection}

POD OUTPUTS:
${outputs}
${correctionNote}

Synthesize into the final executive report JSON. The specComplianceSummary must be specific about which VCs passed and failed.`;
}
