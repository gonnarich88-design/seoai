---
phase: 01-foundation
plan: 02
subsystem: infra
tags: [bullmq, redis, ioredis, ai-sdk, openai, google-gemini, perplexity, worker]

# Dependency graph
requires:
  - phase: 01-01
    provides: "Project scaffold, env validation, package.json with dependencies"
provides:
  - BullMQ queue definition with enqueue helper (seoai-jobs)
  - Standalone worker process for job processing
  - Shared Redis connection config using BullMQ ConnectionOptions
  - AI SDK provider instances for OpenAI, Google Gemini, and Perplexity
  - Centralized model identifiers (MODELS constant)
  - ProviderId type for type-safe provider selection
  - Integration test for BullMQ enqueue-and-process
  - Unit tests for AI provider instantiation
affects: [01-03, 02-data-pipeline]

# Tech tracking
tech-stack:
  added: [dotenv@17.3.x]
  patterns: [bullmq-connection-options, ai-provider-factory, standalone-worker-process]

key-files:
  created:
    - src/lib/queue/connection.ts
    - src/lib/queue/queues.ts
    - src/lib/queue/index.ts
    - src/worker/index.ts
    - src/lib/queue/__tests__/queue.test.ts
    - src/lib/ai/providers.ts
    - src/lib/ai/__tests__/providers.test.ts
  modified:
    - package.json

key-decisions:
  - "Used BullMQ ConnectionOptions object instead of IORedis instance to avoid type mismatch between top-level ioredis and BullMQ-bundled ioredis"
  - "Worker creates its own connection (runs as separate process, cannot share in-memory singleton)"
  - "AI providers instantiated with empty string API keys for Phase 1 (instantiation-only verification)"

patterns-established:
  - "BullMQ connection: use ConnectionOptions type from bullmq, not IORedis instances"
  - "Worker process: standalone entry point with dotenv/config import, separate from Next.js"
  - "AI providers: factory pattern with centralized MODELS constant for model identifiers"

requirements-completed: [INFR-03, INFR-04]

# Metrics
duration: 3min
completed: 2026-03-21
---

# Phase 01 Plan 02: BullMQ Queue and AI SDK Providers Summary

**BullMQ job queue with standalone worker process, plus Vercel AI SDK provider instances for OpenAI/Gemini/Perplexity with passing tests**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-21T15:30:20Z
- **Completed:** 2026-03-21T15:33:19Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- BullMQ queue (seoai-jobs) with addTestJob helper supporting 3 retries and exponential backoff
- Standalone worker process with test-job handler and concurrency of 5
- AI SDK providers for OpenAI, Google Gemini, and Perplexity verified working with unit tests (4/4 pass)
- npm scripts for worker management (worker, worker:dev, services:up, services:down)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create BullMQ queue, worker process, and integration test** - `7e86fa9` (feat)
2. **Task 2: Configure Vercel AI SDK providers and write unit test** - `3d5ddb7` (feat)

## Files Created/Modified
- `src/lib/queue/connection.ts` - Shared Redis connection config using BullMQ ConnectionOptions
- `src/lib/queue/queues.ts` - Queue definition with addTestJob helper
- `src/lib/queue/index.ts` - Barrel export for queue module
- `src/worker/index.ts` - Standalone BullMQ worker process entry point
- `src/lib/queue/__tests__/queue.test.ts` - Integration test for enqueue and process
- `src/lib/ai/providers.ts` - AI SDK provider instances and MODELS constant
- `src/lib/ai/__tests__/providers.test.ts` - Unit tests for provider instantiation (4 tests)
- `package.json` - Added worker/services scripts, dotenv dependency

## Decisions Made
- Used `ConnectionOptions` object from BullMQ instead of IORedis instances to avoid type mismatch (BullMQ bundles its own ioredis with incompatible types)
- Worker process creates its own Redis connection (separate process cannot share in-memory singletons)
- AI providers use empty string API keys for Phase 1 verification (instantiation works without valid keys)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed ioredis type mismatch between top-level and BullMQ-bundled versions**
- **Found during:** Task 1
- **Issue:** TypeScript error -- top-level `ioredis` package types incompatible with BullMQ's bundled `ioredis` (different `AbstractConnector` types)
- **Fix:** Changed from IORedis instances to BullMQ `ConnectionOptions` objects with host/port/maxRetriesPerRequest
- **Files modified:** src/lib/queue/connection.ts, src/worker/index.ts, src/lib/queue/__tests__/queue.test.ts
- **Verification:** `npx tsc --noEmit` passes on all queue/worker files
- **Committed in:** 7e86fa9

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor API change (ConnectionOptions instead of IORedis instance). Functionally equivalent.

## Issues Encountered
- Docker/Redis not available on this machine (same as Plan 01-01). Queue integration test (`queue.test.ts`) requires Redis and cannot run until Docker is installed. AI provider tests pass without external services.
- Vitest had a one-time cache issue (`loadEnv` error) resolved by clearing `node_modules/.vite`

## User Setup Required

To run the queue integration test:
```bash
docker compose up -d
npx vitest run src/lib/queue/__tests__/queue.test.ts
```

To start the worker:
```bash
docker compose up -d
npm run worker
```

## Next Phase Readiness
- Queue infrastructure ready for Phase 2 data pipeline job scheduling
- AI providers ready for Phase 2 query engine (just need valid API keys in .env)
- Worker can be extended with additional job handlers in Phase 2
- Redis/Docker must be running before queue integration test or worker startup

---
*Phase: 01-foundation*
*Completed: 2026-03-21*
