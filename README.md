# SEO AI Monitor

Track how AI platforms (ChatGPT, Perplexity, Gemini) mention your brand. Monitor visibility scores, detect changes, and receive alerts when your brand appears or disappears from AI responses.

## Prerequisites

- Node.js 20+
- Docker (for PostgreSQL + Redis)
- At least one AI API key (OpenAI, Google, or Perplexity)

## Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/gonnarich88-design/seoai.git
cd seoai

# 2. Install dependencies
npm install

# 3. Copy and fill in environment variables
cp .env.example .env
# Edit .env — see Environment Variables below

# 4. Start PostgreSQL and Redis
npm run services:up

# 5. Create database tables
npx drizzle-kit migrate

# 6. Start the app (two terminals required)
# Terminal 1:
npm run dev

# Terminal 2:
npm run worker:dev
```

Open [http://localhost:3000](http://localhost:3000) and log in with the password you set in `AUTH_PASSWORD`.

## Environment Variables

| Variable | Required | Example | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | ✅ | `postgresql://postgres:dev@localhost:5432/seoai` | PostgreSQL connection string |
| `REDIS_URL` | ✅ | `redis://localhost:6379` | Redis connection string |
| `AUTH_PASSWORD` | ✅ | `mysecretpassword` | Login password (min 8 chars) |
| `OPENAI_API_KEY` | one required | `sk-...` | OpenAI API key |
| `GOOGLE_GENERATIVE_AI_API_KEY` | one required | `AI...` | Google Gemini API key |
| `PERPLEXITY_API_KEY` | one required | `pplx-...` | Perplexity API key |
| `DAILY_BUDGET_OPENAI` | ❌ | `1.0` | Daily spend cap in USD (default: $1.00) |
| `DAILY_BUDGET_PERPLEXITY` | ❌ | `1.0` | Daily spend cap in USD (default: $1.00) |
| `DAILY_BUDGET_GEMINI` | ❌ | `1.0` | Daily spend cap in USD (default: $1.00) |
| `CHECK_SCHEDULE_CRON` | ❌ | `0 0 * * *` | When to run daily checks (default: midnight) |
| `WEEKLY_REPORT_CRON` | ❌ | `0 9 * * 1` | When to send weekly report (default: Monday 9am) |
| `SMTP_HOST` | ❌ | `smtp.gmail.com` | SMTP server for email alerts |
| `SMTP_PORT` | ❌ | `587` | SMTP port |
| `SMTP_SECURE` | ❌ | `false` | Use TLS (true for port 465) |
| `SMTP_USER` | ❌ | `you@gmail.com` | SMTP username |
| `SMTP_PASS` | ❌ | `your-app-password` | SMTP password or app password |
| `SMTP_FROM` | ❌ | `SEO Monitor <noreply@you.com>` | From address for emails |
| `ALERT_EMAIL_TO` | ❌ | `team@company.com` | Where to send alert emails |

> Email variables are optional but required for alerts and weekly reports to work.

## Architecture

Two processes must run simultaneously:

1. **Next.js app** (`npm run dev`) — UI dashboard + REST API at `http://localhost:3000`
2. **BullMQ worker** (`npm run worker:dev`) — background job processor for AI queries

**Data pipeline:**
```
Scheduler / on-demand trigger
  → AI query (ChatGPT, Perplexity, Gemini × 3 runs)
  → Brand detection (mention, position, sentiment)
  → Daily snapshot (visibility score aggregation)
  → Alert detection (appeared, disappeared, rank changed)
  → Email notification
```

## Available Commands

```bash
# Development
npm run dev           # Next.js with Turbopack
npm run worker:dev    # Background worker (separate terminal)
npm run services:up   # Start PostgreSQL + Redis via Docker Compose

# Build & Lint
npm run build         # Production build
npm run lint          # ESLint

# Database
npx drizzle-kit generate   # Generate migration from schema changes
npx drizzle-kit migrate    # Apply migrations

# Tests
npx vitest --run           # Run all tests
npx vitest --watch         # Watch mode
```
