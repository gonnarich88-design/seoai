# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev           # Next.js with Turbopack
npm run worker:dev    # Background worker (separate terminal)
npm run services:up   # Start PostgreSQL + Redis via Docker Compose

# Build & Lint
npm run build         # Production build (Turbopack)
npm run lint          # ESLint

# Database
npx drizzle-kit generate   # Generate migration from schema changes
npx drizzle-kit migrate    # Apply migrations

# Tests
npx vitest                                         # All tests
npx vitest src/__tests__/auth.test.ts              # Single test file
npx vitest --watch                                 # Watch mode
npx vitest --run                                   # CI mode (no watch)
```

Full local setup: `npm install && npm run services:up && npm run dev` + `npm run worker:dev` in a second terminal.

## Architecture

SEO/AEO monitoring tool that queries AI platforms (ChatGPT, Perplexity, Gemini), detects brand mentions, tracks rankings and sentiment, and sends email alerts/reports.

**Two processes must run simultaneously:**
1. **Next.js app** (`src/app/`) — UI dashboard + REST API
2. **BullMQ worker** (`src/worker/`) — Background job processing

### Data Pipeline

```
User/Scheduler → addQueryJobs()
  → query handler → executeQuery() → queryRuns table
  → analysis handler → brand detection → brandMentions table
  → sentiment handler → update sentiment scores
  → (all 3 runs complete) → snapshot handler → dailySnapshots table
  → alert detection → alerts table
  → notification handler → email via SMTP
```

### Key Directories

- `src/lib/pipeline/` — Core business logic (brand detection, sentiment, change detection, scoring)
- `src/worker/handlers/` — Job handlers for each pipeline stage
- `src/lib/ai/` — AI provider abstractions (OpenAI, Gemini, Perplexity via Vercel AI SDK)
- `src/lib/db/` — Drizzle ORM schema, client, migrations
- `src/lib/queue/` — BullMQ queue setup with provider-specific rate limits
- `src/app/api/` — REST API routes
- `src/app/dashboard/` — Protected dashboard pages (client components)
- `src/lib/email/` — Nodemailer SMTP for alerts and weekly reports

### Database Schema (6 tables)

`keywords` → `queryRuns` → `brandMentions` (per run)
`keywords` + `brands` → `dailySnapshots` (aggregated, unique per keyword+brand+provider+date)
`keywords` + `brands` → `alerts` (change detection results)

### Auth

Cookie-based password auth (`src/lib/auth.ts`). Middleware at `src/middleware.ts` protects `/dashboard` and `/api` routes.

### Environment

All config validated at startup via Zod in `src/lib/env.ts`. Required: `DATABASE_URL`, `REDIS_URL`, `AUTH_PASSWORD`. AI provider keys (`OPENAI_API_KEY`, `GOOGLE_API_KEY`, `PERPLEXITY_API_KEY`) are optional but at least one is needed. Email via `SMTP_*` vars.

## Patterns

- **Tests**: `vi.mock()` for DB/external dependencies; test files live adjacent to source in `__tests__/` subdirectories
- **API routes**: Zod validation on input, `NextResponse.json()` for responses
- **DB access**: Always use the `db` singleton from `src/lib/db/client.ts`; no raw SQL
- **Job enqueueing**: Use helper functions from `src/lib/queue/queues.ts`, never create jobs directly
- **Budget enforcement**: Worker checks daily spend before executing query jobs
- **Rate limiting**: Provider-specific delays are configured in queue setup (OpenAI 500ms, Perplexity 1000ms, Gemini 200ms)
