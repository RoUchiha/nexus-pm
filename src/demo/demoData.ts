import type {
  MissionSpec, DiscoveryResult, VerificationResult,
  CoordinationResult, SynthesisResult, BusMessage,
} from '../types';

export const DEMO_MISSION = 'Build a real-time collaborative project tracking dashboard for remote engineering teams';

// ── Spec + Discovery ──────────────────────────────────────────────────────────

export const DEMO_SPEC: MissionSpec = {
  id: 'spec_demo_001',
  version: '1.0.0',
  createdAt: Date.now(),
  mission: DEMO_MISSION,
  outcomes: [
    'Deliver a web-based dashboard where engineers can view task status updated within 500ms of changes',
    'Implement role-based access with team lead and contributor permission tiers',
    'Provide WebSocket-backed real-time sync across all connected clients simultaneously',
    'Include a REST API with full CRUD for projects, tasks, and team assignments',
    'Ship with a documented onboarding flow that gets a new user to first task in under 2 minutes',
  ],
  scope: {
    in: [
      'Dashboard UI (React, TypeScript)',
      'REST API (projects, tasks, users, teams)',
      'WebSocket real-time sync layer',
      'Role-based access control (RBAC)',
      'PostgreSQL data model',
      'Onboarding flow design',
    ],
    out: [
      'Mobile native apps (iOS/Android)',
      'Third-party integrations (Jira, GitHub, Slack)',
      'Payment or billing system',
      'AI features or predictive analytics',
      'Self-hosted deployment infrastructure',
    ],
  },
  constraints: {
    always: [
      'Use TypeScript strict mode throughout — no `any` types',
      'Validate all API inputs at the boundary with Zod schemas',
      'Return standardized JSON error envelopes: { error: { code, message, details } }',
      'Emit WebSocket events within 200ms of a database write',
    ],
    askFirst: [
      'Adopting a new third-party library not in the approved stack',
      'Changing the database schema after initial migration is written',
      'Altering the WebSocket event contract after it is published',
    ],
    never: [
      'Store plain-text passwords — always bcrypt with cost ≥12',
      'Expose database IDs in public API responses — use UUIDs',
      'Allow cross-tenant data access under any circumstances',
      'Skip input sanitization on user-supplied content',
    ],
  },
  assumptions: [
    'Target browsers: Chrome/Firefox/Safari latest two versions',
    'Deployment environment has Node.js 20+ and PostgreSQL 15+',
    'Team size: 2–50 engineers per organization',
    'Expected concurrent users per organization: up to 100',
  ],
  priorDecisions: [
    'React 18 + Vite for the frontend (established preference)',
    'Fastify for the API server (performance, TypeScript-first)',
    'PostgreSQL with Drizzle ORM (type-safe queries)',
    'JWT for auth tokens, refresh-token rotation',
  ],
  verificationCriteria: [
    {
      id: 'VC-001',
      description: 'When a task status is updated via the API, all connected dashboard clients shall display the new status within 500ms',
      category: 'functional',
      testable: true,
    },
    {
      id: 'VC-002',
      description: 'When a contributor attempts to access team management routes, the API shall return HTTP 403 with error code FORBIDDEN',
      category: 'constraint',
      testable: true,
    },
    {
      id: 'VC-003',
      description: 'The REST API shall expose endpoints for CREATE, READ, UPDATE, DELETE on projects, tasks, and user-team assignments',
      category: 'functional',
      testable: true,
    },
    {
      id: 'VC-004',
      description: 'When a new user completes onboarding, they shall reach their first created task within 3 UI steps and under 2 minutes',
      category: 'quality',
      testable: true,
    },
    {
      id: 'VC-005',
      description: 'The WebSocket connection shall reconnect automatically within 3 seconds of a network interruption',
      category: 'quality',
      testable: true,
    },
    {
      id: 'VC-006',
      description: 'All API endpoints that accept user input shall validate the request body against a Zod schema and return structured errors on validation failure',
      category: 'constraint',
      testable: true,
    },
  ],
  podSections: [
    { podId: 'backend_api', responsibility: 'REST API, data model, auth, RBAC', vcIds: ['VC-002', 'VC-003', 'VC-006'] },
    { podId: 'realtime_engine', responsibility: 'WebSocket layer, event broadcasting, reconnection', vcIds: ['VC-001', 'VC-005'] },
    { podId: 'frontend_ui', responsibility: 'Dashboard UI, task views, onboarding flow', vcIds: ['VC-004'] },
    { podId: 'integration_qa', responsibility: 'Cross-system integration verification, E2E contract validation', vcIds: ['VC-001', 'VC-002', 'VC-003', 'VC-005'] },
  ],
  status: 'active',
};

export const DEMO_DISCOVERY: DiscoveryResult = {
  analysis: 'This is a well-scoped real-time collaboration system. The core complexity lies in the WebSocket event propagation guarantees and the RBAC enforcement boundary. The frontend depends on both the API contract and the WebSocket event schema, creating a clear 3-wave execution order. The integration pod provides the cross-cutting validation layer.',
  resources: [
    { name: 'React 18 + TypeScript', status: 'available', notes: 'Established frontend stack' },
    { name: 'Fastify + Drizzle ORM', status: 'available', notes: 'Approved backend stack' },
    { name: 'PostgreSQL 15', status: 'required', notes: 'Must be provisioned in target environment' },
    { name: 'WebSocket server (ws library)', status: 'available', notes: 'Available via npm, compatible with Fastify' },
    { name: 'Zod validation library', status: 'available', notes: 'Required by constraints — already in approved stack' },
  ],
  risks: [
    'WebSocket broadcast latency may exceed 500ms under high concurrent write load — load testing required',
    'JWT refresh-token rotation needs careful concurrency handling to avoid race conditions on simultaneous requests',
    'Onboarding 3-step target is aggressive — requires UX validation with real users',
  ],
  questions: [
    'Should WebSocket connections be scoped per-organization or per-project for scalability?',
    'Is the 500ms latency guarantee measured client-to-client or server-to-client?',
    'Should the onboarding flow persist partial state if the user exits mid-flow?',
  ],
  pods: [
    {
      id: 'backend_api',
      name: 'Backend API Pod',
      role: 'Senior Backend Engineer — REST API, PostgreSQL, Auth',
      priority: 'critical',
      dependencies: [],
      deliverable: 'Complete Fastify API with Drizzle ORM schema, RBAC middleware, JWT auth, Zod validation, and all CRUD endpoints for projects/tasks/teams',
      context: 'Design the full backend layer. Focus on type-safety, the RBAC enforcement pattern, and Zod schema validation on every route.',
      responsibility: 'REST API, data model, auth, RBAC',
      vcIds: ['VC-002', 'VC-003', 'VC-006'],
    },
    {
      id: 'realtime_engine',
      name: 'Realtime Engine Pod',
      role: 'Senior Backend Engineer — WebSocket, Event Systems, Reliability',
      priority: 'critical',
      dependencies: [],
      deliverable: 'WebSocket server with sub-200ms event broadcasting, automatic client reconnection logic, and event schema definition',
      context: 'Design the real-time layer independent of but compatible with the REST API. Define the event schema carefully as it becomes a contract for the frontend.',
      responsibility: 'WebSocket layer, event broadcasting, reconnection',
      vcIds: ['VC-001', 'VC-005'],
    },
    {
      id: 'frontend_ui',
      name: 'Frontend UI Pod',
      role: 'Senior Frontend Engineer — React, TypeScript, UX',
      priority: 'high',
      dependencies: ['backend_api', 'realtime_engine'],
      deliverable: 'React dashboard with live task board, RBAC-aware navigation, onboarding wizard (3-step, <2min), and WebSocket integration hooks',
      context: 'Consume the API and WebSocket contracts from prior pods. Design the onboarding flow to hit the 3-step, 2-minute target.',
      responsibility: 'Dashboard UI, task views, onboarding flow',
      vcIds: ['VC-004'],
    },
    {
      id: 'integration_qa',
      name: 'Integration QA Pod',
      role: 'Senior QA Engineer — Integration Testing, Contract Validation',
      priority: 'high',
      dependencies: ['frontend_ui'],
      deliverable: 'Integration test plan validating WebSocket latency, RBAC enforcement, API contract completeness, and reconnection behavior',
      context: 'Verify the cross-system contracts. Check that the WebSocket events match the API changes, that RBAC is enforced end-to-end, and that the onboarding flow meets the time target.',
      responsibility: 'Cross-system integration verification, E2E contract validation',
      vcIds: ['VC-001', 'VC-002', 'VC-003', 'VC-005'],
    },
  ],
  complexity: 'high',
  estimatedDuration: '25–35 minutes',
};

// ── Pod output scripts ────────────────────────────────────────────────────────

export const DEMO_POD_OUTPUTS: Record<string, string> = {
  backend_api: `# Backend API — Implementation Plan

## Data Model (Drizzle ORM + PostgreSQL)

I'll define the core schema first, as all CRUD endpoints depend on it.

\`\`\`typescript
// schema.ts
import { pgTable, uuid, varchar, text, timestamp, pgEnum } from 'drizzle-orm/pg-core';

export const roleEnum = pgEnum('role', ['team_lead', 'contributor']);

export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  role: roleEnum('role').notNull().default('contributor'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const tasks = pgTable('tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  assigneeId: uuid('assignee_id').references(() => users.id),
  title: varchar('title', { length: 512 }).notNull(),
  status: varchar('status', { length: 64 }).notNull().default('todo'),
  updatedAt: timestamp('updated_at').defaultNow(),
});
\`\`\`

[VC-REF: VC-003]: Schema defines entities for projects, tasks, and user-team assignments — all CRUD endpoints will map to these tables. UUID primary keys prevent ID enumeration per constraints.

## RBAC Middleware

[BROADCAST]: Defining RBAC pattern as a Fastify preHandler hook — frontend and integration pods should assume this is applied at the route level, not inline.

\`\`\`typescript
// middleware/rbac.ts
import type { FastifyRequest, FastifyReply } from 'fastify';

export function requireRole(minRole: 'team_lead' | 'contributor') {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    const user = req.user; // set by JWT verify hook
    if (!user) return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });

    const roleWeight = { team_lead: 2, contributor: 1 };
    if (roleWeight[user.role] < roleWeight[minRole]) {
      return reply.status(403).send({
        error: { code: 'FORBIDDEN', message: \`Requires \${minRole} role or higher\` },
      });
    }
  };
}
\`\`\`

[VC-REF: VC-002]: RBAC middleware returns HTTP 403 with code FORBIDDEN when contributor accesses team management routes. All /teams/** and /admin/** routes will use requireRole('team_lead').

## Zod Validation

[BROADCAST]: All route schemas published here — realtime engine should use the same task status enum.

\`\`\`typescript
// schemas/tasks.ts
import { z } from 'zod';

export const TaskStatusEnum = z.enum(['todo', 'in_progress', 'in_review', 'done', 'blocked']);

export const CreateTaskSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().min(1).max(512),
  assigneeId: z.string().uuid().optional(),
  status: TaskStatusEnum.default('todo'),
});

export const UpdateTaskSchema = CreateTaskSchema.partial().extend({
  id: z.string().uuid(),
});
\`\`\`

[VC-REF: VC-006]: Every route validates request body against a Zod schema. On failure, Fastify returns structured error: { error: { code: 'VALIDATION_ERROR', message: '...', details: zodError.issues } }

[REPORT→NEXUS]: Backend API core is complete. Schema, RBAC, and Zod validation are in place. All 3 assigned VCs addressed. Event emission hook is needed — I'll emit a 'task.updated' event after every successful task mutation for the realtime engine to pick up.

## REST Endpoints Summary

| Method | Path | Auth | Role |
|--------|------|------|------|
| POST | /auth/login | none | any |
| GET | /projects | JWT | contributor+ |
| POST | /projects | JWT | team_lead |
| GET | /projects/:id/tasks | JWT | contributor+ |
| POST | /tasks | JWT | contributor+ |
| PATCH | /tasks/:id | JWT | contributor+ |
| DELETE | /tasks/:id | JWT | team_lead |
| GET | /teams | JWT | contributor+ |
| POST | /teams/:id/members | JWT | team_lead |
| DELETE | /teams/:id/members/:userId | JWT | team_lead |

[VC-REF: VC-003]: All CRUD operations for projects, tasks, and team assignments are covered above.`,

  realtime_engine: `# Realtime Engine — WebSocket Architecture

## Event Schema (published contract)

[BROADCAST]: WebSocket event contract below — frontend_ui MUST consume events in this exact shape. Do not change without flagging [SPEC-CONFLICT].

\`\`\`typescript
// events/schema.ts
export type WsEventType =
  | 'task.created'
  | 'task.updated'
  | 'task.deleted'
  | 'project.created'
  | 'project.updated'
  | 'member.added'
  | 'member.removed'
  | 'connection.ack'
  | 'connection.error';

export interface WsEvent<T = unknown> {
  type: WsEventType;
  orgId: string;       // tenant scope — never cross-org broadcast
  payload: T;
  timestamp: number;   // server UTC ms
  eventId: string;     // uuid for dedup
}

export interface TaskUpdatedPayload {
  taskId: string;
  projectId: string;
  changes: Partial<{ title: string; status: string; assigneeId: string }>;
  actorId: string;
}
\`\`\`

[VC-REF: VC-001]: Server emits task.updated event immediately after DB write (via Fastify lifecycle hook). Benchmarked broadcast latency at 80–120ms on localhost; 150–300ms p99 under 50 concurrent writers.

## Server Architecture

\`\`\`typescript
// ws/server.ts
import { WebSocketServer } from 'ws';
import { v4 as uuid } from 'uuid';

// org-scoped connection registry
const orgClients = new Map<string, Set<WebSocket>>();

export function broadcastToOrg(orgId: string, event: WsEvent): void {
  const clients = orgClients.get(orgId);
  if (!clients) return;
  const payload = JSON.stringify(event);
  for (const client of clients) {
    if (client.readyState === client.OPEN) {
      client.send(payload);
    }
  }
}

export function registerClient(ws: WebSocket, orgId: string): void {
  if (!orgClients.has(orgId)) orgClients.set(orgId, new Set());
  orgClients.get(orgId)!.add(ws);
  ws.send(JSON.stringify({ type: 'connection.ack', orgId, payload: { clientId: uuid() }, timestamp: Date.now(), eventId: uuid() }));
}
\`\`\`

[VC-REF: VC-001]: broadcastToOrg is called synchronously in the Fastify task.update route AFTER the DB commit. This ensures sub-200ms delivery per the always constraint.

## Client Reconnection

[SIGNAL→frontend_ui]: Implement the reconnection hook exactly as specified below — use the exponential backoff with jitter so reconnect storms don't hammer the server after an outage.

\`\`\`typescript
// hooks/useWebSocket.ts (for frontend)
export function useRealtimeConnection(orgId: string, token: string) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<NodeJS.Timeout>();

  const connect = useCallback(() => {
    const ws = new WebSocket(\`wss://api.nexus.app/ws?token=\${token}\`);

    ws.onopen = () => {
      clearTimeout(reconnectTimer.current);
      ws.send(JSON.stringify({ type: 'auth', orgId, token }));
    };

    ws.onclose = () => {
      // Exponential backoff: 1s, 2s, 4s capped at 3s per VC-005
      const delay = Math.min(3000, 1000 * Math.pow(2, attempt));
      reconnectTimer.current = setTimeout(connect, delay);
    };

    wsRef.current = ws;
  }, [orgId, token]);

  useEffect(() => { connect(); return () => wsRef.current?.close(); }, [connect]);
}
\`\`\`

[VC-REF: VC-005]: Reconnection fires within 1 second of connection close. With the 3s cap, worst-case reconnect time is 3s, satisfying the "within 3 seconds" VC.

[ALIGNED]: WebSocket event contract is finalized. frontend_ui should consume task.updated, task.created, task.deleted events. Reconnection hook is published above.

[REPORT→NEXUS]: Realtime engine complete. Published event contract and reconnection hook. VC-001 and VC-005 are addressed. Broadcasting is org-scoped for tenant isolation.`,

  frontend_ui: `# Frontend UI Pod — Dashboard Implementation

## Architecture Overview

With the backend API (REST + RBAC) and realtime engine (WebSocket contract) complete, I'll build the dashboard layer.

[BROADCAST]: Using React Query for server state + the useRealtimeConnection hook from realtime_engine for live sync. All components are RBAC-aware via a usePermissions hook.

## RBAC-Aware Navigation

\`\`\`typescript
// hooks/usePermissions.ts
export function usePermissions() {
  const { user } = useAuthContext();
  return {
    canManageTeam: user?.role === 'team_lead',
    canDeleteTask: user?.role === 'team_lead',
    canCreateProject: user?.role === 'team_lead',
  };
}

// components/Sidebar.tsx
export function Sidebar() {
  const { canManageTeam, canCreateProject } = usePermissions();
  return (
    <nav>
      <NavItem to="/dashboard" icon={<GridIcon />} label="Dashboard" />
      <NavItem to="/projects" icon={<FolderIcon />} label="Projects" />
      {canManageTeam && <NavItem to="/team" icon={<UsersIcon />} label="Team" />}
      {canCreateProject && <NavItem to="/projects/new" icon={<PlusIcon />} label="New Project" />}
    </nav>
  );
}
\`\`\`

## Live Task Board

\`\`\`typescript
// components/TaskBoard.tsx
export function TaskBoard({ projectId }: { projectId: string }) {
  const { data: tasks, refetch } = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: () => api.getTasks(projectId),
  });

  // Subscribe to realtime updates — invalidate React Query cache on change
  useRealtimeEvent('task.updated', (event) => {
    if (event.payload.projectId === projectId) refetch();
  });
  useRealtimeEvent('task.created', () => refetch());
  useRealtimeEvent('task.deleted', () => refetch());

  const columns = ['todo', 'in_progress', 'in_review', 'done'];
  return (
    <div className="task-board">
      {columns.map(status => (
        <TaskColumn
          key={status}
          status={status}
          tasks={tasks?.filter(t => t.status === status) ?? []}
        />
      ))}
    </div>
  );
}
\`\`\`

[VC-REF: VC-001]: TaskBoard subscribes to realtime events and immediately refetches. Since the WebSocket event arrives within 200ms of the DB write (VC-001 from realtime_engine), the UI update latency is 200ms + React Query refetch time (~50ms) = ~250ms total. Within the 500ms VC.

## Onboarding Wizard (3-step)

[VC-REF: VC-004]: Onboarding is designed as exactly 3 steps, each pre-filled with sensible defaults to minimize friction. Target completion: under 90 seconds.

\`\`\`typescript
// components/Onboarding.tsx
const STEPS = [
  {
    id: 'workspace',
    title: 'Name your workspace',
    description: 'This is how your team will identify your organization.',
    field: 'orgName',
    placeholder: 'e.g. Acme Engineering',
    autoFocus: true,
  },
  {
    id: 'project',
    title: 'Create your first project',
    description: 'A project groups related tasks together.',
    field: 'projectName',
    placeholder: 'e.g. Q3 Product Roadmap',
  },
  {
    id: 'task',
    title: 'Add your first task',
    description: 'What's the first thing your team needs to do?',
    field: 'taskTitle',
    placeholder: 'e.g. Define technical requirements',
  },
];

export function OnboardingWizard() {
  const [step, setStep] = useState(0);
  const [values, setValues] = useState({ orgName: '', projectName: '', taskTitle: '' });
  const { mutate: finishOnboarding } = useFinishOnboarding();

  const handleNext = () => {
    if (step < STEPS.length - 1) setStep(s => s + 1);
    else finishOnboarding(values); // creates org → project → task in one API call
  };

  return (
    <OnboardingLayout step={step} total={STEPS.length}>
      <StepContent step={STEPS[step]} value={values} onChange={setValues} />
      <Button onClick={handleNext} autoFocus>
        {step < STEPS.length - 1 ? 'Continue →' : 'Launch Dashboard'}
      </Button>
    </OnboardingLayout>
  );
}
\`\`\`

[ALIGNED]: Frontend consumes the realtime_engine reconnection hook as published. No deviations from the agreed WebSocket event contract.

[REPORT→NEXUS]: Frontend complete. Dashboard, RBAC navigation, live task board, and 3-step onboarding all implemented. VC-004 addressed with 3-step wizard completing in under 90s.`,

  integration_qa: `# Integration QA Pod — Cross-System Validation

## Test Plan Overview

Having reviewed all three pod outputs, I'll validate the cross-system contracts and VC compliance.

## VC-001: Real-Time Latency (≤500ms)

[VC-REF: VC-001]: E2E latency budget analysis:
- DB write → WebSocket emit: 80–120ms (realtime_engine benchmark)
- WebSocket transit: 10–50ms (LAN/datacenter)
- React Query refetch: ~50ms (frontend_ui analysis)
- DOM update: ~16ms (single render frame)
- **Total: ~156–236ms** — well within the 500ms VC.

**Test: task_latency_e2e.test.ts**
\`\`\`typescript
it('should propagate task.updated to all clients within 500ms', async () => {
  const start = performance.now();
  const received = new Promise<void>(resolve => {
    clientB.ws.on('message', (data) => {
      const event = JSON.parse(data.toString());
      if (event.type === 'task.updated' && event.payload.taskId === task.id) resolve();
    });
  });
  await api.patch(\`/tasks/\${task.id}\`, { status: 'in_progress' }, { headers: { Authorization: tokenA } });
  await received;
  expect(performance.now() - start).toBeLessThan(500);
});
\`\`\`

## VC-002: RBAC Enforcement

[VC-REF: VC-002]: Backend API implements requireRole('team_lead') on all /teams/** routes.

**Test: rbac.test.ts**
\`\`\`typescript
it('contributor cannot access team management routes', async () => {
  const res = await api.post('/teams/123/members', { userId: 'abc' }, {
    headers: { Authorization: contributorToken },
  });
  expect(res.status).toBe(403);
  expect(res.data.error.code).toBe('FORBIDDEN');
});
\`\`\`

## VC-005: WebSocket Reconnection

[VC-REF: VC-005]: Frontend useRealtimeConnection implements reconnect with max delay of 3s per realtime_engine specification.

**Test: reconnection.test.ts**
\`\`\`typescript
it('client reconnects within 3 seconds of network interruption', async () => {
  const reconnectTime = await measureReconnect(client);
  expect(reconnectTime).toBeLessThan(3000);
});
\`\`\`

## VC-003: CRUD Completeness

[VC-REF: VC-003]: Backend API endpoint table shows all required operations present.
✓ Projects: GET list, POST create (team_lead), PATCH update, DELETE (team_lead)
✓ Tasks: GET list, POST create, PATCH update (status, assignee, title), DELETE (team_lead)
✓ Team assignments: GET members, POST add (team_lead), DELETE remove (team_lead)

## Identified Issues

[RISK]: VC-001 — The 500ms guarantee assumes the WebSocket server and API server are co-located. If deployed cross-region, p99 latency could exceed 500ms. Recommend adding a latency SLO caveat to the spec.

[BROADCAST]: All integration contracts are consistent across pods. No schema mismatches detected between the Zod schemas (backend_api) and the WebSocket event payloads (realtime_engine). Frontend consumes both correctly.

[ALIGNED]: Integration validation complete. Cross-pod contracts are coherent. The only open concern is the cross-region latency edge case flagged above.

[REPORT→NEXUS]: Integration QA complete. All 4 assigned VCs verified with test code. One risk flagged: cross-region deployment may affect VC-001 latency guarantees. Suggest spec update noting this constraint.`,
};

// ── Manager wave check result ─────────────────────────────────────────────────

export const DEMO_WAVE_CHECK_DIRECTIVES: BusMessage[] = [
  {
    id: 'wave_dir_001',
    timestamp: Date.now(),
    from: 'nexus-manager',
    to: 'frontend_ui',
    type: 'directive',
    content: 'Consume the WebSocket reconnection hook exactly as published by realtime_engine — do not implement a custom reconnection strategy. Reason: realtime_engine has validated the backoff timing against VC-005.',
  },
  {
    id: 'wave_dir_002',
    timestamp: Date.now(),
    from: 'nexus-manager',
    to: 'frontend_ui',
    type: 'directive',
    content: 'Use the TaskStatusEnum exported from backend_api schemas/tasks.ts rather than a local string union — ensures type-safety and consistency with the Zod validation layer. Reason: type drift between frontend and backend is a common integration failure point.',
  },
];

// ── Verification ──────────────────────────────────────────────────────────────

export const DEMO_VERIFICATION: VerificationResult = {
  overallCompliance: 0.875,
  vcResults: [
    {
      id: 'VC-001',
      status: 'passed',
      evidence: 'realtime_engine: "Benchmarked broadcast latency at 80–120ms on localhost; 150–300ms p99 under 50 concurrent writers." integration_qa confirms E2E budget of 156–236ms.',
      gap: '',
      satisfiedBy: 'realtime_engine',
    },
    {
      id: 'VC-002',
      status: 'passed',
      evidence: 'backend_api: requireRole middleware returns HTTP 403 with code FORBIDDEN. integration_qa provides explicit test validating this contract.',
      gap: '',
      satisfiedBy: 'backend_api',
    },
    {
      id: 'VC-003',
      status: 'passed',
      evidence: 'backend_api endpoint table lists all CRUD operations for projects, tasks, and team assignments. integration_qa independently confirms completeness.',
      gap: '',
      satisfiedBy: 'backend_api',
    },
    {
      id: 'VC-004',
      status: 'passed',
      evidence: 'frontend_ui: 3-step OnboardingWizard with auto-focused fields and pre-filled defaults. Estimated completion under 90 seconds per design.',
      gap: '',
      satisfiedBy: 'frontend_ui',
    },
    {
      id: 'VC-005',
      status: 'passed',
      evidence: 'realtime_engine: reconnection fires within 1s, capped at 3s max delay. frontend_ui consumes the hook exactly. integration_qa provides reconnection timing test.',
      gap: '',
      satisfiedBy: 'realtime_engine',
    },
    {
      id: 'VC-006',
      status: 'partial',
      evidence: 'backend_api shows Zod schemas for task creation/update. However, there is no explicit evidence that /auth/login and /projects endpoints are also validated.',
      gap: 'Zod validation coverage is demonstrated for task routes but not confirmed for all API endpoints. Auth and project routes may lack validation.',
      satisfiedBy: 'backend_api',
    },
  ],
  violations: [
    {
      type: 'missing_vc',
      description: 'VC-006 is only partially evidenced — auth and project route validation is not shown in backend_api output.',
      podId: 'backend_api',
      severity: 'minor',
    },
  ],
  specUpdates: [
    {
      section: 'verificationCriteria',
      suggestion: 'Clarify VC-001 with a note: "Latency guarantee applies to same-region deployments; cross-region deployments should target best-effort with a documented SLO."',
      rationale: 'integration_qa flagged that cross-region deployment may exceed 500ms. The VC as written is ambiguous about deployment topology.',
    },
  ],
  verifiedAt: Date.now(),
};

// ── Coordination ──────────────────────────────────────────────────────────────

export const DEMO_COORDINATION: CoordinationResult = {
  misalignments: [
    {
      pods: ['backend_api', 'realtime_engine'],
      issue: 'backend_api emits task.updated via a Fastify lifecycle hook but the hook integration point is not explicitly shown. The realtime_engine assumes synchronous emission after DB commit.',
      resolution: 'backend_api should add explicit emit call in the route handler after db.update(), not rely on a lifecycle hook, to guarantee ordering.',
    },
  ],
  corrections: [
    {
      podId: 'backend_api',
      task: 'Add explicit broadcastToOrg(task.orgId, { type: "task.updated", ... }) call after db.update() in PATCH /tasks/:id handler to ensure realtime emission happens synchronously post-commit [VC-001]',
    },
  ],
};

// ── Synthesis ─────────────────────────────────────────────────────────────────

export const DEMO_SYNTHESIS: SynthesisResult = {
  summary: 'NEXUS delivered a comprehensive architecture for a real-time collaborative project tracking dashboard achieving 87.5% spec compliance across 6 verification criteria. Five VCs passed fully; VC-006 (Zod validation coverage) is partial pending confirmation that auth and project routes are covered. One coordination correction was issued to ensure synchronous WebSocket emission after database commits.',
  deliverables: [
    'PostgreSQL schema with Drizzle ORM (organizations, users, projects, tasks)',
    'Fastify REST API with RBAC middleware and JWT auth (10 endpoints, all CRUD operations covered)',
    'Zod validation schemas for task routes (VC-006 partial — auth/project routes need confirmation)',
    'WebSocket server with org-scoped broadcast registry and sub-200ms event delivery',
    'Client reconnection hook with exponential backoff (1s initial, 3s cap)',
    'React dashboard with live task board (React Query + WebSocket integration)',
    'RBAC-aware navigation (team_lead vs contributor permission tiers)',
    '3-step onboarding wizard targeting sub-90-second first-task creation',
    'Integration test plan covering VC-001, VC-002, VC-003, VC-005',
  ],
  roadmap: [
    '1. Apply coordination correction: add explicit broadcastToOrg() call in PATCH /tasks handler',
    '2. Extend Zod validation to /auth/login and all /projects routes to fully satisfy VC-006',
    '3. Add load test for WebSocket broadcast latency under 50+ concurrent writers (VC-001 SLO validation)',
    '4. Conduct UX walkthrough of onboarding wizard to validate sub-2-minute target with real users',
    '5. Add JWT refresh-token rotation with concurrency guard (identified in discovery risks)',
    '6. Document WebSocket event contract as versioned API spec for future consumers',
    '7. Provision PostgreSQL 15 in target deployment environment with connection pooling (PgBouncer)',
    '8. Set up CI pipeline with integration tests from integration_qa pod',
  ],
  risks: [
    'Cross-region deployment may push VC-001 latency above 500ms — spec update recommended per verifier',
    'JWT refresh-token race condition under simultaneous requests — requires careful concurrency testing',
    'Onboarding 3-step target needs user testing — currently estimated at <90s but unvalidated',
    'VC-006 partial compliance — auth route validation coverage gap needs immediate remediation',
  ],
  nextSteps: [
    'Implement coordination correction (broadcastToOrg in route handler) — 30 minutes',
    'Add Zod schemas to remaining routes — 1–2 hours',
    'Run integration test suite from integration_qa pod output — validates VC-001, VC-002, VC-003, VC-005',
    'Schedule UX review for onboarding wizard — 1 day',
  ],
  fullReport: `# NEXUS Mission Report — Real-Time Collaborative Dashboard

## Executive Summary

The NEXUS fleet executed a 4-pod, 3-wave mission to architect a real-time collaborative project tracking dashboard. Overall spec compliance is **87.5%** (5.5/6 VCs satisfied). The system is ready for implementation with one coordination correction and one open VC remediation required.

## Spec Compliance

| VC | Description | Status | Owner |
|----|-------------|--------|-------|
| VC-001 | ≤500ms task update propagation | ✅ PASSED | realtime_engine |
| VC-002 | 403 FORBIDDEN on contributor team access | ✅ PASSED | backend_api |
| VC-003 | Full CRUD for projects/tasks/teams | ✅ PASSED | backend_api |
| VC-004 | 3-step onboarding, <2 min | ✅ PASSED | frontend_ui |
| VC-005 | Reconnect within 3 seconds | ✅ PASSED | realtime_engine |
| VC-006 | Zod validation on all API inputs | ⚠️ PARTIAL | backend_api |

## Architecture Decisions

- **Org-scoped WebSocket registry** prevents cross-tenant event leakage (supports constraint: never cross-tenant data access)
- **Fastify preHandler RBAC hook** centralizes permission logic — no inline checks in route handlers
- **React Query + WebSocket invalidation** pattern provides a clean separation between cache management and real-time updates
- **3-step onboarding with auto-focus and defaults** minimizes cognitive friction for first-time users

## Open Items

1. **VC-006 gap**: Add Zod validation to /auth and /projects routes
2. **Coordination correction**: Move broadcastToOrg() into route handler body
3. **Cross-region latency**: Update spec to clarify same-region deployment assumption for VC-001

## Risk Register

| Risk | Severity | Mitigation |
|------|----------|------------|
| Cross-region latency > 500ms | Medium | Document deployment topology in spec; add regional SLO |
| JWT refresh race condition | High | Add distributed lock or optimistic version check |
| Onboarding time unvalidated | Low | User testing sprint before launch |
`,
  specComplianceSummary: 'Five of six verification criteria passed in full. VC-001 (real-time latency) was validated by both the realtime_engine pod and independently confirmed by integration_qa with a concrete E2E latency budget of 156–236ms. VC-002 and VC-006 were confirmed with explicit HTTP status codes and test code. VC-004 and VC-005 were addressed with working implementations. VC-006 is partial — Zod validation is demonstrated only on task routes; auth and project endpoints lack evidence. One minor violation was recorded. One spec update suggestion was made regarding cross-region deployment topology.',
};
