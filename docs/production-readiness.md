# Production Readiness and Security Review

This document is the single source of truth for the current browser-only security posture, hardening controls, validation checks, and known enterprise boundaries for NEXUS.

## Threat Model

NEXUS runs as a client-side orchestration app. The highest-risk assets are:

- Provider API keys entered by the user.
- Mission specs, worker submissions, pod outputs, dependency outputs, and message-bus content.
- Local-provider access through Ollama.
- The manager-agent prompt chain that reviews and coordinates work.

The app must treat user mission text, worker-agent submissions, pod output, and model output as untrusted data. It must not persist provider secrets, widen network access beyond supported providers, or allow model-supplied instructions to override system prompts.

## Implemented Controls

- API keys are memory-only. Provider configuration persistence strips `apiKey` before writing to `sessionStorage`.
- Provider choices, worker mode, and worker-agent metadata remain tab-scoped so reloads do not leak secrets to disk.
- Content Security Policy blocks inline scripts, frames, objects, form posts, and all network connections except supported provider APIs plus local Ollama on port `11434`.
- Production source maps are disabled by default. Set `VITE_ENABLE_SOURCEMAPS=true` only for controlled debugging.
- Vite dev server binds to `127.0.0.1` with a strict port and does not auto-open a browser.
- Local-provider URLs are normalized and limited to `http://localhost:11434` or `http://127.0.0.1:11434`.
- Gemini API keys are sent in the `x-goog-api-key` header instead of the query string.
- Worker-agent metadata and manual worker outputs are length-limited and sanitized before storage or manager review.
- Prompt trust-boundary rules are injected into manager, pod, verifier, coordination, synthesis, wave-check, and worker-review system prompts.
- Streaming provider clients handle empty response bodies and bounded retry-after parsing.
- Runtime logs are ignored by git.

## Validation Checklist

Run these before release:

```bash
npm.cmd run audit
npm.cmd run typecheck
npm.cmd run build
git diff --check
```

Use this static scan when touching rendering, storage, provider clients, or prompts:

```bash
rg -n "dangerouslySetInnerHTML|innerHTML|outerHTML|eval\(|new Function|document\.write|localStorage|apiKey.*sessionStorage|sessionStorage.*apiKey|key=\$\{apiKey\}|sourcemap: true|localhost:\*|@ts-ignore|eslint-disable" src index.html README.md CONTEXT.md docs package.json vite.config.ts
```

## Edge Cases Covered

- Missing manager-capable provider blocks mission launch.
- Invalid local Ollama URLs are excluded from provider readiness before mission launch.
- Company-worker mode can launch only when at least one worker agent is enabled.
- Empty or excessively large worker submissions are rejected or clamped before manager review.
- Reloaded provider configs never restore API keys from storage.
- Unsupported local-provider URLs fail closed before fetch.
- Provider 429 responses use a safe retry delay when `retry-after` is missing or malformed.

## Enterprise Boundaries

The app is hardened for a browser-only deployment, but a regulated enterprise deployment should add a backend control plane before handling production secrets or tenant data:

- Server-side provider proxy or broker with secret vault integration.
- Organization authentication, role-based access control, and tenant isolation.
- Audit logs for mission launch, worker assignment, manager review, and provider calls.
- Rate limiting, abuse controls, budget controls, and per-tenant quotas.
- Durable encrypted storage for mission records and accepted worker submissions.
- CI gates for audit, typecheck, build, static scan, and end-to-end browser tests.
- CSP nonce or hashed style strategy after refactoring inline React styles.
