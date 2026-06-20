# Security Assessment - 2026-06-20

## Executive result

The reviewed browser application is materially safer after this pass and passed automated unit, build, dependency, and production-browser checks. It is suitable for demos and controlled non-regulated use with user-owned provider keys. It is **not yet a complete enterprise production system** because the current GitHub Pages architecture has no server-side identity, tenant boundary, secret vault, policy broker, durable queue, or append-only audit service.

## Scope and methods

- Manual trust-boundary and data-flow review across providers, storage, prompts, orchestration, worker review, message bus, CSP, and deployment workflow.
- Adversarial static review for XSS sinks, secret persistence, SSRF/local-network access, prompt injection, malformed model output, race conditions, unbounded resource consumption, and dependency exposure.
- 32 automated tests covering endpoint bypass payloads, redaction, routing, approval gates, cyclic/invalid DAGs, malformed JSON, and split-stream bus messages.
- Production Chrome test with dummy GitHub connection covering add, edit, credential entry, diagnose, approve, route, pause, resume, reload redaction, 390px viewport, full demo mission, console errors, and failed responses.
- `npm audit --audit-level=moderate`, TypeScript check, production build, and whitespace validation.

No destructive testing targeted third-party systems. Provider/network behavior was tested with local mocks, deterministic logic, and dummy data.

## Findings

| Severity | Finding | Result |
| --- | --- | --- |
| High | Provider requests and stream reads could hang indefinitely; retry delays trusted unbounded `Retry-After` values. | Fixed with 60-second request/idle timeouts, abort-aware waits, and a 30-second retry cap. |
| High | Provider streams could grow without bound and exhaust browser memory. | Fixed with a one-million-character response ceiling. |
| High | Model-generated pod DAGs and verification assignments were trusted after JSON parsing. Malformed, cyclic, duplicate, or unknown dependencies could corrupt execution. | Fixed with strict runtime plan validation before state construction. |
| High | A naive generic connector implementation would create an SSRF/local-network pivot and leak production credentials into the browser. | Prevented: public HTTPS policy, private/loopback blocking, no direct connector fetch, redacted persistence, and a mandatory server-broker boundary. |
| Medium | Worker submissions could trigger overlapping manager reviews through rapid duplicate submission. | Fixed with a per-pod in-flight review guard. |
| Medium | Bus protocol tags split across streamed chunks could be silently lost. | Fixed by parsing bounded accumulated output in live and demo execution. |
| Medium | Greedy JSON extraction could capture unrelated trailing objects or malformed mixed output. | Fixed with balanced, string-aware object extraction and fenced-JSON preference. |
| Medium | `frame-ancestors` was present in meta CSP even though browsers ignore that directive in meta tags. | Ineffective directive removed; response-header requirement documented. GitHub Pages remains unable to set the required repository-level header. |
| Low | Provider and mission summary rows overflowed on mobile widths. | Fixed and verified at 390px. |

## Residual enterprise risks

1. Provider keys still exist in browser memory and are exposed to any successful same-origin script execution. Move them to a server-side vault/broker.
2. There is no organization authentication, RBAC/ABAC, tenant isolation, SSO, SCIM, or break-glass control.
3. Mission state is not durable. Browser closure, crashes, and deployments cannot safely resume production workflows.
4. Audit data is neither append-only nor centrally retained, signed, exported, or queryable.
5. GitHub Pages cannot set clickjacking and other response headers. Use an enterprise host/CDN that supports headers.
6. `style-src 'unsafe-inline'` remains necessary because the UI uses inline React styles. Refactor styles and move to CSP hashes/nonces.
7. DNS resolution and redirect targets must be revalidated in the future broker to stop DNS rebinding and redirect-based SSRF.
8. CI actions use release tags rather than immutable commit SHAs. Pin them for a higher-assurance supply-chain posture.
9. Real provider conformance, rate-limit, billing, and failover tests require controlled test accounts and cannot be proven with dummy credentials.

## Release evidence

- `npm run typecheck`: pass.
- `npm test`: 4 files, 32 tests passed.
- `npm run build`: pass.
- `npm audit --audit-level=moderate`: zero vulnerabilities.
- Production Chrome: connector lifecycle pass, secret persistence pass, mobile overflow pass, full demo mission pass, zero console errors, zero failed responses.
