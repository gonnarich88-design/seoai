# Settings Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Settings page to the dashboard that persists all system configuration in the database, encrypted where appropriate, with immediate effect (no restart required).

**Architecture:** Settings are stored in a `settings` key-value table in PostgreSQL with AES-256-GCM encryption for sensitive values. A `settings.ts` service provides a cached read/write API with DB-first, env-fallback priority. The worker polls DB every 60 seconds for cron changes and reschedules via BullMQ `upsertJobScheduler`.

**Tech Stack:** Drizzle ORM (schema + migrations via drizzle-kit), Node.js `crypto` (AES-256-GCM, built-in), BullMQ `upsertJobScheduler`, Next.js Server Components + API Routes, TailwindCSS, `cronstrue` npm package.

**Spec:** `docs/superpowers/specs/2026-03-23-settings-page-design.md`

---

## Task 1: DB Schema + Migration

**Files:**
- Modify: `src/lib/db/schema.ts`
- Generate: `src/lib/db/migrations/` (via drizzle-kit)

- [ ] **Step 1: Add settings table to schema.ts**

Add after the last table definition (before Relations):

```ts
// ─── Table 7: settings ───────────────────────────────────────────────

export const settings = pgTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  isEncrypted: boolean('is_encrypted').notNull().default(false),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

- [ ] **Step 2: Generate migration**

```bash
npx drizzle-kit generate
```

Expected: new file created in `src/lib/db/migrations/` (e.g. `0001_*_settings.sql`)

- [ ] **Step 3: Apply migration**

```bash
npx drizzle-kit migrate
```

Expected output: `✓ migrations applied successfully!`

- [ ] **Step 4: Commit**

```bash
git add src/lib/db/schema.ts src/lib/db/migrations/
git commit -m "feat: add settings table to schema"
```

---

## Task 2: Settings Service

**Files:**
- Create: `src/lib/settings.ts`

- [ ] **Step 1: Add `SETTINGS_ENCRYPTION_KEY` to `.env` and `.env.example`**

In `.env`, add:
```
SETTINGS_ENCRYPTION_KEY=generate-a-32-char-hex-string-here
```

Generate a proper key:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output into `.env` as the value for `SETTINGS_ENCRYPTION_KEY`.

In `.env.example`, add:
```
# =============================================================================
# Settings Encryption (required — generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
# =============================================================================
SETTINGS_ENCRYPTION_KEY=your-64-char-hex-key-here
```

- [ ] **Step 2: Write the settings service**

Create `src/lib/settings.ts`:

```ts
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { db } from '@/lib/db/client';
import { settings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// ─── Types ───────────────────────────────────────────────────────────

export type SettingKey =
  | 'openai_api_key'
  | 'google_api_key'
  | 'perplexity_api_key'
  | 'daily_budget_openai'
  | 'daily_budget_perplexity'
  | 'daily_budget_gemini'
  | 'check_schedule_cron'
  | 'weekly_report_cron'
  | 'smtp_host'
  | 'smtp_port'
  | 'smtp_secure'
  | 'smtp_user'
  | 'smtp_pass'
  | 'smtp_from'
  | 'alert_email_to'
  | 'auth_password';

const ENCRYPTED_KEYS: Set<SettingKey> = new Set([
  'openai_api_key',
  'google_api_key',
  'perplexity_api_key',
  'smtp_pass',
  'auth_password',
]);

// ─── Env var fallbacks ───────────────────────────────────────────────

const ENV_FALLBACK: Partial<Record<SettingKey, string>> = {
  openai_api_key: process.env.OPENAI_API_KEY,
  google_api_key: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  perplexity_api_key: process.env.PERPLEXITY_API_KEY,
  daily_budget_openai: process.env.DAILY_BUDGET_OPENAI,
  daily_budget_perplexity: process.env.DAILY_BUDGET_PERPLEXITY,
  daily_budget_gemini: process.env.DAILY_BUDGET_GEMINI,
  check_schedule_cron: process.env.CHECK_SCHEDULE_CRON,
  weekly_report_cron: process.env.WEEKLY_REPORT_CRON,
  smtp_host: process.env.SMTP_HOST,
  smtp_port: process.env.SMTP_PORT,
  smtp_secure: process.env.SMTP_SECURE,
  smtp_user: process.env.SMTP_USER,
  smtp_pass: process.env.SMTP_PASS,
  smtp_from: process.env.SMTP_FROM,
  alert_email_to: process.env.ALERT_EMAIL_TO,
  auth_password: process.env.AUTH_PASSWORD,
};

// ─── Encryption ───────────────────────────────────────────────────────

const ALGORITHM = 'aes-256-gcm';

function getEncryptionKey(): Buffer {
  const hex = process.env.SETTINGS_ENCRYPTION_KEY;
  if (!hex) throw new Error('SETTINGS_ENCRYPTION_KEY is not set');
  return Buffer.from(hex, 'hex');
}

function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return 'enc:' + Buffer.concat([iv, tag, encrypted]).toString('base64');
}

function decrypt(ciphertext: string): string {
  if (!ciphertext.startsWith('enc:')) return ciphertext;
  const key = getEncryptionKey();
  const buf = Buffer.from(ciphertext.slice(4), 'base64');
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const encrypted = buf.subarray(28);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(encrypted) + decipher.final('utf8');
}

// ─── In-memory cache (30s TTL) ───────────────────────────────────────

type CacheEntry = { value: string | null; expiresAt: number };
const cache = new Map<SettingKey, CacheEntry>();
const CACHE_TTL_MS = 30_000;

function getCached(key: SettingKey): string | null | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return undefined;
  }
  return entry.value;
}

function setCached(key: SettingKey, value: string | null): void {
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

// ─── Public API ───────────────────────────────────────────────────────

export async function getSetting(key: SettingKey): Promise<string | null> {
  const cached = getCached(key);
  if (cached !== undefined) return cached;

  try {
    const [row] = await db
      .select()
      .from(settings)
      .where(eq(settings.key, key))
      .limit(1);

    if (row) {
      const value = row.isEncrypted ? decrypt(row.value) : row.value;
      setCached(key, value);
      return value;
    }
  } catch {
    // DB unavailable — fall through to env fallback
  }

  const fallback = ENV_FALLBACK[key] ?? null;
  setCached(key, fallback);
  return fallback;
}

export async function setSetting(key: SettingKey, value: string): Promise<void> {
  const shouldEncrypt = ENCRYPTED_KEYS.has(key);
  const storedValue = shouldEncrypt ? encrypt(value) : value;

  await db
    .insert(settings)
    .values({ key, value: storedValue, isEncrypted: shouldEncrypt, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value: storedValue, updatedAt: new Date() },
    });

  setCached(key, value);
}

export async function deleteSetting(key: SettingKey): Promise<void> {
  await db.delete(settings).where(eq(settings.key, key));
  cache.delete(key);
}

export async function getAllSettings(): Promise<Record<SettingKey, { value: string | null; isConfigured: boolean }>> {
  const rows = await db.select().from(settings);
  const dbMap = new Map(rows.map((r) => [r.key, r]));

  const allKeys: SettingKey[] = [
    'openai_api_key', 'google_api_key', 'perplexity_api_key',
    'daily_budget_openai', 'daily_budget_perplexity', 'daily_budget_gemini',
    'check_schedule_cron', 'weekly_report_cron',
    'smtp_host', 'smtp_port', 'smtp_secure', 'smtp_user', 'smtp_pass', 'smtp_from', 'alert_email_to',
    'auth_password',
  ];

  const result = {} as Record<SettingKey, { value: string | null; isConfigured: boolean }>;

  for (const key of allKeys) {
    const row = dbMap.get(key);
    const isEncrypted = ENCRYPTED_KEYS.has(key);

    if (row) {
      result[key] = {
        value: isEncrypted ? '••••••••' : row.value,
        isConfigured: true,
      };
    } else {
      const fallback = ENV_FALLBACK[key] ?? null;
      result[key] = {
        value: isEncrypted && fallback ? '••••••••' : fallback,
        isConfigured: isEncrypted ? !!fallback : !!fallback,
      };
    }
  }

  return result;
}

export async function seedSettingsFromEnv(): Promise<void> {
  const existing = await db.select({ key: settings.key }).from(settings);
  if (existing.length > 0) return; // already seeded

  const entries: { key: SettingKey; value: string }[] = [];

  for (const [key, value] of Object.entries(ENV_FALLBACK) as [SettingKey, string | undefined][]) {
    if (value) entries.push({ key, value });
  }

  for (const { key, value } of entries) {
    await setSetting(key, value);
  }

  if (entries.length > 0) {
    console.log(`Seeded ${entries.length} settings from env`);
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/settings.ts .env.example
git commit -m "feat: add settings service with encryption and caching"
```

---

## Task 3: Update env.ts

**Files:**
- Modify: `src/lib/env.ts`

- [ ] **Step 1: Update env.ts**

Replace the file content:

```ts
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  SETTINGS_ENCRYPTION_KEY: z.string().min(1),
  // Fields below are now optional — managed via Settings UI (DB-first, env fallback)
  AUTH_PASSWORD: z.string().min(8).optional(),
  OPENAI_API_KEY: z.string().optional(),
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().optional(),
  PERPLEXITY_API_KEY: z.string().optional(),
  DAILY_BUDGET_OPENAI: z.coerce.number().default(1.0),
  DAILY_BUDGET_PERPLEXITY: z.coerce.number().default(1.0),
  DAILY_BUDGET_GEMINI: z.coerce.number().default(1.0),
  CHECK_SCHEDULE_CRON: z.string().default('0 0 * * *'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_SECURE: z.string().default('false'),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default('SEO AI Monitor <noreply@localhost>'),
  ALERT_EMAIL_TO: z.string().optional(),
  WEEKLY_REPORT_CRON: z.string().default('0 9 * * 1'),
});

export const env = envSchema.parse(process.env);
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/env.ts
git commit -m "feat: make migrated env fields optional, require SETTINGS_ENCRYPTION_KEY"
```

---

## Task 4: Update auth.ts, budget-checker.ts, and transporter.ts

**Files:**
- Modify: `src/lib/auth.ts`
- Modify: `src/app/login/actions.ts`
- Modify: `src/lib/pipeline/budget-checker.ts`
- Modify: `src/lib/email/transporter.ts`

- [ ] **Step 1: Update auth.ts**

Replace `verifyPassword`:

```ts
import { cookies } from 'next/headers';
import { getSetting } from '@/lib/settings';

const AUTH_COOKIE_NAME = 'seoai-auth';
const AUTH_COOKIE_VALUE = 'authenticated';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export async function verifyPassword(input: string): Promise<boolean> {
  const password = await getSetting('auth_password');
  return input === password;
}

export async function setAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, AUTH_COOKIE_VALUE, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });
}

export async function clearAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
}

export { AUTH_COOKIE_NAME, AUTH_COOKIE_VALUE };
```

- [ ] **Step 2: Update login/actions.ts to await verifyPassword**

```ts
'use server';

import { redirect } from 'next/navigation';
import { verifyPassword, setAuthCookie } from '@/lib/auth';

export async function loginAction(formData: FormData) {
  const password = formData.get('password') as string;

  if (!password || !(await verifyPassword(password))) {
    return { error: 'Invalid password' };
  }

  await setAuthCookie();
  redirect('/');
}
```

- [ ] **Step 3: Update budget-checker.ts**

Replace `getBudgetCap`:

```ts
import { db } from '@/lib/db/client';
import { queryRuns } from '@/lib/db/schema';
import { sql, eq, and, gte, lt } from 'drizzle-orm';
import type { ProviderId } from '@/lib/ai/providers';
import { getSetting, type SettingKey } from '@/lib/settings';

const BUDGET_SETTING_MAP: Record<ProviderId, SettingKey> = {
  chatgpt: 'daily_budget_openai',
  perplexity: 'daily_budget_perplexity',
  gemini: 'daily_budget_gemini',
};

export async function getBudgetCap(providerId: ProviderId): Promise<number> {
  const key = BUDGET_SETTING_MAP[providerId];
  const value = await getSetting(key);
  return parseFloat(value ?? '1.0');
}

export async function checkBudget(providerId: ProviderId): Promise<boolean> {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

  const [result] = await db
    .select({ total: sql<string>`COALESCE(SUM(${queryRuns.costUsd}), 0)` })
    .from(queryRuns)
    .where(and(
      eq(queryRuns.providerId, providerId),
      gte(queryRuns.createdAt, today),
      lt(queryRuns.createdAt, tomorrow),
    ));

  const spent = parseFloat(result?.total || '0');
  const cap = await getBudgetCap(providerId);
  return spent < cap;
}
```

- [ ] **Step 4: Update transporter.ts**

Replace the file completely (drop singleton, read from getSetting):

```ts
import nodemailer from 'nodemailer';
import { getSetting } from '@/lib/settings';

export async function getTransporter(): Promise<nodemailer.Transporter> {
  const [host, port, secure, user, pass] = await Promise.all([
    getSetting('smtp_host'),
    getSetting('smtp_port'),
    getSetting('smtp_secure'),
    getSetting('smtp_user'),
    getSetting('smtp_pass'),
  ]);

  return nodemailer.createTransport({
    host: host ?? undefined,
    port: Number(port ?? 587),
    secure: secure === 'true',
    auth: user ? { user: user ?? undefined, pass: pass ?? undefined } : undefined,
  });
}

export async function isEmailConfigured(): Promise<boolean> {
  const host = await getSetting('smtp_host');
  return !!host;
}
```

- [ ] **Step 5: Update alert-notify-handler.ts**

Replace the entire file:

```ts
import type { Job } from 'bullmq';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { alerts, keywords, brands } from '@/lib/db/schema';
import { getTransporter, isEmailConfigured } from '@/lib/email/transporter';
import { renderAlertEmail } from '@/lib/email/templates/alert-notification';
import { getSetting } from '@/lib/settings';

export async function handleAlertNotifyJob(
  job: Job<{ alertId: string }>,
): Promise<void> {
  const rows = await db
    .select({
      alert: alerts,
      keyword: { label: keywords.label },
      brand: { name: brands.name },
    })
    .from(alerts)
    .leftJoin(keywords, eq(alerts.keywordId, keywords.id))
    .leftJoin(brands, eq(alerts.brandId, brands.id))
    .where(eq(alerts.id, job.data.alertId));

  if (rows.length === 0) {
    console.log(`Alert ${job.data.alertId} not found, skipping notification`);
    return;
  }

  const { alert, keyword, brand } = rows[0];

  if (!(await isEmailConfigured())) {
    console.log('SMTP not configured, skipping email notification');
    return;
  }

  const recipient = await getSetting('alert_email_to');
  if (!recipient) {
    console.log('alert_email_to not set, skipping email notification');
    return;
  }

  const { subject, html } = renderAlertEmail({
    alertType: alert.alertType,
    brandName: brand?.name ?? 'Unknown Brand',
    keywordLabel: keyword?.label ?? 'Unknown Keyword',
    previousValue: alert.previousValue as string | null,
    currentValue: alert.currentValue as string,
    providerId: 'N/A',
  });

  const from = await getSetting('smtp_from') ?? 'SEO AI Monitor <noreply@localhost>';

  // Send email -- if this throws, BullMQ will retry (notifiedAt NOT set)
  const transporter = await getTransporter();
  await transporter.sendMail({ from, to: recipient, subject, html });

  // Only set notifiedAt after successful delivery
  await db
    .update(alerts)
    .set({ notifiedAt: new Date() })
    .where(eq(alerts.id, job.data.alertId));

  console.log(`Email notification sent for alert ${job.data.alertId}`);
}
```

- [ ] **Step 6: Update weekly-report-handler.ts**

Replace `isEmailConfigured()`, `getTransporter()`, `process.env.ALERT_EMAIL_TO`, and `process.env.SMTP_FROM`:

```ts
import type { Job } from 'bullmq';
import { subDays, format } from 'date-fns';
import { and, gte, lte, sql, eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { dailySnapshots, keywords, brands, alerts } from '@/lib/db/schema';
import { getTransporter, isEmailConfigured } from '@/lib/email/transporter';
import { renderWeeklyReport } from '@/lib/email/templates/weekly-report';
import { getSetting } from '@/lib/settings';

export async function handleWeeklyReportJob(job: Job): Promise<void> {
  const endDate = format(subDays(new Date(), 1), 'yyyy-MM-dd');
  const startDate = format(subDays(new Date(), 8), 'yyyy-MM-dd');

  const snapshots = await db
    .select({
      date: dailySnapshots.date,
      keyword: keywords.label,
      brand: brands.name,
      provider: dailySnapshots.providerId,
      mentionRate: dailySnapshots.mentionRate,
      avgPosition: dailySnapshots.avgPosition,
    })
    .from(dailySnapshots)
    .leftJoin(keywords, eq(dailySnapshots.keywordId, keywords.id))
    .leftJoin(brands, eq(dailySnapshots.brandId, brands.id))
    .where(and(gte(dailySnapshots.date, startDate), lte(dailySnapshots.date, endDate)))
    .orderBy(dailySnapshots.date);

  if (snapshots.length === 0) {
    console.log('Weekly report: no data in range, skipping');
    return;
  }

  if (!(await isEmailConfigured())) {
    console.log('Weekly report: email not configured, skipping');
    return;
  }

  const recipientEmail = await getSetting('alert_email_to');
  if (!recipientEmail) {
    console.log('Weekly report: alert_email_to not set, skipping');
    return;
  }

  const startOfRange = new Date(`${startDate}T00:00:00Z`);
  const endOfRange = new Date(`${endDate}T23:59:59Z`);

  const alertCountResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(alerts)
    .where(and(gte(alerts.createdAt, startOfRange), lte(alerts.createdAt, endOfRange)));

  const alertCount = Number(alertCountResult[0]?.count ?? 0);

  const { subject, html } = renderWeeklyReport({
    startDate,
    endDate,
    snapshots: snapshots.map((s) => ({
      date: s.date,
      keyword: s.keyword ?? 'Unknown',
      brand: s.brand ?? 'Unknown',
      provider: s.provider,
      mentionRate: s.mentionRate ?? '0',
      avgPosition: s.avgPosition,
    })),
    alertCount,
  });

  const from = await getSetting('smtp_from') ?? 'SEO AI Monitor <noreply@localhost>';
  const transporter = await getTransporter();
  await transporter.sendMail({ from, to: recipientEmail, subject, html });

  console.log(`Weekly report sent for ${startDate} to ${endDate}`);
}
```

- [ ] **Step 7: Update transporter.test.ts (now async)**

Replace `src/lib/email/__tests__/transporter.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn().mockReturnValue({
      sendMail: vi.fn().mockResolvedValue({ messageId: 'test-id' }),
    }),
  },
}));

vi.mock('@/lib/settings', () => ({
  getSetting: vi.fn().mockImplementation(async (key: string) => {
    const map: Record<string, string> = {
      smtp_host: 'smtp.example.com',
      smtp_port: '587',
      smtp_secure: 'false',
      smtp_user: 'user@example.com',
      smtp_pass: 'secret',
    };
    return map[key] ?? null;
  }),
}));

import { getTransporter, isEmailConfigured } from '../transporter';
import { renderAlertEmail } from '../templates/alert-notification';

describe('transporter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getTransporter returns a transporter object', async () => {
    const transporter = await getTransporter();
    expect(transporter).toBeDefined();
    expect(transporter).toHaveProperty('sendMail');
  });

  it('isEmailConfigured returns true when smtp_host is set in settings', async () => {
    expect(await isEmailConfigured()).toBe(true);
  });

  it('isEmailConfigured returns false when smtp_host is null', async () => {
    const { getSetting } = await import('@/lib/settings');
    vi.mocked(getSetting).mockResolvedValueOnce(null);
    expect(await isEmailConfigured()).toBe(false);
  });
});

describe('renderAlertEmail', () => {
  it('returns subject and html with expected content', () => {
    const result = renderAlertEmail({
      alertType: 'brand_appeared',
      brandName: 'Acme Corp',
      keywordLabel: 'best CRM software',
      previousValue: '0.0000',
      currentValue: '0.5000',
      providerId: 'chatgpt',
    });

    expect(result.subject).toContain('brand_appeared');
    expect(result.subject).toContain('Acme Corp');
    expect(result.html).toContain('Acme Corp');
    expect(result.html).toContain('chatgpt');
  });
});
```

- [ ] **Step 8: Commit**

```bash
git add src/lib/auth.ts src/app/login/actions.ts src/lib/pipeline/budget-checker.ts src/lib/email/ src/worker/handlers/
git commit -m "feat: update auth, budget, transporter, handlers to read from settings service"
```

---

## Task 5: API Routes

**Files:**
- Create: `src/app/api/settings/route.ts`
- Create: `src/app/api/settings/[key]/route.ts`
- Create: `src/app/api/settings/test-email/route.ts`

- [ ] **Step 1: Create GET + PUT /api/settings**

Create `src/app/api/settings/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAllSettings, setSetting } from '@/lib/settings';

const cronRegex = /^(\*|[0-9,\-\/]+)\s+(\*|[0-9,\-\/]+)\s+(\*|[0-9,\-\/]+)\s+(\*|[0-9,\-\/]+)\s+(\*|[0-9,\-\/]+)$/;

const updateSettingsSchema = z.object({
  openai_api_key:          z.string().optional(),
  google_api_key:          z.string().optional(),
  perplexity_api_key:      z.string().optional(),
  daily_budget_openai:     z.coerce.number().min(0).optional(),
  daily_budget_perplexity: z.coerce.number().min(0).optional(),
  daily_budget_gemini:     z.coerce.number().min(0).optional(),
  check_schedule_cron:     z.string().regex(cronRegex, 'Invalid cron expression').optional(),
  weekly_report_cron:      z.string().regex(cronRegex, 'Invalid cron expression').optional(),
  smtp_host:               z.string().optional(),
  smtp_port:               z.coerce.number().int().min(1).max(65535).optional(),
  smtp_secure:             z.boolean().optional(),
  smtp_user:               z.string().optional(),
  smtp_pass:               z.string().optional(),
  smtp_from:               z.string().optional(),
  alert_email_to:          z.string().email().optional(),
  auth_password:           z.string().min(8).optional(),
}).strict(); // reject unknown keys

export async function GET() {
  try {
    const data = await getAllSettings();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to load settings' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const parsed = updateSettingsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const updates = parsed.data;

    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined) continue;
      // Empty string for non-encrypted fields treated as no-op
      if (value === '') continue;
      await setSetting(key as Parameters<typeof setSetting>[0], String(value));
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Create DELETE /api/settings/:key**

Create `src/app/api/settings/[key]/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { deleteSetting, type SettingKey } from '@/lib/settings';

const DELETABLE_KEYS = new Set<SettingKey>([
  'openai_api_key',
  'google_api_key',
  'perplexity_api_key',
]);

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  const { key } = await params;

  if (!DELETABLE_KEYS.has(key as SettingKey)) {
    return NextResponse.json({ error: 'Key cannot be deleted' }, { status: 400 });
  }

  await deleteSetting(key as SettingKey);
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 3: Create POST /api/settings/test-email**

Create `src/app/api/settings/test-email/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { getTransporter, isEmailConfigured } from '@/lib/email/transporter';
import { getSetting } from '@/lib/settings';

export async function POST() {
  if (!(await isEmailConfigured())) {
    return NextResponse.json({ error: 'SMTP is not configured' }, { status: 400 });
  }

  const to = await getSetting('alert_email_to');
  if (!to) {
    return NextResponse.json({ error: 'Alert email recipient (alert_email_to) is not configured' }, { status: 400 });
  }

  try {
    const transporter = await getTransporter();
    const from = await getSetting('smtp_from') ?? 'SEO AI Monitor';

    await transporter.sendMail({
      from,
      to,
      subject: 'SEO AI Monitor — Test Email',
      text: 'This is a test email from SEO AI Monitor. Your SMTP configuration is working correctly.',
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: `Failed to send email: ${message}` }, { status: 500 });
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/settings/
git commit -m "feat: add settings API routes (GET, PUT, DELETE, test-email)"
```

---

## Task 6: Worker — Scheduler Polling

**Files:**
- Modify: `src/worker/handlers/scheduler-setup.ts`
- Modify: `src/worker/index.ts`

- [ ] **Step 1: Update scheduler-setup.ts to accept cron params**

Replace file:

```ts
import { seoaiQueue } from '@/lib/queue/queues';

export async function setupDailyScheduler(
  checkCron?: string,
  weeklyCron?: string,
) {
  const cronPattern = checkCron ?? process.env.CHECK_SCHEDULE_CRON ?? '0 0 * * *';
  const weeklyReportCron = weeklyCron ?? process.env.WEEKLY_REPORT_CRON ?? '0 9 * * 1';

  await seoaiQueue.upsertJobScheduler(
    'daily-check-scheduler',
    { pattern: cronPattern },
    {
      name: 'scheduled-check',
      data: { type: 'daily' },
      opts: { priority: 10 },
    },
  );

  await seoaiQueue.upsertJobScheduler(
    'weekly-report-scheduler',
    { pattern: weeklyReportCron },
    {
      name: 'weekly-report',
      data: {},
      opts: { priority: 10 },
    },
  );

  console.log(`Schedulers configured — check: ${cronPattern}, weekly: ${weeklyReportCron}`);
}
```

- [ ] **Step 2: Replace the tail of worker/index.ts in one operation**

In `src/worker/index.ts`:

1. Add these two imports at the top with the other imports:
```ts
import { getSetting, seedSettingsFromEnv } from '@/lib/settings';
```

2. Find and **replace** these two lines at the bottom of the file (lines 95–97):
```ts
// Initialize daily scheduler on worker startup
setupDailyScheduler().catch(err => console.error('Failed to setup daily scheduler:', err));

console.log('Worker started, waiting for jobs...');
```

Replace them with:
```ts
// Initialize on startup
async function initialize() {
  await seedSettingsFromEnv();

  const checkCron = await getSetting('check_schedule_cron') ?? undefined;
  const weeklyCron = await getSetting('weekly_report_cron') ?? undefined;
  await setupDailyScheduler(checkCron, weeklyCron);

  // Poll for cron changes every 60 seconds
  let lastCheckCron = checkCron;
  let lastWeeklyCron = weeklyCron;

  setInterval(async () => {
    try {
      const newCheckCron = await getSetting('check_schedule_cron') ?? undefined;
      const newWeeklyCron = await getSetting('weekly_report_cron') ?? undefined;
      if (newCheckCron !== lastCheckCron || newWeeklyCron !== lastWeeklyCron) {
        console.log('Cron schedule changed, rescheduling...');
        await setupDailyScheduler(newCheckCron, newWeeklyCron);
        lastCheckCron = newCheckCron;
        lastWeeklyCron = newWeeklyCron;
      }
    } catch (err) {
      console.warn('Failed to poll cron settings:', err);
    }
  }, 60_000);
}

initialize().catch(err => console.error('Worker initialization failed:', err));

console.log('Worker started, waiting for jobs...');
```

The old `setupDailyScheduler().catch(...)` call MUST be removed as part of this step — not deferred.

- [ ] **Step 4: Commit**

```bash
git add src/worker/
git commit -m "feat: load scheduler cron from DB, poll every 60s for changes"
```

---

## Task 7: Install cronstrue

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install cronstrue**

```bash
npm install cronstrue
```

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add cronstrue for human-readable cron previews"
```

---

## Task 8: Settings UI Page

**Files:**
- Create: `src/app/dashboard/settings/page.tsx`
- Modify: `src/components/dashboard/sidebar.tsx`

- [ ] **Step 1: Add Settings link to sidebar**

In `src/components/dashboard/sidebar.tsx`, add to `managementLinks`:

```ts
const managementLinks = [
  { label: 'Keywords', href: '/dashboard/keywords' },
  { label: 'Brands', href: '/dashboard/brands' },
  { label: 'Settings', href: '/dashboard/settings' },
];
```

- [ ] **Step 2: Create Settings page**

Create `src/app/dashboard/settings/page.tsx`:

```tsx
'use client';

import { useState, useEffect } from 'react';
import cronstrue from 'cronstrue';

type SettingEntry = { value: string | null; isConfigured: boolean };
type SettingsMap = Record<string, SettingEntry>;

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h2 className="text-base font-semibold text-gray-900 mb-4">{title}</h2>
      {children}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-sm font-medium text-gray-700 mb-1">{children}</label>;
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 ${props.className ?? ''}`}
    />
  );
}

function SaveButton({ loading, onClick }: { loading: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
    >
      {loading ? 'Saving...' : 'Save'}
    </button>
  );
}

function StatusBadge({ configured }: { configured: boolean }) {
  return configured ? (
    <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">Configured</span>
  ) : (
    <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">Not set</span>
  );
}

function CronPreview({ value }: { value: string }) {
  try {
    return <p className="text-xs text-gray-500 mt-1">{cronstrue.toString(value)}</p>;
  } catch {
    return <p className="text-xs text-red-500 mt-1">Invalid cron expression</p>;
  }
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsMap>({});
  const [loading, setLoading] = useState(true);

  // Section-level state
  const [apiKeys, setApiKeys] = useState({ openai_api_key: '', google_api_key: '', perplexity_api_key: '' });
  const [showKey, setShowKey] = useState({ openai_api_key: false, google_api_key: false, perplexity_api_key: false });
  const [budgets, setBudgets] = useState({ daily_budget_openai: '1.0', daily_budget_perplexity: '1.0', daily_budget_gemini: '1.0' });
  const [crons, setCrons] = useState({ check_schedule_cron: '0 0 * * *', weekly_report_cron: '0 9 * * 1' });
  const [smtp, setSmtp] = useState({ smtp_host: '', smtp_port: '587', smtp_secure: false, smtp_user: '', smtp_pass: '', smtp_from: '', alert_email_to: '' });
  const [security, setSecurity] = useState({ newPassword: '', confirmPassword: '' });
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [messages, setMessages] = useState<Record<string, { type: 'success' | 'error'; text: string }>>({});
  const [testEmailLoading, setTestEmailLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data: SettingsMap) => {
        setSettings(data);
        setBudgets({
          daily_budget_openai: data.daily_budget_openai?.value ?? '1.0',
          daily_budget_perplexity: data.daily_budget_perplexity?.value ?? '1.0',
          daily_budget_gemini: data.daily_budget_gemini?.value ?? '1.0',
        });
        setCrons({
          check_schedule_cron: data.check_schedule_cron?.value ?? '0 0 * * *',
          weekly_report_cron: data.weekly_report_cron?.value ?? '0 9 * * 1',
        });
        setSmtp({
          smtp_host: data.smtp_host?.value ?? '',
          smtp_port: data.smtp_port?.value ?? '587',
          smtp_secure: data.smtp_secure?.value === 'true',
          smtp_user: data.smtp_user?.value ?? '',
          smtp_pass: '',
          smtp_from: data.smtp_from?.value ?? '',
          alert_email_to: data.alert_email_to?.value ?? '',
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function save(section: string, data: Record<string, string | boolean | number>) {
    setSaving((s) => ({ ...s, [section]: true }));
    setMessages((m) => ({ ...m, [section]: undefined as never }));

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(json.error));
      setMessages((m) => ({ ...m, [section]: { type: 'success', text: 'Saved successfully' } }));
      // Refresh settings to update badges
      const refreshed = await fetch('/api/settings').then((r) => r.json());
      setSettings(refreshed);
    } catch (err) {
      setMessages((m) => ({ ...m, [section]: { type: 'error', text: String(err) } }));
    } finally {
      setSaving((s) => ({ ...s, [section]: false }));
    }
  }

  async function deleteKey(key: string) {
    await fetch(`/api/settings/${key}`, { method: 'DELETE' });
    setDeleteConfirm(null);
    const refreshed = await fetch('/api/settings').then((r) => r.json());
    setSettings(refreshed);
  }

  async function sendTestEmail() {
    setTestEmailLoading(true);
    setMessages((m) => ({ ...m, smtp: undefined as never }));
    try {
      const res = await fetch('/api/settings/test-email', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setMessages((m) => ({ ...m, smtp: { type: 'success', text: 'Test email sent successfully' } }));
    } catch (err) {
      setMessages((m) => ({ ...m, smtp: { type: 'error', text: String(err) } }));
    } finally {
      setTestEmailLoading(false);
    }
  }

  function Message({ section }: { section: string }) {
    const msg = messages[section];
    if (!msg) return null;
    return (
      <p className={`text-sm mt-2 ${msg.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
        {msg.text}
      </p>
    );
  }

  if (loading) {
    return <div className="p-6 text-gray-500 text-sm">Loading settings...</div>;
  }

  const apiProviders = [
    { key: 'openai_api_key', label: 'OpenAI API Key' },
    { key: 'google_api_key', label: 'Google Gemini API Key' },
    { key: 'perplexity_api_key', label: 'Perplexity API Key' },
  ] as const;

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Settings</h1>

      {/* AI Providers */}
      <SectionCard title="AI Providers">
        <div className="space-y-4">
          {apiProviders.map(({ key, label }) => (
            <div key={key}>
              <div className="flex items-center justify-between mb-1">
                <Label>{label}</Label>
                <StatusBadge configured={settings[key]?.isConfigured ?? false} />
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showKey[key] ? 'text' : 'password'}
                    value={apiKeys[key]}
                    onChange={(e) => setApiKeys((k) => ({ ...k, [key]: e.target.value }))}
                    placeholder={settings[key]?.isConfigured ? '••••••••' : 'Enter API key'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey((s) => ({ ...s, [key]: !s[key] }))}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
                  >
                    {showKey[key] ? 'Hide' : 'Show'}
                  </button>
                </div>
                {settings[key]?.isConfigured && (
                  <button
                    onClick={() => setDeleteConfirm(key)}
                    className="px-3 py-2 text-sm text-red-600 border border-red-200 rounded-md hover:bg-red-50"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-end mt-4">
          <SaveButton
            loading={!!saving.apiKeys}
            onClick={() => {
              const updates: Record<string, string> = {};
              for (const { key } of apiProviders) {
                if (apiKeys[key]) updates[key] = apiKeys[key];
              }
              save('apiKeys', updates);
              setApiKeys({ openai_api_key: '', google_api_key: '', perplexity_api_key: '' });
            }}
          />
        </div>
        <Message section="apiKeys" />
      </SectionCard>

      {/* Delete confirmation dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-base font-semibold text-gray-900 mb-2">Remove API Key</h3>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to remove this API key? This cannot be undone from the UI.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteKey(deleteConfirm)}
                className="px-4 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Budget Caps */}
      <SectionCard title="Daily Budget Caps (USD)">
        <div className="grid grid-cols-3 gap-4">
          {[
            { key: 'daily_budget_openai', label: 'OpenAI' },
            { key: 'daily_budget_perplexity', label: 'Perplexity' },
            { key: 'daily_budget_gemini', label: 'Gemini' },
          ].map(({ key, label }) => (
            <div key={key}>
              <Label>{label}</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <Input
                  type="number"
                  min="0"
                  step="0.1"
                  value={budgets[key as keyof typeof budgets]}
                  onChange={(e) => setBudgets((b) => ({ ...b, [key]: e.target.value }))}
                  className="pl-6"
                />
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-end mt-4">
          <SaveButton loading={!!saving.budgets} onClick={() => save('budgets', budgets)} />
        </div>
        <Message section="budgets" />
      </SectionCard>

      {/* Scheduler */}
      <SectionCard title="Scheduler">
        {[
          { key: 'check_schedule_cron', label: 'Daily Check' },
          { key: 'weekly_report_cron', label: 'Weekly Report' },
        ].map(({ key, label }) => (
          <div key={key} className="mb-4">
            <Label>{label}</Label>
            <Input
              type="text"
              value={crons[key as keyof typeof crons]}
              onChange={(e) => setCrons((c) => ({ ...c, [key]: e.target.value }))}
              placeholder="e.g. 0 0 * * *"
            />
            <CronPreview value={crons[key as keyof typeof crons]} />
          </div>
        ))}
        <div className="flex justify-end mt-2">
          <SaveButton loading={!!saving.crons} onClick={() => save('crons', crons)} />
        </div>
        <Message section="crons" />
      </SectionCard>

      {/* Email / SMTP */}
      <SectionCard title="Email / SMTP">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>SMTP Host</Label>
              <Input value={smtp.smtp_host} onChange={(e) => setSmtp((s) => ({ ...s, smtp_host: e.target.value }))} placeholder="smtp.gmail.com" />
            </div>
            <div>
              <Label>Port</Label>
              <Input type="number" value={smtp.smtp_port} onChange={(e) => setSmtp((s) => ({ ...s, smtp_port: e.target.value }))} placeholder="587" />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={smtp.smtp_secure}
              onChange={(e) => setSmtp((s) => ({ ...s, smtp_secure: e.target.checked }))}
              className="rounded border-gray-300"
            />
            Use TLS (SMTP Secure)
          </label>
          <div>
            <Label>SMTP Username</Label>
            <Input value={smtp.smtp_user} onChange={(e) => setSmtp((s) => ({ ...s, smtp_user: e.target.value }))} placeholder="you@gmail.com" />
          </div>
          <div>
            <Label>SMTP Password</Label>
            <Input type="password" value={smtp.smtp_pass} onChange={(e) => setSmtp((s) => ({ ...s, smtp_pass: e.target.value }))} placeholder={settings.smtp_pass?.isConfigured ? '••••••••' : 'Enter password'} />
          </div>
          <div>
            <Label>From Address</Label>
            <Input value={smtp.smtp_from} onChange={(e) => setSmtp((s) => ({ ...s, smtp_from: e.target.value }))} placeholder="SEO AI Monitor <noreply@yourdomain.com>" />
          </div>
          <div>
            <Label>Alert Recipient Email</Label>
            <Input type="email" value={smtp.alert_email_to} onChange={(e) => setSmtp((s) => ({ ...s, alert_email_to: e.target.value }))} placeholder="team@yourdomain.com" />
          </div>
        </div>
        <div className="flex justify-between items-center mt-4">
          <button
            onClick={sendTestEmail}
            disabled={testEmailLoading}
            className="px-4 py-2 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {testEmailLoading ? 'Sending...' : 'Send Test Email'}
          </button>
          <SaveButton
            loading={!!saving.smtp}
            onClick={() => {
              const data: Record<string, string | boolean> = {
                smtp_host: smtp.smtp_host,
                smtp_port: smtp.smtp_port,
                smtp_secure: smtp.smtp_secure,
                smtp_user: smtp.smtp_user,
                smtp_from: smtp.smtp_from,
                alert_email_to: smtp.alert_email_to,
              };
              if (smtp.smtp_pass) data.smtp_pass = smtp.smtp_pass;
              save('smtp', data);
            }}
          />
        </div>
        <Message section="smtp" />
      </SectionCard>

      {/* Security */}
      <SectionCard title="Security">
        <div className="space-y-3">
          <div>
            <Label>New Password</Label>
            <Input
              type="password"
              value={security.newPassword}
              onChange={(e) => setSecurity((s) => ({ ...s, newPassword: e.target.value }))}
              placeholder="Minimum 8 characters"
            />
          </div>
          <div>
            <Label>Confirm Password</Label>
            <Input
              type="password"
              value={security.confirmPassword}
              onChange={(e) => setSecurity((s) => ({ ...s, confirmPassword: e.target.value }))}
              placeholder="Repeat new password"
            />
          </div>
        </div>
        <div className="flex justify-end mt-4">
          <SaveButton
            loading={!!saving.security}
            onClick={() => {
              if (security.newPassword !== security.confirmPassword) {
                setMessages((m) => ({ ...m, security: { type: 'error', text: 'Passwords do not match' } }));
                return;
              }
              if (security.newPassword.length < 8) {
                setMessages((m) => ({ ...m, security: { type: 'error', text: 'Password must be at least 8 characters' } }));
                return;
              }
              save('security', { auth_password: security.newPassword });
              setSecurity({ newPassword: '', confirmPassword: '' });
            }}
          />
        </div>
        <Message section="security" />
      </SectionCard>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/settings/ src/components/dashboard/sidebar.tsx
git commit -m "feat: add settings page UI with 5 sections"
```

---

## Task 9: Seed on First Load + Smoke Test

- [ ] **Step 1: Verify app starts without errors**

```bash
npm run dev
```

Open `http://localhost:3000` — should redirect to `/login`.

- [ ] **Step 2: Login and verify settings page loads**

Navigate to `http://localhost:3000/dashboard/settings`. All 5 sections should render. Budget caps should show values from `.env`. API key badges should show `Configured` if keys were set in `.env`.

- [ ] **Step 3: Test saving a budget cap**

Change OpenAI budget to `2.0`, click Save. Should show "Saved successfully". Refresh — value should persist.

- [ ] **Step 4: Test cron preview**

Enter `0 9 * * 1` in Weekly Report field. Should show `"Every Monday at 9:00 AM"`.

- [ ] **Step 5: Run existing tests**

```bash
npx vitest --run
```

Expected: all tests pass (no regressions).

- [ ] **Step 6: Final commit**

```bash
git add .
git commit -m "feat: settings page complete — DB-backed config with encryption"
```
