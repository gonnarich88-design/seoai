---
phase: 02-data-pipeline
plan: 03
subsystem: automation
tags: [bullmq, budget, cron, scheduler, api]

# Dependency graph
requires:
  - phase: 02-data-pipeline/02-01
    provides: "Queue infrastructure, addQueryJobs, env vars for budget caps"
  - phase: 02-data-pipeline/02-02
    provides: "Query handler, analysis handler, snapshot handler in worker"
provides:
  - "Budget checker (checkBudget, getBudgetCap) for per-provider daily cost caps"
  - "Daily scheduler (setupDailyScheduler) using BullMQ upsertJobScheduler"
  - "POST /api/checks/run endpoint for on-demand checks"
  - "Scheduled-check handler for daily batch processing"
  - "Worker-level budget enforcement on query-job execution"
affects: [03-dashboard, 04-alerts]

# Tech tracking
tech-stack:
  added: []
  patterns: ["BullMQ upsertJobScheduler for cron-based repeatable jobs", "Per-provider budget caps from env vars with SQL aggregation"]

key-files:
  created:
    - src/lib/pipeline/budget-checker.ts
    - src/worker/handlers/scheduler-setup.ts
    - src/app/api/checks/run/route.ts
    - src/lib/pipeline/__tests__/budget-checker.test.ts
    - src/worker/handlers/__tests__/scheduler-setup.test.ts
    - src/app/api/checks/__tests__/run.test.ts
  modified:
    - src/worker/index.ts

key-decisions:
  - "Budget checker reads process.env directly (not env.ts) for testability with mock env"
  - "Scheduler uses process.env.CHECK_SCHEDULE_CRON directly for same reason"
  - "Worker checks budget at query-job level as double-check (also checked at enqueue time)"

patterns-established:
  - "Budget check pattern: SUM(costUsd) from query_runs WHERE createdAt in UTC day range"
  - "Scheduler pattern: upsertJobScheduler with configurable cron, priority 10 for scheduled jobs"

requirements-completed: [AUTO-01, AUTO-02, AUTO-03, AUTO-04]

# Metrics
duration: 3min
completed: 2026-03-22
---

# Phase 02 Plan 03: Automation Layer Summary

**Budget checking with per-provider daily caps, BullMQ daily scheduler, POST /api/checks/run on-demand endpoint, and scheduled-check handler for batch processing**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-22T10:57:56Z
- **Completed:** 2026-03-22T11:00:58Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Budget checker queries daily spend per provider and enforces env-configured caps (DAILY_BUDGET_OPENAI, etc.)
- Daily scheduler uses BullMQ upsertJobScheduler with configurable cron pattern (CHECK_SCHEDULE_CRON)
- POST /api/checks/run validates keywordId, checks budget per provider, enqueues high-priority manual jobs
- Scheduled-check handler loads all active keywords and enqueues jobs for all providers with budget awareness
- Worker-level budget check as double-safety before executing any query-job

## Task Commits

Each task was committed atomically:

1. **Task 1: Budget checker and daily scheduler setup** - `1b4bb6f` (test: TDD RED) + `6593abb` (feat: TDD GREEN)
2. **Task 2: On-demand check API, scheduled-check handler, budget integration** - `177d231` (feat)

## Files Created/Modified
- `src/lib/pipeline/budget-checker.ts` - Budget cap checking per provider per day (checkBudget, getBudgetCap)
- `src/worker/handlers/scheduler-setup.ts` - BullMQ Job Scheduler for daily cron (setupDailyScheduler)
- `src/app/api/checks/run/route.ts` - POST endpoint for on-demand check triggers
- `src/lib/pipeline/__tests__/budget-checker.test.ts` - 7 tests for budget checker
- `src/worker/handlers/__tests__/scheduler-setup.test.ts` - 4 tests for scheduler setup
- `src/app/api/checks/__tests__/run.test.ts` - 6 tests for API route
- `src/worker/index.ts` - Added scheduled-check case, budget check on query-job, scheduler init

## Decisions Made
- Budget checker reads process.env directly instead of env.ts parsed values, for easier test mocking
- Worker double-checks budget at query-job execution time (not just at enqueue time) for safety against race conditions
- Scheduler initialization is fire-and-forget with .catch() on worker startup

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Full data pipeline complete: query execution, brand analysis, sentiment, snapshots, budget, scheduling
- All automation requirements (AUTO-01 through AUTO-04) satisfied
- Ready for Phase 03 (Dashboard) which will read from query_runs, brand_mentions, daily_snapshots

## Self-Check: PASSED

All 6 created files verified on disk. All 3 commits (1b4bb6f, 6593abb, 177d231) found in git log. All key patterns verified in source files.

---
*Phase: 02-data-pipeline*
*Completed: 2026-03-22*
