# Technology Stack

**Project:** SEO AI Monitor (AEO)
**Researched:** 2026-03-20
**Overall Confidence:** HIGH

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Next.js | 15.x (stable) | Full-stack framework | User-decided. App Router with Server Components for dashboard SSR. API routes handle AI queries and webhook endpoints. Stay on 15.x stable rather than 16.x which is newer but still maturing. | HIGH |
| React | 19.x | UI library | Ships with Next.js 15. Server Components reduce client bundle for dashboard views. | HIGH |
| TypeScript | 5.x | Type safety | Non-negotiable for a project with multiple API integrations. Catches payload mismatches at compile time. | HIGH |

**Next.js Architecture Notes:**
- Use App Router exclusively (not Pages Router). App Router is the standard since Next.js 13+ and all new patterns target it.
- API Routes via `app/api/` for internal endpoints (trigger checks, fetch results).
- Server Actions for form submissions (keyword management, settings).
- Route Handlers for webhook/cron endpoints.

### Database

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| PostgreSQL | 16.x | Primary database | User-decided. Excellent for time-series ranking data with partitioning. JSONB columns for storing raw AI responses. | HIGH |
| Drizzle ORM | 0.45.x | ORM / query builder | SQL-like API matches this project's query patterns (aggregations, time-series). 7.4kb bundle, zero dependencies, no code generation step. Faster cold starts than Prisma. TypeScript-first with instant type updates. | HIGH |
| drizzle-kit | latest | Migrations | Companion tool for schema migrations. Push-based workflow for development, migration files for production. | HIGH |

**Why Drizzle over Prisma:**
- This project needs complex aggregation queries (ranking trends over time, competitor comparisons). Drizzle's SQL-like API maps directly to these patterns without fighting abstraction layers.
- No `prisma generate` step means faster iteration when schema changes frequently during early development.
- ~7.4kb vs Prisma's larger bundle matters less here (not serverless edge), but the SQL-first mental model is the real win for a data-heavy dashboard.
- Prisma 7's performance improvements have narrowed the gap, but Drizzle's philosophy of "if you know SQL, you know Drizzle" is better suited for the time-series queries this project needs.

**PostgreSQL Driver:** Use `postgres` (postgres.js) as the underlying driver -- fastest pure-JS PostgreSQL driver for Node.js, works seamlessly with Drizzle.

### Job Scheduling

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| BullMQ | 5.71.x | Job queue + scheduling | Persistent job queue with Redis backend. Cron-based scheduling for automated daily/weekly checks. Retry logic for failed API calls. Job progress tracking for dashboard UI. | HIGH |
| Redis (via IORedis) | 7.x | BullMQ backend | Required by BullMQ. Also useful for caching AI responses to reduce API costs. | HIGH |

**Why BullMQ over node-cron:**
- AI API calls fail frequently (rate limits, timeouts, network errors). BullMQ provides automatic retries with exponential backoff -- node-cron has zero retry capability.
- Job persistence: if the server restarts mid-check, BullMQ resumes. node-cron loses everything.
- Job Schedulers API (v5.16+) replaces deprecated repeatable jobs with cleaner cron expression support.
- Monitoring: Bull Board provides a dashboard to inspect job status, failures, and queue health.
- This project needs reliable, scheduled, retryable jobs -- that is exactly what BullMQ is built for.

**Worker Architecture:**
- Run BullMQ workers in a separate process (not inside Next.js API routes) to avoid blocking the web server.
- Use `concurrency` setting to control parallel API calls per platform (respect rate limits).

### AI API Clients

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Vercel AI SDK (`ai`) | 4.x | Unified AI interface | Single API across OpenAI, Gemini, and Perplexity. Swap providers with one line. Built-in streaming, structured output, and token usage tracking. First-party Next.js integration. | HIGH |
| `@ai-sdk/openai` | latest | OpenAI provider | Official Vercel AI SDK provider for ChatGPT/GPT-4o queries. | HIGH |
| `@ai-sdk/google` | latest | Google Gemini provider | Official Vercel AI SDK provider for Gemini 2.x queries. | HIGH |
| `@ai-sdk/perplexity` | latest | Perplexity provider | Official Vercel AI SDK provider for Sonar API queries. Includes sources/citations support. | HIGH |

**Why Vercel AI SDK over direct API clients:**
- This project queries 3 different AI platforms with the same prompts. A unified API means one prompt template, three providers -- not three different API calling patterns.
- Built-in token usage tracking helps with cost monitoring (a stated constraint).
- If a new AI platform becomes relevant, add one provider package instead of writing a new integration from scratch.
- The SDK handles streaming, retries, and error normalization across providers.

**Fallback: Direct clients if needed:**
- `openai` (v6.x) -- if you need OpenAI-specific features not in the AI SDK
- `@google/genai` (v1.30.x) -- for Gemini-specific features
- `@perplexity-ai/perplexity_ai` -- for Perplexity-specific features

### Web Scraping

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Playwright | 1.58.x | Browser automation / scraping | Fallback for platforms without API access. Auto-waiting reduces flaky scripts. Multi-browser support (Chromium, Firefox, WebKit). Better anti-detection than Puppeteer. | HIGH |
| Cheerio | 1.x | HTML parsing | Lightweight HTML parser for extracting data from fetched pages without running a browser. Use for simple scraping where JS rendering is not needed. | MEDIUM |

**Scraping Strategy:**
- API-first: always prefer official APIs when available (OpenAI, Gemini, Perplexity all have APIs).
- Playwright for fallback: when API does not cover needed data (e.g., scraping Perplexity web UI for citation order, or checking AI Overviews in Google Search).
- Cheerio for lightweight parsing: parse HTML responses without spinning up a browser.
- Run scraping jobs through BullMQ workers with concurrency limits.

### Dashboard & Visualization

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| shadcn/ui | latest | UI component library | Copy-paste components, not a dependency. Tailwind CSS based. Built-in chart components wrapping Recharts. Dark mode support. | HIGH |
| Recharts | 3.x | Charting library | Powers shadcn/ui chart components. SVG-based, React-native API. Supports line, area, bar charts needed for trend visualization. | HIGH |
| Tailwind CSS | 4.x | Styling | Ships with Next.js. shadcn/ui is built on it. Utility-first approach speeds up dashboard development. | HIGH |

**Why shadcn/ui + Recharts over alternatives:**
- shadcn/ui already wraps Recharts with pre-styled chart components (53 chart variants). This means dashboard charts come with consistent styling, dark mode, and Tailwind theming out of the box.
- Recharts 3.x is stable, SVG-based (easy to customize with CSS), and has the right chart types for this project: line charts (ranking trends), bar charts (competitor comparison), area charts (mention volume over time).
- Tremor is also good but is built on Recharts anyway -- using shadcn/ui + Recharts directly gives more control without an extra abstraction layer.

### Authentication

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Auth.js (NextAuth v5) | 5.x | Simple auth | Lightweight credentials-based auth for internal team tool. Single API route handles login/session. Built-in session management with JWT. | MEDIUM |

**Why Auth.js over alternatives:**
- This is an internal tool with simple auth needs ("don't leave it open to the internet"). Auth.js with credentials provider is ~1 hour setup.
- No need for Clerk, Auth0, or other managed auth services -- that is overkill for a team tool.
- **Alternative considered:** Simple middleware-based password check. Even simpler, but Auth.js gives you session management for free, which is useful for tracking who triggered which checks.
- If truly single-user, consider a simple environment variable password with Next.js middleware instead. Faster to implement, no dependency.

### Supporting Libraries

| Library | Version | Purpose | When to Use | Confidence |
|---------|---------|---------|-------------|------------|
| Zod | 3.x | Schema validation | Validate API responses from AI platforms. Define type-safe schemas for database queries. | HIGH |
| date-fns | 4.x | Date manipulation | Format dates for charts, calculate time ranges for queries, schedule displays. | HIGH |
| @bull-board/api + @bull-board/next | latest | Queue monitoring UI | Visual dashboard for BullMQ job status. Mount on `/admin/queues`. | MEDIUM |
| postgres (postgres.js) | 3.x | PostgreSQL driver | Underlying driver for Drizzle ORM. Fastest pure-JS PG driver. | HIGH |
| dotenv | 16.x | Environment vars | Manage API keys for OpenAI, Gemini, Perplexity. Already supported by Next.js but useful for workers. | HIGH |
| nodemailer | 6.x | Email alerts | Send alert emails when brand mentions change. Simple SMTP-based. | MEDIUM |

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| ORM | Drizzle | Prisma | Code generation step, heavier abstraction for time-series queries |
| Job Queue | BullMQ | node-cron | No retry logic, no persistence, no job tracking |
| Job Queue | BullMQ | Agenda | MongoDB dependency -- we already have PostgreSQL + Redis |
| AI Client | Vercel AI SDK | Direct API clients | 3 different APIs means 3 different calling patterns |
| Charting | Recharts (via shadcn) | Chart.js | Canvas-based, harder to customize individual elements, no React-native API |
| Charting | Recharts (via shadcn) | Tremor | Extra abstraction on top of Recharts -- shadcn already wraps Recharts |
| Scraping | Playwright | Puppeteer | Narrower browser support, less reliable auto-waiting |
| Auth | Auth.js | Clerk/Auth0 | Managed service overkill for internal team tool |
| Auth | Auth.js | Custom middleware | Auth.js adds session management which is useful for audit logs |
| UI | shadcn/ui | Material UI | Heavier, opinionated design system, not Tailwind-native |

## What NOT to Use

| Technology | Why Not |
|------------|---------|
| Supabase | User-decided constraint. Direct PostgreSQL gives full control. |
| Prisma | Code generation step slows iteration. SQL-like queries are natural for this data model. |
| MongoDB | Relational data (brands -> keywords -> checks -> results) maps better to PostgreSQL. |
| GraphQL | Internal tool with known data shapes. REST/Server Actions are simpler. |
| Socket.io / real-time | Daily checks do not need real-time. SSR + polling is sufficient. |
| Puppeteer | Playwright supersedes it with better browser support and auto-waiting. |
| Pages Router | Legacy Next.js pattern. App Router is the standard. |
| tRPC | Adds complexity for an internal tool. Server Actions + API routes are sufficient. |

## Installation

```bash
# Core framework
npx create-next-app@latest seoai --typescript --tailwind --app --src-dir

# Database
npm install drizzle-orm postgres
npm install -D drizzle-kit

# Job scheduling
npm install bullmq ioredis

# AI SDK (unified)
npm install ai @ai-sdk/openai @ai-sdk/google @ai-sdk/perplexity

# Web scraping
npm install playwright cheerio
npx playwright install chromium  # Only install Chromium to save space

# UI & Charting
npx shadcn@latest init
npx shadcn@latest add chart card table badge button input
npm install recharts

# Authentication
npm install next-auth@beta  # Auth.js v5

# Supporting
npm install zod date-fns nodemailer
npm install -D @types/nodemailer

# Queue monitoring
npm install @bull-board/api @bull-board/next

# Dev tools
npm install -D @types/node tsx
```

## Infrastructure Requirements

| Service | Purpose | Local Dev | Production |
|---------|---------|-----------|------------|
| PostgreSQL 16 | Primary database | Docker or local install | Managed (e.g., Railway, Neon, RDS) |
| Redis 7 | BullMQ backend + cache | Docker or local install | Managed (e.g., Upstash, Railway) |
| Node.js 20+ | Runtime | Local install | Container or platform |

```bash
# Docker for local development
docker run -d --name seoai-pg -p 5432:5432 -e POSTGRES_PASSWORD=dev -e POSTGRES_DB=seoai postgres:16
docker run -d --name seoai-redis -p 6379:6379 redis:7-alpine
```

## Environment Variables

```env
# Database
DATABASE_URL=postgres://postgres:dev@localhost:5432/seoai

# Redis
REDIS_URL=redis://localhost:6379

# AI APIs
OPENAI_API_KEY=sk-...
GOOGLE_GENERATIVE_AI_API_KEY=...
PERPLEXITY_API_KEY=pplx-...

# Auth
AUTH_SECRET=... # Generate with: npx auth secret

# Alerts
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
ALERT_EMAIL_TO=team@example.com
```

## Sources

- [Next.js 15 Blog Post](https://nextjs.org/blog/next-15) - Next.js 15 features and App Router
- [Next.js 16 Upgrade Guide](https://nextjs.org/docs/app/guides/upgrading/version-16) - Next.js 16 available but 15.x recommended for stability
- [Drizzle ORM vs Prisma Comparison (MakerKit)](https://makerkit.dev/blog/tutorials/drizzle-vs-prisma) - Detailed 2026 comparison
- [Drizzle ORM vs Prisma (Bytebase)](https://www.bytebase.com/blog/drizzle-vs-prisma/) - Performance benchmarks
- [Drizzle ORM npm](https://www.npmjs.com/package/drizzle-orm) - v0.45.x latest
- [BullMQ Documentation](https://docs.bullmq.io) - Job Schedulers API
- [BullMQ npm](https://www.npmjs.com/package/bullmq) - v5.71.x latest
- [Vercel AI SDK](https://ai-sdk.dev/docs/introduction) - Unified AI provider API
- [AI SDK 4.2 Release](https://vercel.com/blog/ai-sdk-4-2) - Perplexity sources, OpenAI responses API
- [OpenAI Node.js SDK npm](https://www.npmjs.com/package/openai) - v6.32.x latest
- [Google GenAI SDK npm](https://www.npmjs.com/package/@google/genai) - v1.30.x, replaces deprecated @google/generative-ai
- [Perplexity Sonar Models](https://docs.perplexity.ai/getting-started/models/models/sonar) - Sonar and Sonar Pro models
- [@perplexity-ai/perplexity_ai npm](https://www.npmjs.com/package/@perplexity-ai/perplexity_ai) - Official client
- [Playwright npm](https://www.npmjs.com/package/playwright) - v1.58.x latest
- [shadcn/ui Charts](https://ui.shadcn.com/docs/components/radix/chart) - Recharts integration
- [Recharts npm](https://www.npmjs.com/package/recharts) - v3.8.x latest
- [Auth.js Migration Guide](https://authjs.dev/getting-started/migrating-to-v5) - NextAuth v5
