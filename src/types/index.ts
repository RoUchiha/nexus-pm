// ── Provider types ────────────────────────────────────────────────────────────

export type ProviderTier = 'free' | 'freemium' | 'paid';
export type ModelRole = 'manager' | 'pod' | 'verifier';

export interface ProviderModel {
  id: string;
  name: string;
  roles: ModelRole[];
  contextWindow: number;
  notes?: string;
}

export interface ProviderDefinition {
  id: string;
  name: string;
  tier: ProviderTier;
  tagline: string;
  apiKeyRequired: boolean;
  apiKeyPrefix?: string;
  apiKeyPlaceholder: string;
  baseUrl: string;
  format: 'anthropic' | 'openai' | 'gemini';
  models: ProviderModel[];
  defaultManagerModel: string;
  defaultPodModel: string;
  defaultVerifierModel: string;
}

export interface ProviderConfig {
  providerId: string;
  enabled: boolean;
  apiKey: string;
  managerModel: string;
  podModel: string;
  verifierModel?: string;
  customBaseUrl?: string;
}

export interface ResolvedProvider {
  definition: ProviderDefinition;
  config: ProviderConfig;
}

// ── Spec types (SDD) ──────────────────────────────────────────────────────────

export type VCStatus = 'pending' | 'passed' | 'failed' | 'partial';
export type VCCategory = 'functional' | 'quality' | 'constraint' | 'integration';
export type SpecStatus = 'draft' | 'active' | 'verified' | 'complete';
export type SpecViolationType = 'scope_creep' | 'constraint_violation' | 'missing_vc' | 'consistency';

export interface VerificationCriterion {
  id: string;            // VC-001, VC-002...
  description: string;   // EARS-format single testable claim
  category: VCCategory;
  testable: boolean;
  assignedPodId?: string;
}

export interface SpecScope {
  in: string[];
  out: string[];
}

export interface SpecConstraints {
  always: string[];      // always-do actions
  askFirst: string[];    // ask before doing
  never: string[];       // never-do actions
}

export interface PodSpecSection {
  podId: string;
  responsibility: string;
  vcIds: string[];       // VC IDs this pod is accountable for
}

export interface MissionSpec {
  id: string;
  version: string;
  createdAt: number;
  mission: string;
  outcomes: string[];
  scope: SpecScope;
  constraints: SpecConstraints;
  assumptions: string[];
  priorDecisions: string[];
  verificationCriteria: VerificationCriterion[];
  podSections: PodSpecSection[];
  status: SpecStatus;
}

export interface VCResult {
  id: string;
  status: VCStatus;
  evidence: string;      // direct quote from pod output
  gap: string;           // what's missing if failed/partial
  satisfiedBy: string;   // pod id
}

export interface SpecViolation {
  type: SpecViolationType;
  description: string;
  podId: string;
  severity: 'critical' | 'major' | 'minor';
}

export interface SpecUpdate {
  section: string;
  suggestion: string;
  rationale: string;
}

export interface VerificationResult {
  overallCompliance: number;   // 0.0–1.0
  vcResults: VCResult[];
  violations: SpecViolation[];
  specUpdates: SpecUpdate[];
  verifiedAt: number;
}

// ── App types ─────────────────────────────────────────────────────────────────

export type AppPhase =
  | 'idle'
  | 'spec_drafting'
  | 'deploying'
  | 'executing'
  | 'verifying'
  | 'synthesis'
  | 'complete'
  | 'error';

export type PodStatus = 'queued' | 'waiting' | 'running' | 'completed' | 'failed';

export type MessageType = 'broadcast' | 'signal' | 'aligned' | 'risk' | 'spec_ref' | 'spec_conflict' | 'system' | 'report' | 'directive';

export type Priority = 'critical' | 'high' | 'medium' | 'low';

export type Complexity = 'low' | 'medium' | 'high' | 'critical';

export type ResourceStatus = 'available' | 'unknown' | 'required' | 'missing';

export interface PodBlueprint {
  id: string;
  name: string;
  role: string;
  priority: Priority;
  dependencies: string[];
  deliverable: string;
  context: string;
  vcIds: string[];         // assigned verification criteria
  responsibility: string;  // spec-level responsibility statement
}

export interface LogEntry {
  timestamp: number;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
}

export interface Pod extends PodBlueprint {
  status: PodStatus;
  output: string;
  logs: LogEntry[];
  startTime?: number;
  endTime?: number;
  retries: number;
  usedProvider?: string;
  vcCompliance?: Record<string, VCStatus>; // VC-001 → passed/failed/partial
}

export interface BusMessage {
  id: string;
  timestamp: number;
  from: string;
  to: string;
  type: MessageType;
  content: string;
}

export interface ResourceItem {
  name: string;
  status: ResourceStatus;
  notes: string;
}

export interface DiscoveryResult {
  analysis: string;
  resources: ResourceItem[];
  risks: string[];
  questions: string[];
  pods: PodBlueprint[];
  complexity: Complexity;
  estimatedDuration: string;
}

export interface CoordinationResult {
  misalignments: Array<{ pods: string[]; issue: string; resolution: string }>;
  corrections: Array<{ podId: string; task: string }>;
}

export interface SynthesisResult {
  summary: string;
  deliverables: string[];
  roadmap: string[];
  risks: string[];
  nextSteps: string[];
  fullReport: string;
  specComplianceSummary: string;
}

export type ActivityAction =
  | 'spec_drafted'
  | 'pod_started'
  | 'pod_completed'
  | 'pod_failed'
  | 'manager_directive'
  | 'verification_result'
  | 'coordination_correction'
  | 'synthesis_complete';

export interface ActivityLogEntry {
  id: string;
  timestamp: number;
  agentId: string;        // 'nexus-manager', 'pod:research_pod', 'nexus-verifier'
  agentName: string;      // human readable label
  phase: AppPhase;
  action: ActivityAction;
  missionPortion: string; // what part of the mission this covers
  reasoning: string;      // the logic that led to this action
  details?: string;       // extra context, VC refs, etc.
}

export interface NexusState {
  phase: AppPhase;
  mission: string;
  sessionId: string;
  spec: MissionSpec | null;
  discovery: DiscoveryResult | null;
  pods: Pod[];
  bus: BusMessage[];
  verification: VerificationResult | null;
  coordination: CoordinationResult | null;
  synthesis: SynthesisResult | null;
  activityLog: ActivityLogEntry[];
  error: string | null;
  startTime: number | null;
}
