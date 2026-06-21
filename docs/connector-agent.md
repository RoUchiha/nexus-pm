# Connector Agent

The Connector Agent is NEXUS's governed control plane for LLMs, databases, repositories, remote agents, and APIs. It turns connection metadata into an explicit routing plan while keeping credentials out of storage, logs, model prompts, and browser-origin data-plane calls.

## Supported connection families

- OpenAI-compatible LLM gateways: inference, embeddings, and reranking.
- PostgreSQL and MongoDB brokers: approved reads, writes, and schema discovery.
- GitHub and GitLab: repository access, pull requests, issues, and CI status.
- MCP / agent gateways: tool discovery, delegation, and tool execution.
- Generic REST APIs: approved read and write capabilities.

Definitions live in `src/lib/connectorAgent.ts`; domain contracts live in `src/types/index.ts`; the reducer-style state owner is `src/hooks/useConnectors.ts`.

## Safety model

1. The user enters an HTTPS endpoint, least-privilege scopes, authentication method, and a credential for one enrollment request.
2. The Connector Agent rejects insecure, loopback, link-local, private-network, credential-bearing, or fragment-bearing URLs.
3. Diagnostics show every issue and a concrete remediation sequence. Secret values are never included.
4. The user explicitly approves the connection after reviewing endpoint, scopes, and control mode.
5. Only enabled, approved, routing-ready connectors are exposed to mission planning, and only capability metadata reaches prompts.
6. Supervised routes require operator approval. The operator can steer, pause, resume, or take over.
7. Diagnosis sends the credential only to the same-origin authenticated broker, which encrypts it with tenant-bound AES-256-GCM and returns an opaque vault reference. The browser never directly connects to a database, repository write API, arbitrary agent, or generic API.

Persisted browser configuration is redacted. Server-vaulted credentials remain tenant-scoped; approval and routing state remain explicit.

## Production broker contract

The repository implements authenticated provider, connector diagnosis/vault, and security-event endpoints. The remaining execution control plane should add:

| Endpoint                           | Purpose                                                                                         |
| ---------------------------------- | ----------------------------------------------------------------------------------------------- |
| `POST /api/routes/plan`            | Bind requested capabilities to approved connector and policy versions.                          |
| `POST /api/executions`             | Create an idempotent, policy-checked connector execution. Never accept a raw long-lived secret. |
| `GET /api/executions/:id`          | Stream status, redacted logs, retries, cost, and trace identifiers.                             |
| `POST /api/executions/:id/control` | Approve, reject, pause, resume, steer, retry, or cancel an execution.                           |

Every request should carry organization, project, actor, mission, policy-version, and idempotency identifiers. Credentials should be referenced by vault ID and exchanged for short-lived grants inside the broker.

## Scale and reliability

- Stateless API nodes behind a load balancer.
- Durable queue partitions by organization and connector, with concurrency and budget limits.
- Idempotent workers with leases, exponential backoff, jitter, circuit breakers, and dead-letter queues.
- Tenant-scoped encrypted records and append-only audit events.
- OpenTelemetry traces spanning mission, route, policy decision, provider call, and human intervention.
- Per-connector SLOs, rate limits, spend limits, and kill switches.

This design borrows strong operator patterns from current orchestration products: explicit human fallback in [n8n](https://docs.n8n.io/advanced-ai/examples/human-fallback/), managed credential concepts in [n8n Credentials](https://docs.n8n.io/credentials/), durable/resumable workflow thinking from [LangGraph](https://langchain-ai.github.io/langgraph/concepts/durable_execution/), and centralized agent operations from [CrewAI AMP](https://docs.crewai.com/en/enterprise/introduction).
