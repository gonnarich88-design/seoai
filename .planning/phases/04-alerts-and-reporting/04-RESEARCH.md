# Phase 4: Alerts and Reporting - Research

**Researched:** 2026-03-23
**Domain:** Change detection, email notifications, alert UI, weekly reports, CSV export
**Confidence:** HIGH

## Summary

Phase 4 adds proactive notifications and reporting to an already-complete monitoring pipeline. The existing infrastructure provides everything needed: the `alerts` table already exists in the schema (created in Phase 1), BullMQ handles background jobs, and `dailySnapshots` contains the historical data needed for change detection. The primary technical challenges are: (1) designing the change detection algorithm that compares today's snapshots against yesterday's, (2) integrating email sending via Nodemailer with SMTP, (3) building the alert feed UI page, (4) generating weekly summary reports, and (5) implementing CSV export via API route handlers.

This phase is comparatively lightweight -- it builds on stable infrastructure (Drizzle ORM, BullMQ workers, Next.js API routes, React dashboard) with no new fundamental technologies. The main library additions are Nodemailer for email and a simple CSV serializer (hand-rolled is fine for tabular data).

**Primary recommendation:** Hook change detection into the existing snapshot aggregation pipeline (after `snapshot-job` completes), use Nodemailer with SMTP for email, add an `/dashboard/alerts` page to the existing sidebar, and implement CSV export as a streaming API route with manual serialization (no library needed for simple tabular data).

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ALRT-01 | System detects meaningful changes in brand visibility (appeared, disappeared, rank changed) | Change detection algorithm comparing consecutive dailySnapshots; alert types: `brand_appeared`, `brand_disappeared`, `rank_changed`, `visibility_changed` |
| ALRT-02 | System sends email notifications when alerts are triggered | Nodemailer with SMTP transport; new `alert-notify` job in BullMQ worker; env vars for SMTP config |
| ALRT-03 | User sees alert feed in dashboard with read/unread state | New `/dashboard/alerts` page; API route for listing/marking-read; existing `alerts` table has `isRead` and all needed columns |
| ALRT-04 | System generates weekly summary report of visibility changes | BullMQ scheduled job (weekly cron); aggregates dailySnapshots over 7-day window; sends HTML email |
| ALRT-05 | User can export data to CSV for external reporting | API route handler returning CSV with Content-Disposition header; covers snapshots and alerts data |
</phase_requirements>

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| drizzle-orm | 0.45.1 | Database queries for alerts, snapshots | Already used throughout project |
| bullmq | 5.71.0 | Background jobs for detection, email, weekly report | Already used for pipeline jobs |
| next | 15.5.14 | API routes for alerts, CSV export; pages for alert feed | Already the framework |
| zod | 3.25.76 | Validation for alert settings, env vars | Already used for env validation |
| date-fns | 4.1.0 | Date arithmetic for "yesterday", weekly ranges | Already installed |

### New Dependencies
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| nodemailer | 8.0.3 | SMTP email sending | Alert notifications and weekly reports |
| @types/nodemailer | 7.0.11 | TypeScript types for nodemailer | Dev dependency |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Nodemailer | Resend (6.9.4) | Resend has better DX and deliverability tracking but costs money at scale; Nodemailer is free with any SMTP provider (Gmail, SES, Mailgun) -- fits internal tool better |
| json2csv | Hand-rolled CSV | For simple tabular data with known columns, manual serialization is simpler than adding a dependency; json2csv adds complexity for no benefit here |

**Installation:**
```bash
npm install nodemailer
npm install -D @types/nodemailer
```

## Architecture Patterns

### Recommended Project Structure
```
src/
  lib/
    pipeline/
      change-detector.ts        # Compare snapshots, create alert records
    email/
      transporter.ts            # Nodemailer SMTP transporter singleton
      templates/
        alert-notification.ts   # HTML template for alert emails
        weekly-report.ts        # HTML template for weekly summary
    export/
      csv-serializer.ts         # Convert DB rows to CSV string
  worker/
    handlers/
      alert-handler.ts          # Process alert detection after snapshot
      alert-notify-handler.ts   # Send email for new alerts
      weekly-report-handler.ts  # Generate and send weekly report
  app/
    api/
      alerts/
        route.ts                # GET alerts list, PATCH mark read
        [id]/
          route.ts              # PATCH single alert read status
      export/
        snapshots/
          route.ts              # GET CSV export of snapshot data
        alerts/
          route.ts              # GET CSV export of alert history
    dashboard/
      alerts/
        page.tsx                # Alert feed UI with read/unread
  components/
    dashboard/
      alert-card.tsx            # Single alert display component
      alert-badge.tsx           # Unread count badge for sidebar
```

### Pattern 1: Change Detection After Snapshot Aggregation
**What:** After each `snapshot-job` completes, enqueue an `alert-detection-job` that compares today's snapshot with yesterday's for the same keyword+brand+provider.
**When to use:** Every time a batch finishes processing.
**Example:**
```typescript
// In snapshot-handler.ts, after aggregateSnapshot():
await addAlertDetectionJob({ keywordId, brandId, providerId, date: today });

// In change-detector.ts:
export async function detectChanges(params: {
  keywordId: string;
  brandId: string;
  providerId: string;
  date: string; // today YYYY-MM-DD
}): Promise<AlertRecord[]> {
  const today = await getSnapshot(params.keywordId, params.brandId, params.providerId, params.date);
  const yesterday = await getSnapshot(params.keywordId, params.brandId, params.providerId, subtractDay(params.date));

  const alerts: AlertRecord[] = [];

  if (!yesterday && today && Number(today.mentionRate) > 0) {
    alerts.push({ alertType: 'brand_appeared', previousValue: null, currentValue: today.mentionRate });
  }
  if (yesterday && Number(yesterday.mentionRate) > 0 && today && Number(today.mentionRate) === 0) {
    alerts.push({ alertType: 'brand_disappeared', previousValue: yesterday.mentionRate, currentValue: '0' });
  }
  if (yesterday && today) {
    const posChange = Math.abs(Number(today.avgPosition || 0) - Number(yesterday.avgPosition || 0));
    if (posChange >= 2) { // significant rank change threshold
      alerts.push({ alertType: 'rank_changed', previousValue: yesterday.avgPosition, currentValue: today.avgPosition });
    }
    const rateChange = Math.abs(Number(today.mentionRate) - Number(yesterday.mentionRate));
    if (rateChange >= 0.34) { // visibility changed by 34%+ (1 out of 3 runs)
      alerts.push({ alertType: 'visibility_changed', previousValue: yesterday.mentionRate, currentValue: today.mentionRate });
    }
  }
  return alerts;
}
```

### Pattern 2: Nodemailer SMTP Transporter
**What:** Singleton transporter configured from env vars.
**Example:**
```typescript
// src/lib/email/transporter.ts
import nodemailer from 'nodemailer';

let transporter: nodemailer.Transporter | null = null;

export function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
}
```

### Pattern 3: CSV Export via API Route
**What:** Route handler that queries DB, serializes to CSV, returns with download headers.
**Example:**
```typescript
// src/app/api/export/snapshots/route.ts
export async function GET(request: NextRequest) {
  const rows = await db.select().from(dailySnapshots)
    .leftJoin(keywords, eq(dailySnapshots.keywordId, keywords.id))
    .leftJoin(brands, eq(dailySnapshots.brandId, brands.id));

  const header = 'Date,Keyword,Brand,Provider,Mention Rate,Avg Position,Run Count\n';
  const csv = header + rows.map(r =>
    [r.daily_snapshots.date, r.keywords?.label, r.brands?.name,
     r.daily_snapshots.providerId, r.daily_snapshots.mentionRate,
     r.daily_snapshots.avgPosition, r.daily_snapshots.runCount]
    .map(v => `"${String(v ?? '').replace(/"/g, '""')}"`)
    .join(',')
  ).join('\n');

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="snapshots-${new Date().toISOString().slice(0,10)}.csv"`,
    },
  });
}
```

### Pattern 4: Weekly Report via BullMQ Scheduler
**What:** A repeatable BullMQ job that runs weekly, aggregates 7-day data, and sends an HTML email.
**Example:**
```typescript
// In scheduler-setup.ts, add:
await seoaiQueue.upsertJobScheduler('weekly-report', {
  pattern: '0 9 * * 1', // Monday at 9am
}, { name: 'weekly-report' });
```

### Anti-Patterns to Avoid
- **Polling for changes in the UI:** Do not build a polling mechanism to check for new alerts. Use the existing page load pattern (fetch on mount). Real-time updates are out of scope.
- **Sending emails synchronously in the request path:** Always queue email sending as a BullMQ job. Never block API responses waiting for SMTP delivery.
- **Complex alert rules engine:** Keep thresholds simple and hardcoded initially. A configurable rules engine is over-engineering for an internal tool.
- **Client-side CSV generation:** Generate CSV server-side in a route handler. Client-side generation breaks with large datasets and requires sending all data to the browser.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SMTP email delivery | Custom HTTP-to-SMTP bridge | Nodemailer 8.x | SMTP protocol complexity, TLS negotiation, auth methods |
| Email HTML rendering | Raw string concatenation | Template functions with proper escaping | XSS prevention, consistent formatting |
| Job scheduling | Custom cron with setTimeout | BullMQ Job Schedulers (already in use) | Persistence, crash recovery, distributed locking |

**Key insight:** CSV serialization IS simple enough to hand-roll for known-column tabular data. Adding json2csv or papaparse for export-only adds unnecessary dependency.

## Common Pitfalls

### Pitfall 1: Alert Storms on First Run
**What goes wrong:** First time change detection runs with no "yesterday" data, everything looks like a new appearance.
**Why it happens:** No historical baseline exists yet.
**How to avoid:** Only create alerts when both today AND yesterday snapshots exist. The `brand_appeared` alert should only fire when yesterday had mentionRate=0 (or no snapshot) AND today has mentionRate > 0 -- but NOT when yesterday simply has no record at all (first day of tracking).
**Warning signs:** Hundreds of alerts created on first deployment.

### Pitfall 2: Duplicate Alerts
**What goes wrong:** Same alert fires multiple times per day if snapshot-job runs multiple times (manual + scheduled checks).
**Why it happens:** Change detection runs after every snapshot aggregation, not just once per day.
**How to avoid:** Check for existing alert with same (keywordId, brandId, alertType, date) before inserting. Use a unique constraint or check-before-insert pattern.
**Warning signs:** Multiple identical alerts in the feed.

### Pitfall 3: SMTP Connection Failures Silently Swallowed
**What goes wrong:** Email sending fails but alerts are marked as notified.
**Why it happens:** Error handling doesn't properly separate alert creation from notification.
**How to avoid:** Keep alert creation and email notification as separate concerns. The `notifiedAt` field on the alerts table should only be set AFTER successful email delivery. Use BullMQ retry logic for email jobs.
**Warning signs:** `notifiedAt` is set but no email received.

### Pitfall 4: CSV Export Memory Issues with Large Datasets
**What goes wrong:** Loading all snapshots into memory before serializing crashes on large datasets.
**Why it happens:** SELECT * without limits on a growing table.
**How to avoid:** Add date range filters to the export API (required query params for start/end date). For an internal tool with daily data, this is sufficient.
**Warning signs:** API route timeout or memory errors.

### Pitfall 5: Weekly Report Runs Before Any Data Exists
**What goes wrong:** Weekly report sends an empty or broken email.
**Why it happens:** Scheduler fires before sufficient data has accumulated.
**How to avoid:** Check if data exists before generating report. Skip sending if no snapshots in the date range, or send a "no data yet" message.

## Code Examples

### Alert Types Enum
```typescript
export const ALERT_TYPES = {
  brand_appeared: 'brand_appeared',       // brand went from 0% to >0% mention rate
  brand_disappeared: 'brand_disappeared', // brand went from >0% to 0% mention rate
  rank_changed: 'rank_changed',           // avg position changed by >= 2
  visibility_changed: 'visibility_changed', // mention rate changed by >= 34%
} as const;

export type AlertType = keyof typeof ALERT_TYPES;
```

### Alert Feed API Route
```typescript
// GET /api/alerts?limit=50&unreadOnly=true
export async function GET(request: NextRequest) {
  const limit = Number(request.nextUrl.searchParams.get('limit') || '50');
  const unreadOnly = request.nextUrl.searchParams.get('unreadOnly') === 'true';

  let query = db.select({
    alert: alerts,
    keyword: { id: keywords.id, label: keywords.label },
    brand: { id: brands.id, name: brands.name },
  })
  .from(alerts)
  .leftJoin(keywords, eq(alerts.keywordId, keywords.id))
  .leftJoin(brands, eq(alerts.brandId, brands.id))
  .orderBy(desc(alerts.createdAt))
  .limit(limit);

  if (unreadOnly) {
    query = query.where(eq(alerts.isRead, false));
  }

  return NextResponse.json({ alerts: await query });
}

// PATCH /api/alerts -- mark alerts as read
export async function PATCH(request: NextRequest) {
  const { alertIds } = await request.json();
  await db.update(alerts)
    .set({ isRead: true })
    .where(inArray(alerts.id, alertIds));
  return NextResponse.json({ success: true });
}
```

### Env Vars to Add
```typescript
// Add to src/lib/env.ts
SMTP_HOST: z.string().optional(),
SMTP_PORT: z.coerce.number().default(587),
SMTP_SECURE: z.string().default('false'),
SMTP_USER: z.string().optional(),
SMTP_PASS: z.string().optional(),
SMTP_FROM: z.string().default('SEO AI Monitor <noreply@localhost>'),
ALERT_EMAIL_TO: z.string().optional(), // comma-separated recipient list
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Custom SMTP libraries | Nodemailer 8.x (ESM-ready) | 2025 | Better TypeScript support, ESM compatibility |
| SendGrid/Mailgun SDKs | Resend for new projects | 2024 | Simpler API, but Nodemailer still best for SMTP-direct |
| json2csv for CSV export | Hand-rolled or native Streams | 2024+ | Less dependencies for simple cases |
| Separate cron service | BullMQ Job Schedulers | BullMQ 5.x | Already in project, no separate cron process needed |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.1.0 |
| Config file | vitest.config.ts |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ALRT-01 | Change detection creates correct alert types | unit | `npx vitest run src/lib/pipeline/__tests__/change-detector.test.ts -x` | Wave 0 |
| ALRT-02 | Email notification sends via transporter | unit | `npx vitest run src/lib/email/__tests__/transporter.test.ts -x` | Wave 0 |
| ALRT-03 | Alert feed API returns alerts with read/unread | unit | `npx vitest run src/app/api/alerts/__tests__/alerts.test.ts -x` | Wave 0 |
| ALRT-04 | Weekly report aggregates 7-day data | unit | `npx vitest run src/worker/handlers/__tests__/weekly-report.test.ts -x` | Wave 0 |
| ALRT-05 | CSV export produces valid CSV with headers | unit | `npx vitest run src/app/api/export/__tests__/csv-export.test.ts -x` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/pipeline/__tests__/change-detector.test.ts` -- covers ALRT-01
- [ ] `src/lib/email/__tests__/transporter.test.ts` -- covers ALRT-02
- [ ] `src/app/api/alerts/__tests__/alerts.test.ts` -- covers ALRT-03
- [ ] `src/worker/handlers/__tests__/weekly-report.test.ts` -- covers ALRT-04
- [ ] `src/app/api/export/__tests__/csv-export.test.ts` -- covers ALRT-05

## Open Questions

1. **SMTP Provider Choice**
   - What we know: Nodemailer supports any SMTP server (Gmail, AWS SES, Mailgun, etc.)
   - What's unclear: Which SMTP provider the team will use
   - Recommendation: Make it configurable via env vars. For development, use Ethereal (Nodemailer's test service) or Mailtrap. Document required env vars clearly.

2. **Alert Thresholds**
   - What we know: Need to detect "meaningful" changes
   - What's unclear: Exact definition of "meaningful" for this team
   - Recommendation: Start with rank change >= 2 positions and mention rate change >= 34% (1 out of 3 runs). These can be adjusted later as constants.

3. **Weekly Report Scheduling**
   - What we know: BullMQ Job Schedulers support cron patterns
   - What's unclear: Preferred day/time for weekly report
   - Recommendation: Default to Monday 9am (configurable via env var `WEEKLY_REPORT_CRON`).

## Sources

### Primary (HIGH confidence)
- Project codebase: `src/lib/db/schema.ts` -- alerts table already exists with all needed columns
- Project codebase: `src/worker/index.ts` -- existing BullMQ worker pattern for adding new job types
- Project codebase: `src/lib/pipeline/snapshot-aggregator.ts` -- integration point for change detection
- Project codebase: `src/lib/queue/queues.ts` -- pattern for adding new job queue functions

### Secondary (MEDIUM confidence)
- [Mailtrap Next.js Email Tutorial](https://mailtrap.io/blog/nextjs-send-email/) -- Nodemailer with Next.js patterns
- [Sequenzy Send Emails in Next.js](https://www.sequenzy.com/blog/send-emails-nextjs) -- App Router email patterns
- npm registry: nodemailer@8.0.3, @types/nodemailer@7.0.11 -- verified current versions

### Tertiary (LOW confidence)
- None -- all findings verified against codebase or official package registry

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- builds entirely on existing project infrastructure plus well-established Nodemailer
- Architecture: HIGH -- patterns directly extend existing worker/queue/API route architecture
- Pitfalls: HIGH -- based on common patterns in change detection systems and email delivery

**Research date:** 2026-03-23
**Valid until:** 2026-04-23 (stable domain, no fast-moving dependencies)
