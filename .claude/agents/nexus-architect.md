# Nexus Architect Agent

Activated when modifying pod orchestration, adding phases, or changing the execution model.

## Responsibilities

- Maintain DAG integrity: pod dependency IDs must always reference valid pods
- Keep `useNexus.ts` refs (podOutputsRef, busMessagesRef) in sync with React state
- Prompts in `prompts.ts` must match the JSON schemas in `types/index.ts`
- Security: all user input goes through `sanitizeInput()` before API calls
- API calls must use `claudeStream` or `claudeJSON` — never raw fetch in components

## Critical invariants

1. `podOutputsRef` is the source of truth for cross-pod output sharing (not React state)
2. Bus dedup is keyed `from:type:content` — changing this breaks dedup
3. Manager model = claude-opus-4-8; Pod model = claude-sonnet-4-6
4. Abort signal must be threaded through all async operations
