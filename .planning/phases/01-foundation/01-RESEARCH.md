# Phase 1: Foundation - Research

**Researched:** 2026-03-21
**Domain:** Project scaffolding, database schema, job queue, AI SDK, authentication
**Confidence:** HIGH

## Summary

Phase 1 establishes the full infrastructure for the SEO AI Monitor: a Next.js 15 App Router application with TypeScript, PostgreSQL database via Drizzle ORM with all six core tables, BullMQ + Redis for job scheduling, Vercel AI SDK integration for unified AI provider access, and simple authentication. This is a greenfield project -- no existing codebase.

The schema design is the most critical deliverable because Phase 2 (Data Pipeline) depends directly on it. The schema must support multi-sample queries (DATA-05: 3 runs per check cycle), prompt versioning (DATA-08), raw response storage (DATA-07), and cost tracking (DATA-06) from day one. Retrofitting these later would require migrations and data loss.

**Primary recommendation:** Use Next.js 15.x (not 16.x), Drizzle ORM 0.45.x with postgres.js driver, BullMQ 5.71.x, Vercel AI SDK `ai` package (latest stable), and middleware-based password auth for simplicity. Run BullMQ workers as a separate Node.js process outside Next.js.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- User enters **full prompts** (not single keywords), e.g. "What are the best SEO tools in 2025?"
- Each prompt has a **separate label** for dashboard display (e.g. label: "Best SEO tools")
- A prompt is always sent to **all platforms** (ChatGPT + Perplexity + Gemini) -- no per-platform selection
- Prompts can be toggled **active/inactive** without deleting historical data
- "Brand" = company/product name (not domain/URL) -- used for text detection in AI responses
- Aliases stored as **JSON array in brands table** (not separate table), e.g. `{name: "Ahrefs", aliases: ["ahrefs", "Ahrefs.com"]}`
- Own brand vs competitor distinguished by **`is_own` flag** in a single brands table
- No limit on number of competitor brands

### Claude's Discretion
- Auth approach: "simple auth" -- Claude chooses middleware-based password or Auth.js credentials
- Development environment: Docker Compose vs local services for PostgreSQL + Redis
- Database schema details beyond what is specified above

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INFR-01 | System uses Next.js 15 with App Router and TypeScript | Standard Stack: Next.js 15.5.x, TypeScript 5.x, App Router architecture |
| INFR-02 | System uses PostgreSQL 16 with Drizzle ORM for data persistence | Schema design section: 6 tables with Drizzle ORM 0.45.x, postgres.js driver |
| INFR-03 | System uses BullMQ with Redis for job scheduling and retry logic | BullMQ setup section: queue definition, worker process, test job pattern |
| INFR-04 | System uses Vercel AI SDK for unified AI provider interface | AI SDK section: `ai` package + 3 provider packages, `generateText` API |
| INFR-05 | System has simple authentication to prevent unauthorized access | Auth section: middleware-based password approach recommended |
| DATA-01 | User can create, edit, and delete keyword/prompt entries for tracking | Schema: `keywords` table with prompt, label, active/inactive; API routes pattern |
</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 15.5.14 | Full-stack framework (App Router) | User-decided. 15.x is mature and stable. 16.x exists (16.2.1) but requirements specify Next.js 15. |
| React | 19.x | UI library | Ships with Next.js 15. Server Components for dashboard SSR. |
| TypeScript | 5.x | Type safety | Catches payload mismatches across AI provider integrations at compile time. |
| Drizzle ORM | 0.45.1 | ORM / query builder | SQL-like API ideal for time-series aggregations. No code generation step. TypeScript-first. |
| drizzle-kit | 0.31.10 | Schema migrations | Push-based for dev, migration files for production. |
| postgres (postgres.js) | 3.4.8 | PostgreSQL driver | Fastest pure-JS PG driver. Works seamlessly with Drizzle. |
| BullMQ | 5.71.0 | Job queue + scheduling | Persistent queue with Redis backend. Cron scheduling, automatic retries, exponential backoff. |
| ioredis | 5.10.1 | Redis client | Required by BullMQ. |
| ai (Vercel AI SDK) | 4.3.19 | Unified AI provider interface | Single API across OpenAI, Gemini, Perplexity. Token usage tracking built-in. |
| @ai-sdk/openai | 3.0.47 | OpenAI provider | Official AI SDK provider for ChatGPT queries. |
| @ai-sdk/google | 3.0.52 | Google Gemini provider | Official AI SDK provider for Gemini queries. |
| @ai-sdk/perplexity | 3.0.25 | Perplexity provider | Official AI SDK provider for Sonar queries with citations. |
| Zod | 3.24.x | Schema validation | Validate API inputs, environment variables, AI response shapes. |

**IMPORTANT NOTE on `ai` package version:** The npm registry shows `ai@6.0.134` as the latest tag. However, the v6 line appears to be a major breaking change from the v4.x line documented in the project STACK.md. For stability and compatibility with the existing project research, **use `ai@4.3.19`** (latest 4.x) which is the well-documented version with `generateText`, `streamText`, and provider-specific packages. Pin to `^4.3.19` in package.json. If v6 is needed later, that is a separate migration task.

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @bull-board/api | 6.20.6 | Queue monitoring API | Mount on `/admin/queues` for inspecting job status during development. |
| @bull-board/nextjs | (use @bull-board/next) | Next.js adapter for Bull Board | Integrate queue dashboard into Next.js app. |
| date-fns | 4.x | Date manipulation | Format timestamps, calculate date ranges for queries. |
| dotenv | 16.x | Environment vars | Manage API keys for worker process (Next.js handles .env natively for web). |
| tsx | latest | TypeScript execution | Run BullMQ worker process directly without build step: `tsx src/worker/index.ts`. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Middleware-based auth | Auth.js (NextAuth v5 beta) | Auth.js adds session management but is still beta (5.0.0-beta.30). For an internal team tool, middleware password is simpler and has zero dependencies. |
| Docker Compose for dev services | Local PostgreSQL + Redis install | Docker Compose is more portable; local install is faster if already installed. Recommend Docker Compose for reproducibility. |
| `ai@4.3.19` | `ai@6.0.134` (latest) | v6 is a major version jump with potential breaking changes. v4.x is well-documented and matches all project research. |

**Installation:**
```bash
# Project scaffold
npx create-next-app@15 seoai --typescript --tailwind --app --src-dir

# Database
npm install drizzle-orm postgres
npm install -D drizzle-kit

# Job scheduling
npm install bullmq ioredis

# AI SDK (pin to v4.x)
npm install ai@^4.3 @ai-sdk/openai @ai-sdk/google @ai-sdk/perplexity

# Validation & utilities
npm install zod date-fns

# Queue monitoring (dev)
npm install @bull-board/api @bull-board/next

# Dev tools
npm install -D @types/node tsx
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   ├── (dashboard)/           # Dashboard pages (Phase 3, but layout needed in Phase 1)
│   ├── api/
│   │   └── keywords/          # CRUD API routes for DATA-01
│   │       ├── route.ts       # GET (list), POST (create)
│   │       └── [id]/
│   │           └── route.ts   # GET, PUT, DELETE
│   ├── layout.tsx             # Root layout with auth wrapper
│   └── middleware.ts          # Authentication middleware
├── lib/
│   ├── db/
│   │   ├── schema.ts          # Drizzle schema definitions (all 6 tables)
│   │   ├── client.ts          # Database connection singleton
│   │   ├── index.ts           # Re-export db + schema
│   │   └── migrations/        # Drizzle migration files
│   ├── queue/
│   │   ├── connection.ts      # Redis/IORedis connection singleton
│   │   ├── queues.ts          # BullMQ queue definitions
│   │   └── index.ts           # Re-export queues
│   ├── ai/
│   │   └── providers.ts       # AI SDK provider instances (OpenAI, Google, Perplexity)
│   └── auth.ts                # Auth helper (password check, session cookie)
├── worker/
│   └── index.ts               # BullMQ worker entry point (separate process)
└── types/
    └── index.ts               # Shared TypeScript types
```

### Pattern 1: Drizzle Schema with Explicit Relations
**What:** Define all tables in a single `schema.ts` file using Drizzle's `pgTable` with explicit `relations()` for type-safe joins.
**When to use:** Always. This is the foundation all other phases build on.
**Example:**
```typescript
// src/lib/db/schema.ts
import { pgTable, text, boolean, timestamp, integer, decimal, uuid, jsonb, date, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2'; // or use uuid

export const keywords = pgTable('keywords', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  label: text('label').notNull(),           // Display name: "Best SEO tools"
  prompt: text('prompt').notNull(),          // Full prompt text
  promptVersion: integer('prompt_version').notNull().default(1),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const brands = pgTable('brands', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  name: text('name').notNull(),
  aliases: jsonb('aliases').$type<string[]>().notNull().default([]),
  isOwn: boolean('is_own').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const queryRuns = pgTable('query_runs', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  keywordId: text('keyword_id').notNull().references(() => keywords.id),
  providerId: text('provider_id').notNull(), // 'chatgpt' | 'perplexity' | 'gemini'
  model: text('model').notNull(),
  prompt: text('prompt').notNull(),          // Exact prompt sent (snapshot)
  promptVersion: integer('prompt_version').notNull(),
  rawResponse: text('raw_response').notNull(),
  citations: jsonb('citations').$type<string[]>().default([]),
  tokensUsed: integer('tokens_used'),
  costUsd: decimal('cost_usd', { precision: 10, scale: 6 }),
  latencyMs: integer('latency_ms'),
  runNumber: integer('run_number').notNull(), // 1, 2, or 3 within a batch
  batchId: text('batch_id').notNull(),       // Groups runs from same check cycle
  runType: text('run_type').notNull().default('scheduled'), // 'scheduled' | 'on-demand'
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('idx_query_runs_keyword_provider').on(table.keywordId, table.providerId),
  index('idx_query_runs_batch').on(table.batchId),
  index('idx_query_runs_created').on(table.createdAt),
]);

export const brandMentions = pgTable('brand_mentions', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  queryRunId: text('query_run_id').notNull().references(() => queryRuns.id),
  brandId: text('brand_id').notNull().references(() => brands.id),
  mentioned: boolean('mentioned').notNull().default(false),
  position: integer('position'),             // Ordinal rank (1st, 2nd, 3rd mentioned)
  contextSnippet: text('context_snippet'),
  sentiment: text('sentiment'),              // 'positive' | 'neutral' | 'negative'
  isRecommended: boolean('is_recommended').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('idx_brand_mentions_query_run').on(table.queryRunId),
  index('idx_brand_mentions_brand').on(table.brandId, table.createdAt),
]);

export const alerts = pgTable('alerts', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  keywordId: text('keyword_id').references(() => keywords.id),
  brandId: text('brand_id').references(() => brands.id),
  alertType: text('alert_type').notNull(),   // 'appeared' | 'disappeared' | 'rank_changed' | 'sentiment_changed'
  previousValue: jsonb('previous_value'),
  currentValue: jsonb('current_value'),
  isRead: boolean('is_read').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  notifiedAt: timestamp('notified_at'),
});

export const dailySnapshots = pgTable('daily_snapshots', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  date: date('date').notNull(),
  keywordId: text('keyword_id').notNull().references(() => keywords.id),
  brandId: text('brand_id').notNull().references(() => brands.id),
  providerId: text('provider_id').notNull(),
  avgPosition: decimal('avg_position', { precision: 5, scale: 2 }),
  mentionRate: decimal('mention_rate', { precision: 5, scale: 4 }), // 0.0000-1.0000
  avgSentiment: decimal('avg_sentiment', { precision: 5, scale: 2 }),
  runCount: integer('run_count').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('idx_daily_snapshots_lookup').on(table.keywordId, table.brandId, table.providerId, table.date),
]);
```

### Pattern 2: Database Connection Singleton
**What:** Single database connection instance shared across the application.
**When to use:** In every file that needs database access.
**Example:**
```typescript
// src/lib/db/client.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
export const db = drizzle(client, { schema });
```

### Pattern 3: BullMQ Worker as Separate Process
**What:** Run the BullMQ worker outside the Next.js process to avoid blocking web requests.
**When to use:** Always. Never run long-running jobs inside Next.js API routes.
**Example:**
```typescript
// src/worker/index.ts -- run with: tsx src/worker/index.ts
import { Worker } from 'bullmq';
import IORedis from 'ioredis';

const connection = new IORedis(process.env.REDIS_URL!);

const worker = new Worker('seoai-jobs', async (job) => {
  switch (job.name) {
    case 'test-job':
      console.log('Test job processed:', job.data);
      return { success: true };
    // Phase 2 will add: 'daily-check', 'on-demand-check', etc.
  }
}, { connection });

worker.on('completed', (job) => console.log(`Job ${job.id} completed`));
worker.on('failed', (job, err) => console.error(`Job ${job?.id} failed:`, err));

console.log('Worker started, waiting for jobs...');
```

### Pattern 4: Thin Route Handlers with Zod Validation
**What:** API route handlers validate input with Zod, then delegate to service functions.
**When to use:** All API routes.
**Example:**
```typescript
// src/app/api/keywords/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { keywords } from '@/lib/db/schema';

const createKeywordSchema = z.object({
  label: z.string().min(1).max(200),
  prompt: z.string().min(10).max(2000),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = createKeywordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const result = await db.insert(keywords).values(parsed.data).returning();
  return NextResponse.json(result[0], { status: 201 });
}

export async function GET() {
  const result = await db.select().from(keywords).orderBy(keywords.createdAt);
  return NextResponse.json(result);
}
```

### Anti-Patterns to Avoid
- **Running AI queries in API routes:** AI API calls take 2-30 seconds. Always queue via BullMQ and return immediately.
- **Multiple database connection instances:** Next.js hot reload creates new connections. Use singleton pattern with a global variable guard.
- **Storing only extracted mentions without raw responses:** Raw responses are needed for re-analysis when extraction logic improves.
- **Hardcoding model names in source code:** Store model identifiers in env vars or database config for easy updates when models deprecate.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Job scheduling with retries | Custom setTimeout/setInterval with retry logic | BullMQ | Handles persistence, exponential backoff, concurrency, failure recovery. Custom solutions lose jobs on restart. |
| AI provider abstraction | Custom HTTP clients per provider | Vercel AI SDK (`ai` package) | Handles streaming, token counting, error normalization, response formatting across 3 providers. |
| Database migrations | Manual SQL scripts | drizzle-kit | Type-safe schema diffing, automatic migration generation, push for dev. |
| Input validation | Manual if/else chains | Zod | Type inference, detailed error messages, composable schemas. |
| ID generation | UUID v4 strings | @paralleldrive/cuid2 or `crypto.randomUUID()` | CUIDs are sortable, URL-safe, and shorter. Alternatively, `crypto.randomUUID()` is built-in and fine for this use case. |

**Key insight:** Phase 1 is about setting up proven infrastructure, not inventing solutions. Every component listed above has battle-tested libraries that handle edge cases (connection pooling, retry backoff, schema diffing) that would take weeks to hand-roll correctly.

## Common Pitfalls

### Pitfall 1: Database Connection Leak in Next.js Dev Mode
**What goes wrong:** Next.js hot-reloads modules in development, creating a new `postgres()` connection pool each time. After many edits, you hit PostgreSQL's max connections limit.
**Why it happens:** Module-level singletons get re-evaluated on every hot reload.
**How to avoid:** Use a global variable guard:
```typescript
const globalForDb = globalThis as unknown as { db: ReturnType<typeof drizzle> };
export const db = globalForDb.db || drizzle(client, { schema });
if (process.env.NODE_ENV !== 'production') globalForDb.db = db;
```
**Warning signs:** "too many clients" PostgreSQL errors during development.

### Pitfall 2: Schema Design That Cannot Support Multi-Sample Queries
**What goes wrong:** Designing `query_runs` as one-per-keyword-per-day instead of supporting 3+ runs per check cycle (DATA-05 requirement). Retrofitting requires a migration and data loss.
**Why it happens:** The natural mental model is "one check = one result" from traditional SERP monitoring.
**How to avoid:** Include `runNumber` and `batchId` fields from day one. A batch contains 3 runs per keyword per provider. `mentionRate` in `daily_snapshots` is calculated as percentage of runs where brand was mentioned.
**Warning signs:** Schema has a unique constraint on (keywordId, providerId, date).

### Pitfall 3: Forgetting Prompt Versioning
**What goes wrong:** User edits a prompt text, and now historical data was collected with a different prompt. Trend analysis becomes meaningless because you are comparing apples to oranges.
**Why it happens:** Prompt editing seems like a simple CRUD operation.
**How to avoid:** Store `promptVersion` on the `keywords` table (increment on edit). Snapshot the exact prompt text into `queryRuns.prompt` at query time. This preserves the exact prompt used for each data point.
**Warning signs:** Trend charts showing sudden jumps/drops that correlate with prompt edits.

### Pitfall 4: BullMQ Worker Running Inside Next.js
**What goes wrong:** Starting a BullMQ worker inside an API route or middleware. The worker dies when the request ends. On Vercel, serverless functions have 10-second timeouts.
**Why it happens:** Developers want a single process for simplicity.
**How to avoid:** Always run the worker as a separate Node.js process: `tsx src/worker/index.ts`. Use `concurrently` or Docker Compose to run both Next.js and worker in development.
**Warning signs:** Jobs stuck in "active" state that never complete.

### Pitfall 5: Not Sealing Environment Variables Early
**What goes wrong:** Missing env vars cause cryptic runtime errors deep in the application. Different team members have different .env files.
**Why it happens:** Environment variables are stringly typed with no validation.
**How to avoid:** Validate all env vars at startup with Zod:
```typescript
// src/lib/env.ts
import { z } from 'zod';
const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  AUTH_PASSWORD: z.string().min(8),
  // AI keys validated but optional in Phase 1 (Phase 2 requires them)
  OPENAI_API_KEY: z.string().optional(),
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().optional(),
  PERPLEXITY_API_KEY: z.string().optional(),
});
export const env = envSchema.parse(process.env);
```
**Warning signs:** "Cannot read property of undefined" errors in production.

## Code Examples

### Drizzle ORM: Keywords CRUD Operations
```typescript
// Create keyword
const newKeyword = await db.insert(keywords).values({
  label: 'Best SEO tools',
  prompt: 'What are the best SEO tools in 2025? Compare top options.',
}).returning();

// List active keywords
const activeKeywords = await db.select()
  .from(keywords)
  .where(eq(keywords.isActive, true))
  .orderBy(desc(keywords.createdAt));

// Update keyword (increment prompt version when prompt changes)
await db.update(keywords)
  .set({
    prompt: 'What are the best SEO tools in 2026?',
    promptVersion: sql`${keywords.promptVersion} + 1`,
    updatedAt: new Date(),
  })
  .where(eq(keywords.id, keywordId));

// Soft-deactivate (never delete, preserve history)
await db.update(keywords)
  .set({ isActive: false, updatedAt: new Date() })
  .where(eq(keywords.id, keywordId));

// Hard delete (for user-initiated delete, DATA-01)
await db.delete(keywords).where(eq(keywords.id, keywordId));
```

### BullMQ: Queue Setup and Test Job
```typescript
// src/lib/queue/queues.ts
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const connection = new IORedis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null, // Required by BullMQ
});

export const seoaiQueue = new Queue('seoai-jobs', { connection });

// Add a test job (for INFR-03 verification)
export async function addTestJob(data: Record<string, unknown>) {
  return seoaiQueue.add('test-job', data, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
  });
}
```

### Vercel AI SDK: Provider Setup (Phase 1 Verification)
```typescript
// src/lib/ai/providers.ts
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createPerplexity } from '@ai-sdk/perplexity';

// Provider instances -- actual querying happens in Phase 2
// Phase 1 just verifies these can be instantiated with API keys
export const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
export const google = createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY });
export const perplexity = createPerplexity({ apiKey: process.env.PERPLEXITY_API_KEY });

// Phase 2 will use: generateText({ model: openai('gpt-4o-mini'), prompt: '...' })
```

### Middleware-Based Auth
```typescript
// src/middleware.ts
import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  // Skip auth for login page and static assets
  if (request.nextUrl.pathname === '/login' || request.nextUrl.pathname.startsWith('/_next')) {
    return NextResponse.next();
  }

  const authCookie = request.cookies.get('seoai-auth');
  if (!authCookie || authCookie.value !== 'authenticated') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

```typescript
// src/app/login/page.tsx (Server Action for login)
// Login page with a password field. On submit:
// 1. Compare input against process.env.AUTH_PASSWORD (bcrypt hash or direct compare)
// 2. Set httpOnly cookie 'seoai-auth' = 'authenticated' with expiry
// 3. Redirect to dashboard
```

### Docker Compose for Development Services
```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:16-alpine
    ports:
      - '5432:5432'
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: dev
      POSTGRES_DB: seoai
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'

volumes:
  pgdata:
```

### Drizzle Config
```typescript
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/lib/db/schema.ts',
  out: './src/lib/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Prisma with code generation | Drizzle ORM with SQL-like API | 2024-2025 adoption wave | No `prisma generate` step; instant type updates; better for aggregations |
| NextAuth v4 (pages router) | Auth.js v5 / NextAuth beta | 2024-2025 | App Router native, but still beta. For simple internal auth, middleware approach is more stable. |
| BullMQ repeatable jobs | BullMQ Job Schedulers API (v5.16+) | 2024 | Cleaner cron expression support. Use `JobScheduler` instead of deprecated repeatable jobs API. |
| Vercel AI SDK v3 | Vercel AI SDK v4.x (ai package) | 2025 | Unified `generateText`/`streamText` API. Provider packages separated. v6 exists but v4.x is the documented standard. |
| Pages Router | App Router | Next.js 13+ (stable since 14) | Server Components, Server Actions, nested layouts. All new patterns target App Router. |

**Deprecated/outdated:**
- `next-auth@4.x` (Pages Router era): Use Auth.js v5 beta if choosing Auth.js, or use middleware-based auth
- BullMQ `Queue.add()` with `repeat` option: Use `Queue.upsertJobScheduler()` for scheduled jobs
- `@google/generative-ai`: Replaced by `@ai-sdk/google` when using Vercel AI SDK

## Open Questions

1. **Auth.js v5 vs middleware password**
   - What we know: Auth.js v5 is still beta (5.0.0-beta.30). Middleware password is simpler but lacks session management.
   - What's unclear: Whether session management (who triggered which check) is needed in Phase 1.
   - Recommendation: Start with middleware-based password auth. It is simpler, has zero dependencies, and can be upgraded to Auth.js later if session tracking is needed. For an internal team tool, this is sufficient.

2. **ID generation strategy: CUID2 vs UUID**
   - What we know: CUID2 produces shorter, sortable, URL-safe IDs. UUID is built-in (`crypto.randomUUID()`).
   - What's unclear: Whether ID sortability matters for this project's query patterns.
   - Recommendation: Use `crypto.randomUUID()` (built-in, no dependency). If shorter IDs are desired for URLs, add `@paralleldrive/cuid2`.

3. **Vercel AI SDK v4 vs v6**
   - What we know: v6.0.134 is the latest on npm. v4.3.19 is the latest 4.x. The project research references v4.x.
   - What's unclear: What breaking changes v6 introduces and whether provider packages are compatible.
   - Recommendation: Pin to `ai@^4.3` for Phase 1. The AI SDK is used minimally in this phase (just provider instantiation). Evaluate v6 migration in Phase 2 when actual AI querying begins.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.x (fastest for TypeScript + ESM projects) |
| Config file | `vitest.config.ts` -- Wave 0 |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INFR-01 | Next.js app builds and runs with TypeScript | smoke | `npx next build` | N/A (build command) |
| INFR-02 | All 6 tables exist in PostgreSQL via Drizzle migrations | integration | `npx vitest run src/lib/db/__tests__/schema.test.ts -x` | Wave 0 |
| INFR-03 | BullMQ test job can be enqueued and processed by worker | integration | `npx vitest run src/lib/queue/__tests__/queue.test.ts -x` | Wave 0 |
| INFR-04 | AI SDK providers can be instantiated with API keys | unit | `npx vitest run src/lib/ai/__tests__/providers.test.ts -x` | Wave 0 |
| INFR-05 | Unauthenticated requests are redirected to login | integration | `npx vitest run src/__tests__/auth.test.ts -x` | Wave 0 |
| DATA-01 | Keywords CRUD via API endpoints (create, read, update, delete) | integration | `npx vitest run src/app/api/keywords/__tests__/keywords.test.ts -x` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `vitest.config.ts` -- Vitest configuration with path aliases matching tsconfig
- [ ] `src/lib/db/__tests__/schema.test.ts` -- Verify all 6 tables, columns, indexes via Drizzle introspection or migration dry-run
- [ ] `src/lib/queue/__tests__/queue.test.ts` -- Enqueue test job, verify worker processes it (requires test Redis)
- [ ] `src/lib/ai/__tests__/providers.test.ts` -- Verify provider instantiation (mock API keys, no actual API calls)
- [ ] `src/__tests__/auth.test.ts` -- Verify middleware redirects unauthenticated requests
- [ ] `src/app/api/keywords/__tests__/keywords.test.ts` -- Full CRUD test against test database
- [ ] Test database setup: either Docker-based test PostgreSQL or in-memory alternative

## Sources

### Primary (HIGH confidence)
- npm registry -- verified all package versions via `npm view [package] version` on 2026-03-21
- `.planning/research/STACK.md` -- project-level technology decisions
- `.planning/research/ARCHITECTURE.md` -- schema design, directory structure, component boundaries
- `.planning/research/PITFALLS.md` -- domain-specific pitfalls and prevention strategies

### Secondary (MEDIUM confidence)
- Drizzle ORM documentation -- schema definition patterns, migration workflow
- BullMQ documentation -- Worker API, Job Schedulers, connection requirements
- Next.js 15 App Router documentation -- middleware, route handlers, project structure

### Tertiary (LOW confidence)
- Vercel AI SDK v4 vs v6 compatibility -- version jump from 4.x to 6.x needs investigation before Phase 2

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all versions verified against npm registry; well-established libraries
- Architecture: HIGH -- patterns from project research validated against official docs
- Schema design: HIGH -- directly derived from CONTEXT.md locked decisions and REQUIREMENTS.md
- Pitfalls: HIGH -- drawn from project pitfalls research and common Next.js + Drizzle patterns
- Auth approach: MEDIUM -- middleware-based is simpler but not battle-tested at scale (acceptable for internal tool)
- AI SDK versioning: LOW -- v4 vs v6 gap needs investigation

**Research date:** 2026-03-21
**Valid until:** 2026-04-21 (stable stack, 30-day validity)
