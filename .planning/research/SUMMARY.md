# Project Research Summary

**Project:** SEO AI Monitor (AEO)
**Domain:** AI SEO / Answer Engine Optimization (AEO) Monitoring
**Researched:** 2026-03-20
**Confidence:** HIGH

## Executive Summary

This is an Answer Engine Optimization (AEO) monitoring tool that tracks brand and competitor mentions across AI platforms (ChatGPT, Perplexity, Gemini). The market of commercial equivalents (Otterly, Profound, Peec, BrandRank) validates strong demand and establishes clear patterns for how the product should work: prompts are the unit of tracking, daily checks are the standard cadence, and a visibility percentage score is the primary KPI every stakeholder expects. Building internally makes sense because the core monitoring logic is straightforward and the main value of commercial tools is scale, polish, and platform breadth -- all of which are overkill for an internal team tool.

The recommended approach is a modular monolith inside Next.js 15 with a separate BullMQ worker process for background job execution. The key architectural insight is to separate web AI queries into a provider-abstracted Query Engine (so adding new platforms is trivial), store raw AI responses always (analysis logic will improve), and pre-compute daily snapshots for dashboard performance. Three critical cross-cutting concerns must be designed in from day one -- not bolted on later: multi-sample query execution (AI responses are non-deterministic, single samples produce unreliable data), budget/cost tracking (3 providers x N keywords x 3-5 samples compounds fast), and a model configuration registry (AI providers deprecate models without warning).

The primary risks are well-understood and mitigable: phantom mentions from biased prompt design (use neutral user-simulating prompts, version-stamp all prompts), API cost spirals (enforce budget caps and use cheaper model tiers by default), and unreliable data from single-sample checks (run 3-5 times per prompt per check cycle and report mention rates, not binary presence). The competitive landscape confirms that sentiment analysis, citation tracking, and optimization recommendations are differentiators that can be deferred -- the table stakes (prompt CRUD, multi-platform monitoring, visibility scores, competitor comparison, trend charts, scheduled checks) are well-defined and achievable in a focused MVP.

## Key Findings

### Recommended Stack

The stack is well-established and every choice has strong rationale. Next.js 15 (App Router, stable) handles both the dashboard UI and API layer. PostgreSQL 16 with Drizzle ORM handles persistence -- Drizzle's SQL-like API is the right choice over Prisma for the complex time-series aggregation queries this project requires. BullMQ with Redis handles job scheduling and retry logic; this is non-negotiable since AI API calls fail frequently and a node-cron approach provides no retry, persistence, or job tracking. The Vercel AI SDK unifies all three AI platform integrations under one calling pattern, reducing the integration surface substantially.

**Core technologies:**
- **Next.js 15 (App Router):** Full-stack framework — SSR for dashboard, API routes for internal endpoints, Server Actions for forms
- **PostgreSQL 16 + Drizzle ORM:** Primary database — SQL-like API maps naturally to time-series aggregation queries; faster iteration than Prisma for a schema that evolves frequently
- **BullMQ + Redis:** Job queue and scheduling — persistent, retryable, monitorable; critical for AI API reliability
- **Vercel AI SDK (ai + @ai-sdk/openai, @ai-sdk/google, @ai-sdk/perplexity):** Unified AI client — one calling pattern for three platforms; swap providers with one line
- **shadcn/ui + Recharts + Tailwind CSS 4:** Dashboard UI — pre-styled chart components, dark mode, 53 chart variants; no additional abstraction needed
- **Auth.js v5:** Lightweight credentials auth — correct scope for an internal tool; no managed auth service needed
- **Zod:** Schema validation — validates AI response payloads; type-safe database queries
- **Playwright:** Scraping fallback — only when API lacks needed data; isolated behind adapter interface

### Expected Features

Commercial tools make the feature hierarchy clear. The market has converged on prompts as the universal unit of tracking, daily refresh as the standard cadence, and visibility percentage as the primary KPI. Any product missing these feels broken to users who have evaluated the alternatives.

**Must have (table stakes — v1 launch):**
- Prompt management (CRUD) — the fundamental unit of tracking; every competitor centers UX here
- Multi-platform AI monitoring (ChatGPT, Perplexity, Gemini) — users will not adopt a single-platform tool
- Brand mention detection + visibility score — the core value proposition; binary mention plus percentage is the universal metric
- Basic competitor tracking — "I appear in 40%, competitor X in 70%" is the second question after absolute visibility
- Scheduled daily checks — manual-only is a dealbreaker; daily is the expected frequency
- Manual on-demand check trigger — users need to validate after content changes without waiting for the next cycle
- Historical data storage — necessary from day one to accumulate trend data
- Dashboard overview — current scores, competitor ranking, recent check timestamps

**Should have (competitive, v1.x):**
- Trend charts — line charts of visibility over time per platform and per prompt
- Change detection + email/Slack alerts — makes monitoring actionable; change notification is what drives daily engagement
- Multi-run noise reduction — run each prompt 3-5x, report mention rate; prevents unreliable single-sample data (also a pitfall mitigation)
- Mention position tracking — where in the response the brand appears; "first mentioned" is meaningfully different from "fifth mentioned"
- Full response archive UI — browse the actual AI response text for any check
- CSV export — stakeholder reporting requirement; standard across all competitors
- Sentiment analysis — is the mention positive, neutral, or negative; Profound leads here, most tools defer it

**Defer (v2+):**
- Citation/source URL tracking — which pages AI platforms cite; valuable but complex
- GEO optimization recommendations — content suggestions to improve visibility; high complexity, separate problem domain
- Prompt research/discovery — suggest new prompts based on industry; Profound's differentiator
- Multi-language/multi-region support — multiplies API costs significantly
- Google AI Overviews as 4th platform — add only if validated by actual need
- Looker Studio / BI tool integration — power user feature; internal tool doesn't need it initially

### Architecture Approach

The system follows a modular monolith pattern inside Next.js with a separate BullMQ worker process for background jobs. The key component boundary that makes the system correct is the separation between the Query Engine (sends prompts to AI platforms, normalizes responses) and the Analysis Engine (parses responses for brand mentions, scores, sentiment). These must be independent modules because analysis logic will improve over time and historical data needs to be re-processable. The data layer intentionally stores both raw AI responses (`query_runs.rawResponse`) and extracted analysis (`brand_mentions`), enabling re-analysis without re-querying the AI APIs. Dashboard performance depends on pre-computed `daily_snapshots` -- real-time aggregation over `brand_mentions` at scale will be unacceptably slow.

**Major components:**
1. **Query Engine** (`/src/lib/query-engine/`) — Provider adapter pattern with factory; sends prompts to all AI platforms in parallel; normalizes responses to shared interface; handles rate limiting per provider
2. **Analysis Engine** (`/src/lib/analysis/`) — Parses raw AI responses; detects brand mentions with position and context; scores sentiment; computes visibility metrics; runs as post-processing step on stored responses
3. **Job Queue + Worker** (`/src/lib/jobs/` + `/worker/`) — BullMQ scheduler for daily 6AM checks and on-demand triggers; separate Node.js process (not inside Next.js request cycle); handles retries with exponential backoff
4. **Data Layer** (`/src/lib/db/`) — Five core tables: `keywords`, `brands`, `query_runs` (raw responses), `brand_mentions` (extracted analysis), `alerts`; plus `daily_snapshots` for dashboard aggregation
5. **API Layer** (`/src/app/api/`) — Thin route handlers delegating to service layer; resources: keywords, brands, queries, mentions, analytics, alerts, system
6. **Dashboard** (`/src/app/(dashboard)/`) — React Server Components fetching directly from DB; client components for interactions; Recharts for trend visualization
7. **Alert Service** — Change detection comparing current vs previous mention state; threshold-based (not binary) to avoid false positives; email/Slack webhook delivery

### Critical Pitfalls

The PITFALLS research is unusually high quality and highly specific to this domain. All top pitfalls share a common theme: they are cheap to prevent at the start and extremely expensive to recover from after data has accumulated.

1. **Treating non-deterministic AI responses as deterministic data** — Run each prompt 3-5 times per check cycle; store all responses individually; report mention rate (e.g., "4/5 checks = 80%") not binary presence/absence. This must be in the data model from Phase 1 -- retrofitting requires a database migration and makes all historical data low-confidence.

2. **Prompt bias producing phantom mentions** — Use neutral, user-simulating prompts ("What are the best [category] tools?"), never prompts that name your own brand ("Is Brand X good for Y?"). Version-stamp every prompt so methodology changes are visible in trend analysis. Biased prompt data poisons all downstream analysis and the recovery cost is medium-high.

3. **API cost spiral from uncontrolled query volume** — Implement budget caps and cost estimation before any batch executes; show projected cost to the user. Use cheaper model tiers by default (GPT-4o-mini, Gemini Flash, Sonar). Track cost per keyword per platform. A user adding 200 keywords without budget guardrails can generate $500+/month in API costs.

4. **Model deprecation breaking production overnight** — Store model identifiers in config or database, never hardcoded in source. OpenAI deprecates models on a predictable cadence; build a model registry with a weekly health check job. Recovery cost is low if externalized; catastrophic if hardcoded.

5. **Naive string matching for mention detection** — String matching produces false positives ("We do NOT recommend Brand X" registers as a mention) and false negatives (contextual references, abbreviations, misspellings). Use a two-pass approach: primary string matching for speed, with LLM-based extraction (GPT-4o-mini, ~$0.001/call) as validation. Design the schema to support rich mention metadata from day one even if the extraction logic starts simple.

## Implications for Roadmap

The architecture research provides an explicit 7-phase build order based on component dependencies. All phases 1-4 are data-layer and infrastructure work that must precede any user-facing features. Phases 5-7 deliver the dashboard, alerts, and reporting. This order is correct and should be followed closely -- attempting to build the dashboard before the analysis engine exists produces a frontend with no data to display.

### Phase 1: Foundation and Data Model

**Rationale:** Everything writes to and reads from the database. The schema must support multi-sample queries, cost tracking, prompt versioning, and raw response storage from the start -- retrofitting these later is expensive or impossible. This is where the most critical pitfall mitigations live.
**Delivers:** Next.js project scaffold, PostgreSQL schema with all five core tables plus `daily_snapshots`, Drizzle ORM setup with migrations, basic environment configuration.
**Addresses features:** Historical data storage (table stakes); prompt versioning infrastructure (pitfall prevention); multi-sample data model (pitfall prevention); cost tracking schema (pitfall prevention).
**Avoids pitfalls:** Non-deterministic data storage (schema supports multiple runs per prompt); model deprecation (model stored as config field); API cost tracking (costUsd column on query_runs from day one).

### Phase 2: Query Engine

**Rationale:** The query engine is the core differentiator and everything downstream depends on having AI responses to analyze. Build all three provider adapters here so the Analysis Engine has real data to work with from the start.
**Delivers:** Provider adapter pattern with factory; ChatGPT, Perplexity, and Gemini provider implementations; prompt template library with version tracking; multi-sample query execution (3x per prompt); raw response storage in `query_runs`.
**Uses:** Vercel AI SDK, Zod for response validation, postgres.js + Drizzle for persistence.
**Implements:** Query Engine component (`/src/lib/query-engine/`).
**Avoids pitfalls:** Prompt bias (neutral prompt templates from the start); scraping fragility (API-first with Playwright adapter isolated behind interface); model deprecation (model name read from config).

### Phase 3: Analysis Engine

**Rationale:** Analysis is the transformation layer between raw AI responses and actionable data. It must exist before any meaningful dashboard metrics can be computed.
**Delivers:** Brand mention detection with alias dictionary; mention position tracking; context extraction; basic sentiment scoring; visibility score calculation; `brand_mentions` rows generated from each `query_run`.
**Uses:** TypeScript string matching + simple heuristics for Phase 1 implementation; schema designed to support LLM-based extraction upgrade in a future phase.
**Implements:** Analysis Engine component (`/src/lib/analysis/`).
**Avoids pitfalls:** Naive string matching (two-pass design with LLM upgrade path); false positive mentions (negative context detection for "NOT recommend" patterns).

### Phase 4: Job Queue and Scheduling

**Rationale:** Automation transforms a manual tool into a monitoring system. BullMQ provides the retry logic and persistence that AI API reliability requires.
**Delivers:** Redis + BullMQ setup; separate worker process entry point; daily scheduled check (6 AM cron); on-demand job trigger; rate limiting per provider; budget cap enforcement with automatic pause; Bull Board monitoring UI at `/admin/queues`.
**Uses:** BullMQ 5.x, IORedis, @bull-board/next.
**Implements:** Job Queue + Worker component.
**Avoids pitfalls:** API cost spiral (hard daily budget caps enforced in worker before executing batch); model deprecation health check (weekly validation job).

### Phase 5: API Layer and Basic Dashboard

**Rationale:** Once data is flowing (Phases 1-4), the API layer and dashboard can be built in parallel. REST endpoints expose the computed data; the dashboard presents it.
**Delivers:** Full CRUD API for keywords and brands; query trigger endpoint; analytics/trends endpoints; basic dashboard with visibility scores per platform, competitor comparison table, last-check timestamp; keyword and brand management UIs.
**Uses:** Next.js App Router route handlers, React Server Components, shadcn/ui, Tailwind CSS.
**Implements:** API Layer + Dashboard components.
**Addresses features:** Prompt management CRUD (table stakes); dashboard overview (table stakes); manual on-demand check trigger (table stakes); competitor tracking display (table stakes); visibility score display (table stakes).

### Phase 6: Trend Charts and Change Alerts

**Rationale:** Historical data accumulated in Phases 1-5 now has enough depth to visualize trends. Change detection requires at least 2 data points, which exist by this phase.
**Delivers:** Trend line charts (visibility over time per platform per keyword); brand comparison charts; `daily_snapshots` pre-computation job; change detection logic; alert record creation; email/Slack webhook notifications; alert feed UI with read/unread state.
**Uses:** Recharts (via shadcn/ui chart components), date-fns, nodemailer.
**Implements:** Alert Service; Dashboard trend and comparison views.
**Addresses features:** Trend charts (v1.x); change detection + alerts (v1.x); mention position display (v1.x); alert feed (v1.x).
**Avoids pitfalls:** Alert false positives (threshold-based detection, not binary; configurable sensitivity); no baseline data (2-week minimum data gate before trend display; methodology change markers on charts).

### Phase 7: Data Quality and Export

**Rationale:** Multi-run noise reduction, full response archive browsing, and CSV export round out the v1.x feature set. Sentiment upgrade (LLM-based extraction replacing string matching) delivers data quality improvements.
**Delivers:** Multi-run aggregation UI (shows mention rate as "4/5 checks"); full response archive with brand mention highlighting; CSV export for all data; LLM-based mention extraction upgrade (GPT-4o-mini post-processing pass); sentiment classification upgrade; cost dashboard with per-keyword breakdown.
**Addresses features:** Multi-run noise reduction (v1.x); full response archive UI (v1.x); CSV export (v1.x); sentiment analysis (v1.x).
**Avoids pitfalls:** Naive string matching (LLM extraction upgrade applied to all new data; historical raw responses re-processable).

### Phase Ordering Rationale

- **Phases 1-4 before any UI:** Database schema, query engine, analysis engine, and job queue are all prerequisites for meaningful dashboard data. This order matches the explicit dependency graph in ARCHITECTURE.md.
- **Query Engine before Analysis Engine:** You cannot parse what you have not collected. Analysis Engine must have real AI responses as input to be testable.
- **Job Queue in Phase 4, not Phase 2:** Manual execution of the query engine is sufficient to validate the query and analysis pipeline. Automation can wait until the pipeline is proven.
- **Trend Charts in Phase 6, not Phase 5:** Trend visualization requires accumulated historical data. Building the chart UI before data exists produces empty charts and no way to validate the implementation.
- **LLM extraction upgrade in Phase 7:** Start with simple string matching (fast to implement, good enough for MVP), but design the schema to support the upgrade. Phase 7 applies the upgrade, which can re-process all stored raw responses.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2 (Query Engine):** Each AI provider has specific quirks that need API reference validation during implementation. Perplexity requires strict alternating message format; Gemini grounding configuration is non-obvious; OpenAI Responses API (web search tool) vs standard Chat Completions differs. Recommend `/gsd:research-phase` or targeted docs lookup before implementing each provider adapter.
- **Phase 4 (Job Queue):** BullMQ Job Schedulers API (v5.16+) replaces deprecated repeatable jobs. The separation between the Next.js process and worker process has configuration nuances in different deployment environments (local Docker vs production). Recommend reviewing BullMQ docs on Job Schedulers and worker deployment before this phase.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Foundation):** Next.js + Drizzle + PostgreSQL setup is well-documented. Schema design is fully specified in ARCHITECTURE.md. No novel patterns.
- **Phase 3 (Analysis Engine):** Pure TypeScript string manipulation and simple heuristics. No external dependencies except an optional GPT-4o-mini call. Well-understood patterns.
- **Phase 5 (API + Dashboard):** Next.js App Router CRUD patterns are standard. shadcn/ui components are copy-paste. No novel integrations.
- **Phase 6 (Trends + Alerts):** Recharts integration via shadcn/ui chart components is documented. Nodemailer SMTP is standard. Change detection is straightforward comparison logic.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All technology choices validated against official docs and current npm versions. Drizzle vs Prisma recommendation backed by multiple independent sources. BullMQ Job Schedulers API confirmed as current approach (v5.16+). |
| Features | HIGH | Five competitive products analyzed with current pricing and feature sets. Market consensus on table stakes is very clear. MVP scope is conservative and defensible. |
| Architecture | HIGH | 7-phase build order derived from explicit component dependency analysis. Provider pattern is industry standard for multi-provider AI integrations. Data schema is fully specified with indexing strategy. |
| Pitfalls | HIGH | Pitfalls are domain-specific and well-sourced. All critical pitfalls are addressed at the correct phase. Recovery cost analysis validates prioritization. |

**Overall confidence:** HIGH

### Gaps to Address

- **Prompt template effectiveness:** Neutral prompts are the right approach, but which specific prompt templates produce the most consistent and comparable results across all three AI platforms needs empirical validation. Plan to run prompt validation experiments during Phase 2 before committing to a template library.
- **3x vs 5x samples per check:** Research recommends 3-5 samples per prompt per check cycle. The right number depends on the variance actually observed in production. Start with 3 (lower cost), monitor variance, increase to 5 if dashboards show excessive flip-flopping.
- **On-demand check UI pattern:** Research identifies that polling (`GET /api/queries?jobId=xxx`) or SSE are both valid for on-demand check status. The right choice depends on infrastructure (Vercel vs self-hosted) and perceived latency requirements. Decide during Phase 5 when deployment target is confirmed.
- **BullMQ worker deployment:** Separate worker process works cleanly with Docker/VPS. It requires additional configuration for serverless deployments (Vercel). Deployment target should be confirmed before Phase 4 to avoid redesign.

## Sources

### Primary (HIGH confidence)
- [Next.js 15 Docs](https://nextjs.org/docs) — App Router, Route Handlers, Server Components
- [Drizzle ORM Docs](https://orm.drizzle.team/) — Schema definition, query patterns, migrations
- [BullMQ Docs](https://docs.bullmq.io) — Job Schedulers API (v5.16+), worker patterns, rate limiting
- [Vercel AI SDK](https://ai-sdk.dev/docs/introduction) — Unified provider API, Perplexity sources support (4.2+)
- [Perplexity API Docs](https://docs.perplexity.ai/) — Sonar models, citation arrays, per-search pricing
- [OpenAI API Docs / Deprecations](https://developers.openai.com/api/docs/deprecations) — Model sunset schedule, Responses API
- [Gemini API Docs](https://ai.google.dev/gemini-api/docs/) — Rate limits, grounding configuration, model pricing

### Secondary (MEDIUM confidence)
- [Drizzle vs Prisma comparison (MakerKit, Bytebase)](https://makerkit.dev/blog/tutorials/drizzle-vs-prisma) — Performance and developer experience comparison
- [Otterly.AI](https://otterly.ai/features), [Profound](https://www.rankability.com/blog/profound-ai-review/), [Peec AI](https://peec.ai/), [BrandRank.AI](https://www.brandrank.ai) — Feature benchmarking
- [AI SEO Tracking Tools 2026 (Search Influence)](https://www.searchinfluence.com/blog/ai-seo-tracking-tools-2026-analysis-platforms/) — Market landscape
- [PostgreSQL Time Series Design (AWS)](https://aws.amazon.com/blogs/database/designing-high-performance-time-series-data-tables-on-amazon-rds-for-postgresql/) — BRIN indexes, partitioning strategies

### Tertiary (LOW confidence)
- [Tracking Brand Mentions in AI Chatbots (Spotlight)](https://www.get-spotlight.com/articles/tracking-brand-mentions-in-ai-chatbots-a-comprehensive-guide-to-monitoring-brand-presence-in-chatgpt-responses-feb-2026-data/) — Practical prompt design guidance; needs validation with own testing
- [AI Deprecations Feed](https://deprecations.info/) — Cross-provider model deprecation tracking; useful but third-party aggregation

---
*Research completed: 2026-03-20*
*Ready for roadmap: yes*
