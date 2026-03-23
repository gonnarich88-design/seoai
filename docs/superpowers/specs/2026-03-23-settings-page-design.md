# Settings Page Design

**Date:** 2026-03-23
**Project:** SEO AI Monitor

## Overview

Add a Settings page to the dashboard that allows users to configure all system values currently stored in `.env` through a UI. Settings are persisted in the database, take effect immediately without server restart, and sensitive values are encrypted at rest.

---

## 1. Database

### New `settings` table

| Column        | Type      | Description                          |
|---------------|-----------|--------------------------------------|
| `key`         | text (PK) | Setting identifier                   |
| `value`       | text      | Setting value (encrypted or plain)   |
| `isEncrypted` | boolean   | Whether value is AES-256-GCM encoded |
| `updatedAt`   | timestamp | Last modified time                   |

### Setting Keys (allowlist)

| Key                       | Type    | Encrypted |
|---------------------------|---------|-----------|
| `openai_api_key`          | string  | yes       |
| `google_api_key`          | string  | yes       |
| `perplexity_api_key`      | string  | yes       |
| `daily_budget_openai`     | number  | no        |
| `daily_budget_perplexity` | number  | no        |
| `daily_budget_gemini`     | number  | no        |
| `check_schedule_cron`     | string  | no        |
| `weekly_report_cron`      | string  | no        |
| `smtp_host`               | string  | no        |
| `smtp_port`               | number  | no        |
| `smtp_secure`             | boolean | no        |
| `smtp_user`               | string  | no        |
| `smtp_pass`               | string  | yes       |
| `smtp_from`               | string  | no        |
| `alert_email_to`          | string  | no        |
| `auth_password`           | string  | yes       |

### Key name mapping from env vars

| `.env` variable              | DB key                    |
|------------------------------|---------------------------|
| `OPENAI_API_KEY`             | `openai_api_key`          |
| `GOOGLE_GENERATIVE_AI_API_KEY` | `google_api_key`        |
| `PERPLEXITY_API_KEY`         | `perplexity_api_key`      |
| `DAILY_BUDGET_OPENAI`        | `daily_budget_openai`     |
| `DAILY_BUDGET_PERPLEXITY`    | `daily_budget_perplexity` |
| `DAILY_BUDGET_GEMINI`        | `daily_budget_gemini`     |
| `CHECK_SCHEDULE_CRON`        | `check_schedule_cron`     |
| `WEEKLY_REPORT_CRON`         | `weekly_report_cron`      |
| `AUTH_PASSWORD`              | `auth_password`           |
| (all SMTP_* vars)            | (matching smtp_* keys)    |

### Encryption

- Algorithm: AES-256-GCM via Node.js `crypto` (built-in, no new dependencies)
- Master key: `SETTINGS_ENCRYPTION_KEY` in `.env` — the only new key required in `.env`
- Encrypted values stored with prefix `enc:` to distinguish from plain text

### Fallback / Migration

On first load, if the settings table is empty, the system pre-populates values from current `.env` variables automatically. Users do not need to re-enter existing configuration.

---

## 2. Settings Service

**File:** `src/lib/settings.ts`

### API

```ts
getSetting(key: SettingKey): Promise<string | null>
setSetting(key: SettingKey, value: string): Promise<void>   // encrypts automatically per allowlist
deleteSetting(key: SettingKey): Promise<void>
getAllSettings(): Promise<SettingsMap>  // encrypted fields masked as "••••••••", includes isConfigured boolean for API keys
```

### Caching

In-memory cache with 30-second TTL per process. Since the web process and worker are separate Node.js processes, each maintains its own cache. This means:
- Budget caps and API keys may lag up to 30 seconds in the worker after UI update — acceptable for this internal tool
- Cron schedule changes are checked on the worker's 60-second poll cycle regardless of cache TTL

---

## 3. API Routes

### `GET /api/settings`
Returns all settings. Encrypted field values are replaced with `"••••••••"`. Includes `isConfigured: boolean` for API key fields.

### `PUT /api/settings`

Zod validation schema (allowlist — unknown keys are rejected with 400):

```ts
const updateSettingsSchema = z.object({
  openai_api_key:          z.string().optional(),
  google_api_key:          z.string().optional(),
  perplexity_api_key:      z.string().optional(),
  daily_budget_openai:     z.coerce.number().min(0).optional(),
  daily_budget_perplexity: z.coerce.number().min(0).optional(),
  daily_budget_gemini:     z.coerce.number().min(0).optional(),
  check_schedule_cron:     z.string().regex(cronRegex).optional(),
  weekly_report_cron:      z.string().regex(cronRegex).optional(),
  smtp_host:               z.string().optional(),
  smtp_port:               z.coerce.number().int().min(1).max(65535).optional(),
  smtp_secure:             z.boolean().optional(),
  smtp_user:               z.string().optional(),
  smtp_pass:               z.string().optional(),
  smtp_from:               z.string().optional(),
  alert_email_to:          z.string().email().optional(),
  auth_password:           z.string().min(8).optional(),
});
```

**Blank API key behavior:** An empty string `""` for an API key field is treated as a no-op (not saved). To intentionally delete an API key, the UI provides a separate **Remove** button which calls `DELETE /api/settings/:key`. This prevents accidental deletion by clearing an input.

### `DELETE /api/settings/:key`
Deletes a single setting. Only allowed for API key fields. Requires the key to be in the encrypted allowlist.

### `POST /api/settings/test-email`
Sends a test email using current SMTP settings. Returns success/error message.

---

## 4. Worker Changes

**File:** `src/worker/index.ts` + `src/worker/handlers/scheduler-setup.ts`

### Startup
Load `check_schedule_cron` and `weekly_report_cron` from DB (fallback to env vars if DB unavailable). Pass to `setupDailyScheduler()`.

### 60-second poll loop
Every 60 seconds:
1. Read `check_schedule_cron` and `weekly_report_cron` from `getSetting()`
2. Compare with last-known values
3. If either changed: call `upsertJobScheduler()` again with the new cron pattern — BullMQ updates the scheduler in place (no manual cancel needed)
4. If DB read fails: log warning, keep existing schedule, retry next cycle

---

## 5. `env.ts` Migration

Fields moved to DB become optional in `env.ts` Zod schema with their existing defaults preserved. `AUTH_PASSWORD`, `OPENAI_API_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY`, `PERPLEXITY_API_KEY`, and all `SMTP_*` vars become `.optional()`. Budget and cron vars keep their existing defaults in Zod as fallback.

`SETTINGS_ENCRYPTION_KEY` is added as a required field.

The system reads settings in priority order: **DB → env var fallback**. This means the app works during the transition period when some values are still only in `.env`.

---

## 6. Auth Changes

**File:** `src/lib/auth.ts`

`verifyPassword()` becomes `async` and returns `Promise<boolean>`:
1. First check DB for `auth_password` via `getSetting('auth_password')`
2. If not found in DB, fall back to `process.env.AUTH_PASSWORD`
3. Compare input against whichever value is found

The login Server Action in `src/app/login/actions.ts` must be updated to `await verifyPassword(password)`.

This maintains backward compatibility: existing `.env`-only installs continue to work.

---

## 7. Email Transporter Changes

**File:** `src/lib/email/transporter.ts`

The current singleton pattern (`let transporter = null; if (!transporter) createTransport(...)`) reads SMTP settings once and caches forever. This must be changed to create a fresh transporter on each call using current settings from `getSetting()`. Since emails are sent infrequently (alerts and weekly reports), the performance cost of creating a new transporter per call is negligible.

`isEmailConfigured()` must also be updated to check `getSetting('smtp_host')` with env fallback (not `process.env.SMTP_HOST` only). Without this, users who configure SMTP entirely through the Settings UI will have `isEmailConfigured()` return `false`, causing alert and weekly report emails to be silently skipped.

---

## 8. Budget Checker Changes

**File:** `src/lib/pipeline/budget-checker.ts`

`getBudgetCap()` is updated to read from `getSetting()` instead of `process.env`. Falls back to env var if DB setting not found.

---

## 9. UI — `/dashboard/settings`

Single page with 5 sections. Each section has its own **Save** button.

### Section 1: AI Providers
- One row per provider: OpenAI, Google Gemini, Perplexity
- Password input + show/hide toggle per key
- Status badge: `Configured` (green) or `Not set` (gray)
- Separate **Remove** button (with confirmation dialog) to delete a key

### Section 2: Budget Caps
- Number input (USD/day) per provider
- Minimum: $0.00 | Default: $1.00

### Section 3: Scheduler
- Two cron inputs: **Daily Check** and **Weekly Report**
- Human-readable preview under each input using `cronstrue` npm package (to be added as dependency)

### Section 4: Email / SMTP
- Fields: Host, Port, Secure (checkbox), User, Password, From Address, Alert Recipient
- **Send Test Email** button — calls `POST /api/settings/test-email`, shows inline success/error

### Section 5: Security
- New Password + Confirm Password
- Validates: match, minimum 8 characters

### Navigation
- Add **Settings** link to sidebar under Management section

---

## 10. File Changes Summary

| Action   | File                                              | Change                                             |
|----------|---------------------------------------------------|----------------------------------------------------|
| New      | `src/lib/settings.ts`                             | Settings service (read/write/cache/encrypt)        |
| New      | `src/app/api/settings/route.ts`                   | GET + PUT /api/settings                            |
| New      | `src/app/api/settings/[key]/route.ts`             | DELETE /api/settings/:key                          |
| New      | `src/app/api/settings/test-email/route.ts`        | POST test email                                    |
| New      | `src/app/dashboard/settings/page.tsx`             | Settings UI page                                   |
| Modify   | `src/lib/db/schema.ts`                            | Add settings table definition                      |
| Modify   | `src/lib/env.ts`                                  | Make migrated fields optional, add SETTINGS_ENCRYPTION_KEY |
| Modify   | `src/lib/auth.ts`                                 | Read password from DB with env fallback            |
| Modify   | `src/lib/pipeline/budget-checker.ts`              | Read budget caps from getSetting() with env fallback |
| Modify   | `src/lib/email/transporter.ts`                    | Drop singleton, create fresh transporter per call from getSetting() |
| Modify   | `src/app/login/actions.ts`                        | await verifyPassword() (now async)                 |
| Modify   | `src/worker/index.ts`                             | Load settings from DB on startup, poll every 60s  |
| Modify   | `src/worker/handlers/scheduler-setup.ts`                      | Accept cron values as parameters (not from env directly) |
| Modify   | `src/components/dashboard/sidebar.tsx`            | Add Settings link                                  |
| Generate | `src/lib/db/migrations/` (via drizzle-kit generate) | New migration for settings table                 |
| Add dep  | `package.json`                                    | Add `cronstrue` package                           |

---

## 11. Out of Scope

- `DATABASE_URL` and `REDIS_URL` remain in `.env` only (required before DB is available)
- `SETTINGS_ENCRYPTION_KEY` remains in `.env` only (master key cannot be stored in what it encrypts)
- No audit log of settings changes in v1
