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

export type PodStatus = 'queued' | 'waiting' | 'running' | 'reviewing' | 'completed' | 'failed';

export type MessageType = 'broadcast' | 'signal' | 'aligned' | 'risk' | 'spec_ref' | 'spec_conflict' | 'system' | 'report' | 'directive';

export type Priority = 'critical' | 'high' | 'medium' | 'low';

export type Complexity = 'low' | 'medium' | 'high' | 'critical';

export type ResourceStatus = 'available' | 'unknown' | 'required' | 'missing';

export type WorkerMode = 'autonomous' | 'company_workers';

export type WorkerAssignmentStatus =
  | 'unassigned'
  | 'assigned'
  | 'reviewing'
  | 'revision_requested'
  | 'accepted';

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
  assignedWorkerAgentId?: string;
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

export interface WorkerAgentConnection {
  id: string;
  name: string;
  ownerName: string;
  capabilities: string;
  connectionNotes: string;
  enabled: boolean;
  createdAt: number;
}

export interface WorkerDirective {
  targetPodId: string;
  instruction: string;
  reasoning: string;
}

export interface WorkerReviewResult {
  approved: boolean;
  summary: string;
  managerGuidance: string;
  requiredRevisions: string[];
  vcStatus: Record<string, VCStatus>;
  directives: WorkerDirective[];
  busSummary: string;
}

export interface WorkerPodAssignment {
  podId: string;
  workerAgentId?: string;
  status: WorkerAssignmentStatus;
  handoffPrompt?: string;
  submittedOutput?: string;
  review?: WorkerReviewResult;
  createdAt: number;
  assignedAt?: number;
  submittedAt?: number;
  reviewedAt?: number;
}

export interface WorkerRunOptions {
  mode: WorkerMode;
  agents: WorkerAgentConnection[];
  connectors?: ConnectorConfig[];
}

// Connector control plane. Credentials are memory-only and must never be
// persisted, logged, or included in model prompts.
export type ConnectorKind = 'llm' | 'database' | 'repository' | 'agent' | 'api';
export type ConnectorAuthType = 'none' | 'api_key' | 'bearer' | 'oauth2' | 'basic' | 'connection_string';
export type ConnectorStatus = 'draft' | 'checking' | 'ready' | 'degraded' | 'blocked' | 'paused';
export type ConnectorControlMode = 'autonomous' | 'supervised' | 'manual';
export type ConnectorSeverity = 'info' | 'warning' | 'error';

export interface ConnectorDefinition {
  id: string;
  name: string;
  kind: ConnectorKind;
  description: string;
  authTypes: ConnectorAuthType[];
  capabilities: string[];
  serverSideOnly: boolean;
  endpointPlaceholder: string;
  requiredScopes?: string[];
}

export interface ConnectorCredentials {
  apiKey?: string;
  token?: string;
  username?: string;
  password?: string;
  connectionString?: string;
}

export interface ConnectorIssue {
  code: string;
  severity: ConnectorSeverity;
  title: string;
  detail: string;
  remediation: string[];
  retriable: boolean;
}

export interface ConnectorConfig {
  id: string;
  definitionId: string;
  name: string;
  endpoint: string;
  authType: ConnectorAuthType;
  credentials: ConnectorCredentials;
  scopes: string[];
  enabled: boolean;
  approved: boolean;
  controlMode: ConnectorControlMode;
  status: ConnectorStatus;
  issues: ConnectorIssue[];
  diagnostics: string[];
  steeringNotes: string;
  createdAt: number;
  updatedAt: number;
  lastCheckAt?: number;
}

export interface ConnectorRoute {
  capability: string;
  connectorId: string;
  connectorName: string;
  reason: string;
  requiresApproval: boolean;
}

export interface ConnectorRoutingPlan {
  routes: ConnectorRoute[];
  unresolvedCapabilities: string[];
  generatedAt: number;
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
  | 'worker_agent_claimed'
  | 'worker_submission_received'
  | 'worker_submission_approved'
  | 'worker_revision_requested'
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
  workerMode: WorkerMode;
  workerAgents: WorkerAgentConnection[];
  workerAssignments: WorkerPodAssignment[];
  activityLog: ActivityLogEntry[];
  error: string | null;
  startTime: number | null;
}
