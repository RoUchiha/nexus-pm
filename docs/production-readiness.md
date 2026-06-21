# Production Readiness and Security Controls

This is the source of truth for the deployable NEXUS security posture.

## Trust boundaries

- Mission text, model output, connector metadata, worker submissions, and bus messages are untrusted.
- Cloud-provider and connector secrets are server-only. The browser may collect a connector credential for one enrollment request, then replaces it with an opaque vault reference.
- Local Ollama is the only direct browser provider and is restricted to the exact loopback origins on port `11434`.
- Every managed API call requires a verified Clerk session. Tenant keys use the active organization ID, falling back to a user-isolated tenant when no organization is active.

## Implemented controls

- `/api/llm` verifies the JWT signature and authorized party before resolving an allowlisted provider and server environment secret.
- Upstash Redis atomically enforces per-tenant minute, daily, and concurrent provider limits. Missing Redis configuration fails closed.
- Remote provider identifiers, models, prompts, message counts, message lengths, timeouts, and response sizes are bounded.
- Provider retries are transactional: failed attempts publish no partial output, and malformed or empty streams fail.
- Connector endpoints must be HTTPS and match `CONNECTOR_ALLOWED_HOSTS`. Credentials are encrypted with tenant-bound AES-256-GCM before Redis storage.
- Security events contain allowlisted metadata only, carry correlation IDs, are retained per tenant for 90 days, and are also emitted as structured platform logs.
- Model plans are limited to eight pods, DAG-validated, and executed with at most four concurrent pods.
- Abort is terminal, and manager wave-review failure stops downstream execution.
- Vercel response headers enforce CSP `frame-ancestors 'none'`, X-Frame-Options, nosniff, referrer policy, permissions policy, COOP/CORP, and HSTS.
- Source maps are off by default; secret files and common credential formats are ignored.
- CI uses immutable action SHAs and gates secret scanning, lint, formatting, client/server type checks, adversarial tests, dependency audit, and build.

## Required production configuration

Use `.env.example` as the inventory. Production requires:

- `VITE_CLERK_PUBLISHABLE_KEY`, `CLERK_JWT_KEY`, and `CLERK_AUTHORIZED_PARTIES`.
- `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.
- A 32-byte base64 `CONNECTOR_VAULT_KEY` and explicit `CONNECTOR_ALLOWED_HOSTS`.
- Only the approved server-side provider keys.

Do not place secrets in any `VITE_*` variable.

## Release gate

```bash
npm.cmd run check
npm.cmd run audit
git diff --check
```

The deployment must also pass authenticated provider and connector-vault integration tests against non-production accounts, header verification, cross-origin framing denial, runtime-log review, quota tests, and restore/failover exercises.

## Remaining scale work

The synchronous broker is suitable for bounded interactive missions. Large-company asynchronous workloads still need a durable queue, idempotency keys, leases, dead-letter handling, regional failover, formal RBAC permission mapping, SLO alerts, and load tests against the selected production plan. Those controls cannot be truthfully validated without provisioned identity, Redis, provider, and deployment environments.
