---
phase: 04-alerts-and-reporting
plan: 01
subsystem: pipeline, email, api
tags: [nodemailer, smtp, change-detection, alerts, bullmq, drizzle]

requires:
  - phase: 02-data-pipeline
    provides: dailySnapshots table, snapshot aggregator, worker handlers, queue helpers
  - phase: 03-dashboard
    provides: dashboard API patterns, Drizzle query patterns
provides:
  - Change detection engine (detectChanges) comparing consecutive daily snapshots
  - Email transporter singleton with SMTP configuration
  - HTML email template for alert notifications
  - Alert detection and notification worker handlers
  - Queue helpers for alert-detection-job and alert-notify-job
  - Alerts API (GET list with unread filter, PATCH batch mark-as-read)
affects: [04-02, 04-03]

tech-stack:
  added: [nodemailer, "@types/nodemailer"]
  patterns: [lazy-singleton-transporter, threshold-based-change-detection, date-comparison-duplicate-prevention]

key-files:
  created:
    - src/lib/pipeline/change-detector.ts
    - src/lib/email/transporter.ts
    - src/lib/email/templates/alert-notification.ts
    - src/worker/handlers/alert-handler.ts
    - src/worker/handlers/alert-notify-handler.ts
    - src/app/api/alerts/route.ts
  modified:
    - src/lib/env.ts
    - src/lib/queue/queues.ts
    - src/worker/handlers/snapshot-handler.ts
    - src/worker/index.ts

key-decisions:
  - "Visibility threshold 0.34 and rank threshold 2 for meaningful change detection"
  - "notifiedAt only set after successful email delivery (BullMQ retries on failure)"
  - "First-day snapshots produce no alerts to prevent false brand_appeared storms"
  - "Duplicate prevention via date-range check on existing alerts table"

patterns-established:
  - "Change detection: compare today vs yesterday snapshots with configurable thresholds"
  - "Email guard: isEmailConfigured() + ALERT_EMAIL_TO check before sending"
  - "Post-aggregation hook: snapshot handler triggers alert detection for all brands"

requirements-completed: [ALRT-01, ALRT-02]

duration: 4min
completed: 2026-03-22
---

# Phase 4 Plan 1: Alert Detection and Email Notification Summary

**Change detection engine with 4 alert types, SMTP email notifications via Nodemailer, and alerts REST API with unread filtering**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-22T21:46:24Z
- **Completed:** 2026-03-22T21:50:30Z
- **Tasks:** 2
- **Files modified:** 16

## Accomplishments
- Change detector identifies brand_appeared, brand_disappeared, rank_changed, and visibility_changed with threshold-based logic
- First-day tracking prevention and same-day duplicate alert prevention
- Nodemailer SMTP transporter with lazy singleton and email configuration guard
- Alert detection and notification worker handlers integrated into existing BullMQ pipeline
- Snapshot handler automatically triggers alert detection after aggregation
- Alerts API with GET (unread filter, keyword/brand labels) and PATCH (batch mark-as-read)

## Task Commits

Each task was committed atomically:

1. **Task 1: Change detection engine, email infrastructure, and queue helpers** - `ea9e739` (feat)
2. **Task 2: Worker handlers, snapshot integration, alerts API** - `7b083f9` (feat)

## Files Created/Modified
- `src/lib/pipeline/change-detector.ts` - Detects 4 alert types by comparing daily snapshots
- `src/lib/pipeline/__tests__/change-detector.test.ts` - 7 tests covering all alert types, first-day, below-threshold, duplicates
- `src/lib/email/transporter.ts` - Nodemailer SMTP transporter singleton with isEmailConfigured guard
- `src/lib/email/templates/alert-notification.ts` - HTML email template for alert notifications
- `src/lib/email/__tests__/transporter.test.ts` - 4 tests for transporter and email template
- `src/lib/queue/queues.ts` - Added addAlertDetectionJob and addAlertNotifyJob helpers
- `src/lib/env.ts` - Added SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, SMTP_FROM, ALERT_EMAIL_TO, WEEKLY_REPORT_CRON
- `src/worker/handlers/alert-handler.ts` - Runs detectChanges, inserts alerts, queues notifications
- `src/worker/handlers/alert-notify-handler.ts` - Sends email via SMTP, sets notifiedAt on success
- `src/worker/handlers/snapshot-handler.ts` - Triggers alert detection after aggregation
- `src/worker/index.ts` - Handles alert-detection-job and alert-notify-job
- `src/app/api/alerts/route.ts` - GET alerts list with unread filter, PATCH batch mark-as-read
- `src/app/api/alerts/__tests__/alerts.test.ts` - 3 tests for GET and PATCH

## Decisions Made
- Visibility threshold 0.34 and rank threshold 2 for meaningful change detection (per research)
- notifiedAt only set after successful email delivery so BullMQ retries failed sends
- First-day snapshots produce no alerts to prevent false brand_appeared storms
- Date-range check on existing alerts prevents duplicate alerts per keyword+brand+type+date
- Email transporter reads process.env directly (not parsed env) for lazy singleton pattern

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required

To enable email notifications, set these environment variables:
- `SMTP_HOST` - SMTP server hostname (e.g., smtp.gmail.com)
- `SMTP_PORT` - SMTP port (default: 587)
- `SMTP_SECURE` - Use TLS (default: false)
- `SMTP_USER` - SMTP username
- `SMTP_PASS` - SMTP password
- `SMTP_FROM` - From address (default: SEO AI Monitor <noreply@localhost>)
- `ALERT_EMAIL_TO` - Recipient email for alert notifications

Without these, alerts still get created but email notifications are silently skipped.

## Next Phase Readiness
- Alert detection and notification backend complete
- Plan 02 (weekly reports) can use the email infrastructure
- Plan 03 (alert feed UI) can consume the alerts API

---
*Phase: 04-alerts-and-reporting*
*Completed: 2026-03-22*
