---
phase: 02-data-pipeline
plan: 01
subsystem: pipeline
tags: [ai-sdk, generateText, openai, google, perplexity, bullmq, cost-tracking, vitest]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: AI provider instances (openai, google, perplexity), MODELS map, BullMQ queue, Drizzle schema
provides:
  - executeQuery function wrapping generateText for all 3 AI providers with normalized QueryResult
  - calculateCost function with per-model price table (gpt-4o-mini, gemini-2.0-flash, sonar)
  - Queue job helpers (addQueryJobs, addAnalysisJob, addSentimentJob, addSnapshotJob)
  - Budget env vars (DAILY_BUDGET_OPENAI/PERPLEXITY/GEMINI) and CHECK_SCHEDULE_CRON
  - uniqueIndex on daily_snapshots for upsert support
affects: [02-02-analysis-engine, 02-03-automation-scheduler]

# Tech tracking
tech-stack:
  added: []
  patterns: [provider-map-pattern for AI SDK model selection, price-table-per-model cost tracking, batch-3-runs-per-keyword with shared batchId]

key-files:
  created:
    - src/lib/pipeline/cost-calculator.ts
    - src/lib/pipeline/query-executor.ts
    - src/lib/pipeline/__tests__/cost-calculator.test.ts
    - src/lib/pipeline/__tests__/query-executor.test.ts
  modified:
    - src/lib/db/schema.ts
    - src/lib/env.ts
    - src/lib/queue/queues.ts

key-decisions:
  - "Perplexity citations extracted via (result as any).sources?.map() -- AI SDK v4 sources API"
  - "Price table keyed by model name (not provider ID) for direct lookup from MODELS map"
  - "Skipped drizzle-kit push (no DB in CI) -- uniqueIndex change in schema.ts ready for next migration"

patterns-established:
  - "Provider map pattern: providerMap[providerId]() returns model instance for generateText"
  - "Cost calculation from token counts using per-model price table"
  - "Batch orchestration: 3 runs per keyword+provider, shared batchId, staggered delays"

requirements-completed: [DATA-02, DATA-03, DATA-04, DATA-05, DATA-06, DATA-07, DATA-08]

# Metrics
duration: 2min
completed: 2026-03-22
---

# Phase 02 Plan 01: Query Execution Engine Summary

**AI SDK generateText wrapper for 3 providers with normalized QueryResult, per-model cost calculator, and BullMQ batch job helpers**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-22T10:47:45Z
- **Completed:** 2026-03-22T10:50:07Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Query executor wraps AI SDK generateText for ChatGPT, Perplexity, and Gemini with normalized QueryResult output
- Cost calculator computes USD from token counts using per-model price table (gpt-4o-mini, gemini-2.0-flash, sonar)
- Queue helpers enqueue 3 runs per keyword+provider batch with priority and rate-limiting delays
- Budget env vars and schedule cron validated via Zod with defaults
- daily_snapshots uniqueIndex ready for upsert support

## Task Commits

Each task was committed atomically:

1. **Task 1 (RED): Failing tests** - `a265ea1` (test)
2. **Task 1 (GREEN): Cost calculator, query executor, schema, env** - `3cda1af` (feat)
3. **Task 2: Queue job helpers** - `7032911` (feat)

## Files Created/Modified
- `src/lib/pipeline/cost-calculator.ts` - Price table and calculateCost for all 3 models
- `src/lib/pipeline/query-executor.ts` - generateText wrapper returning normalized QueryResult
- `src/lib/pipeline/__tests__/cost-calculator.test.ts` - 6 test cases for cost calculation
- `src/lib/pipeline/__tests__/query-executor.test.ts` - 4 test cases with mocked generateText
- `src/lib/db/schema.ts` - uniqueIndex on daily_snapshots (keywordId, brandId, providerId, date)
- `src/lib/env.ts` - DAILY_BUDGET_OPENAI/PERPLEXITY/GEMINI and CHECK_SCHEDULE_CRON
- `src/lib/queue/queues.ts` - addQueryJobs, addAnalysisJob, addSentimentJob, addSnapshotJob

## Decisions Made
- Perplexity citations extracted via `(result as any).sources?.map()` -- AI SDK v4 sources field is not fully typed
- Price table keyed by model name (not provider ID) for direct lookup from MODELS map
- Skipped drizzle-kit push -- no database available in dev, schema change committed for next migration run

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Query executor and cost calculator ready for Plan 02 (analysis engine) to consume
- Queue job helpers provide addAnalysisJob, addSentimentJob, addSnapshotJob for Plan 02 workers
- Schema uniqueIndex enables daily_snapshots upsert in Plan 02/03

## Self-Check: PASSED

All 8 files verified present. All 3 commits verified in git log. Key exports confirmed (uniqueIndex, DAILY_BUDGET_OPENAI, addQueryJobs).

---
*Phase: 02-data-pipeline*
*Completed: 2026-03-22*
