# Settings Page Design

**Date:** 2026-03-23
**Project:** SEO AI Monitor

## Overview

Add a Settings page to the dashboard that allows users to configure all system values currently stored in `.env` through a UI. Settings are persisted in the database (not `.env`), take effect immediately without server restart, and sensitive values are encrypted at rest.

---

## 1. Database

### New `settings` table

| Column       | Type      | Description                          |
|--------------|-----------|--------------------------------------|
| `key`        | text (PK) | Setting identifier                   |
| `value`      | text      | Setting value (encrypted or plain)   |
| `isEncrypted`| boolean   | Whether value is AES-256-GCM encoded |
| `updatedAt`  | timestamp | Last modified time                   |

### Encryption

- Algorithm: AES-256-GCM via Node.js `crypto` (built-in, no new dependencies)
- Master key: `SETTINGS_ENCRYPTION_KEY` in `.env` — the only key that must stay in `.env`
- Encrypted values stored with prefix `enc:` to distinguish from plain text

### Encrypted fields

`openai_api_key`, `google_api_key`, `perplexity_api_key`, `smtp_pass`, `auth_password`

### Fallback / Migration

On first load, if the settings table is empty, the system pre-populates values from current `.env` variables automatically. Users do not need to re-enter existing configuration.

---

## 2. Settings Service

**File:** `src/lib/settings.ts`

### API

```ts
getSetting(key: string): Promise<string | null>
setSetting(key: string, value: string, encrypt?: boolean): Promise<void>
getAllSettings(): Promise<Record<string, string>>  // encrypted fields masked as "••••••••"
```

### Caching

In-memory cache with 30-second TTL to reduce DB hits from worker polling.

---

## 3. API Routes

### `GET /api/settings`
Returns all settings. Encrypted field values are replaced with `"••••••••"` in the response. Includes a `isConfigured` boolean for API key fields.

### `PUT /api/settings`
Accepts a partial settings object. Validates input, encrypts sensitive fields, writes to DB.

```json
// Request body example
{
  "daily_budget_openai": "2.0",
  "check_schedule_cron": "0 6 * * *"
}
```

---

## 4. Worker Changes

**File:** `src/worker/index.ts`

- On startup: load settings from DB (fallback to env vars if DB unavailable)
- Every 60 seconds: poll `check_schedule_cron` and `weekly_report_cron` from DB
- If either cron value changed since last poll: cancel existing cron job, reschedule with new value
- If DB read fails during poll: log warning, keep existing schedule, retry next cycle

---

## 5. UI — `/dashboard/settings`

Single page with 5 collapsible sections. Each section has its own **Save** button.

### Section 1: AI Providers
- One row per provider: OpenAI, Google Gemini, Perplexity
- Password input + show/hide toggle per key
- Status badge: `Configured` (green) or `Not set` (gray)
- Saving a blank value for a key removes it from DB (disables that provider)

### Section 2: Budget Caps
- Number input (USD/day) per provider: OpenAI, Perplexity, Gemini
- Minimum: $0.00 | Default: $1.00

### Section 3: Scheduler
- Two cron inputs: **Daily Check** and **Weekly Report**
- Human-readable preview under each input (e.g., `"Every day at midnight"`)
- Uses `cronstrue` library (already available or lightweight alternative)

### Section 4: Email / SMTP
- Fields: Host, Port, Secure (checkbox), User, Password, From Address, Alert Recipient
- **Send Test Email** button — sends test message to `alert_email_to`, shows success/error inline

### Section 5: Security
- New Password + Confirm Password inputs
- Validates match and minimum 8-character length before saving

### Navigation
- Add **Settings** link to sidebar under Management section

---

## 6. File Changes Summary

| Action | File |
|--------|------|
| New | `src/lib/db/migrations/XXXX_add_settings.sql` |
| New | `src/lib/settings.ts` |
| New | `src/app/api/settings/route.ts` |
| New | `src/app/api/settings/test-email/route.ts` |
| New | `src/app/dashboard/settings/page.tsx` |
| Modify | `src/lib/db/schema.ts` (add settings table) |
| Modify | `src/worker/index.ts` (poll + reschedule) |
| Modify | `src/components/dashboard/sidebar.tsx` (add Settings link) |

---

## 7. Out of Scope

- `DATABASE_URL` and `REDIS_URL` remain in `.env` only (required before DB is available)
- `SETTINGS_ENCRYPTION_KEY` remains in `.env` only (master key cannot be stored in what it encrypts)
- No audit log of settings changes in v1
