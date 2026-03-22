---
phase: 04-alerts-and-reporting
plan: 03
subsystem: ui, worker
tags: [react, bullmq, email, nodemailer, date-fns, alerts, weekly-report]

requires:
  - phase: 04-alerts-and-reporting/01
    provides: Alert API endpoints (GET/PATCH /api/alerts), email transporter, alert detection pipeline
provides:
  - Alert feed dashboard page with read/unread filtering
  - AlertCard component for rendering individual alerts
  - AlertBadge component with auto-refreshing unread count
  - Sidebar Alerts link with badge
  - Weekly report HTML email template
  - Weekly report BullMQ handler and scheduler
affects: []

tech-stack:
  added: []
  patterns: [periodic-fetch-badge, email-html-inline-styles, tdd-handler-testing]

key-files:
  created:
    - src/app/dashboard/alerts/page.tsx
    - src/components/dashboard/alert-card.tsx
    - src/components/dashboard/alert-badge.tsx
    - src/lib/email/templates/weekly-report.ts
    - src/worker/handlers/weekly-report-handler.ts
    - src/worker/handlers/__tests__/weekly-report.test.ts
  modified:
    - src/components/dashboard/sidebar.tsx
    - src/worker/handlers/scheduler-setup.ts
    - src/worker/index.ts
    - src/worker/handlers/__tests__/scheduler-setup.test.ts

key-decisions:
  - "AlertBadge fetches count internally with 60s refresh interval (self-contained component)"
  - "Weekly report queries 7-day window ending yesterday (consistent date boundaries)"

patterns-established:
  - "Periodic badge refresh: useEffect + setInterval with cleanup for auto-updating counts"
  - "Email templates: inline CSS for cross-client compatibility, same pattern as alert-notification"

requirements-completed: [ALRT-03, ALRT-04]

duration: 4min
completed: 2026-03-22
---

# Phase 04 Plan 03: Alert Feed & Weekly Report Summary

**Alert feed page with type-filtered cards and read/unread management, sidebar badge with 60s auto-refresh, weekly snapshot report via BullMQ scheduler**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-22T21:52:47Z
- **Completed:** 2026-03-22T21:57:03Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- Alert feed page shows alerts with type badges, brand/keyword, old-to-new values, and relative timestamps
- Users can filter alerts (all/unread) and mark as read individually or in bulk
- Sidebar shows Alerts link with auto-refreshing unread count badge
- Weekly report handler aggregates 7-day snapshot data and sends HTML summary email
- Weekly scheduler registered in BullMQ with configurable cron (default Monday 9am)
- Graceful skip when no data or email not configured

## Task Commits

Each task was committed atomically:

1. **Task 1: Alert feed page, alert card component, and sidebar unread badge** - `1d0c5fd` (feat)
2. **Task 2 RED: Failing tests for weekly report** - `0b54527` (test)
3. **Task 2 GREEN: Weekly report template, handler, and scheduler** - `58d95c9` (feat)
4. **Task 2 fix: Update scheduler test for dual scheduler calls** - `548441e` (fix)

## Files Created/Modified
- `src/app/dashboard/alerts/page.tsx` - Alert feed page with filter toggle and mark-as-read
- `src/components/dashboard/alert-card.tsx` - Alert card with type badge, color border, relative time
- `src/components/dashboard/alert-badge.tsx` - Unread count badge with 60s auto-refresh
- `src/components/dashboard/sidebar.tsx` - Added Alerts link with inline AlertBadge
- `src/lib/email/templates/weekly-report.ts` - HTML email template for weekly snapshot summary
- `src/worker/handlers/weekly-report-handler.ts` - Queries 7-day data, sends email, handles edge cases
- `src/worker/handlers/__tests__/weekly-report.test.ts` - 5 tests covering template and handler
- `src/worker/handlers/scheduler-setup.ts` - Added weekly-report-scheduler registration
- `src/worker/index.ts` - Added weekly-report job case
- `src/worker/handlers/__tests__/scheduler-setup.test.ts` - Updated call count assertion

## Decisions Made
- AlertBadge fetches count internally with 60s refresh interval -- self-contained, no prop drilling
- Weekly report queries 7-day window ending yesterday for consistent date boundaries

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated scheduler-setup test assertion**
- **Found during:** Task 2 (after adding weekly scheduler)
- **Issue:** Existing test expected `upsertJobScheduler` called once, now called twice
- **Fix:** Changed `toHaveBeenCalledOnce()` to `toHaveBeenCalledTimes(2)`
- **Files modified:** src/worker/handlers/__tests__/scheduler-setup.test.ts
- **Verification:** All scheduler tests pass
- **Committed in:** 548441e

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Necessary test update for correctness. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 04 (alerts-and-reporting) is now complete
- All alert and reporting features implemented across 3 plans
- Pre-existing TS errors in query-executor and sentiment-analyzer (LanguageModelV3 vs V1) are unrelated

---
*Phase: 04-alerts-and-reporting*
*Completed: 2026-03-22*
