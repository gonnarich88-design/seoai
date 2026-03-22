# Roadmap: SEO AI Monitor (AEO)

## Overview

This roadmap delivers an internal AEO monitoring tool that tracks brand mentions across ChatGPT, Perplexity, and Gemini. The build progresses from infrastructure and schema, through the complete data pipeline (query, analyze, automate), to the dashboard UI, and finally alerts and reporting. Each phase delivers a coherent, verifiable capability that builds on the previous one.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation** - Project scaffold, database schema, and infrastructure setup (completed 2026-03-21)
- [x] **Phase 2: Data Pipeline** - Query engine, analysis engine, and automated scheduling (completed 2026-03-22)
- [ ] **Phase 3: Dashboard** - UI for visibility scores, competitor comparison, trends, and data management
- [ ] **Phase 4: Alerts and Reporting** - Change detection, notifications, weekly reports, and data export

## Phase Details

### Phase 1: Foundation
**Goal**: The project infrastructure exists and is ready to receive data -- database schema supports multi-sample queries, cost tracking, prompt versioning, and raw response storage from day one
**Depends on**: Nothing (first phase)
**Requirements**: INFR-01, INFR-02, INFR-03, INFR-04, INFR-05, DATA-01
**Success Criteria** (what must be TRUE):
  1. Next.js 15 app runs locally with TypeScript, App Router, and all core dependencies installed
  2. PostgreSQL database is running with all core tables created via Drizzle migrations (keywords, brands, query_runs, brand_mentions, alerts, daily_snapshots)
  3. User can create, edit, and delete keyword/prompt entries via API endpoints
  4. Redis and BullMQ are configured and a test job can be enqueued and processed by the worker
  5. Simple authentication prevents unauthorized access to the application
**Plans**: 3 plans

Plans:
- [ ] 01-01-PLAN.md — Project scaffold, Docker Compose, Drizzle schema, database migrations
- [ ] 01-02-PLAN.md — BullMQ queue + worker, Vercel AI SDK providers
- [ ] 01-03-PLAN.md — Authentication middleware + login, Keywords and Brands CRUD API

### Phase 2: Data Pipeline
**Goal**: The system can query all three AI platforms, analyze responses for brand mentions, and run checks automatically on a daily schedule with cost controls
**Depends on**: Phase 1
**Requirements**: DATA-02, DATA-03, DATA-04, DATA-05, DATA-06, DATA-07, DATA-08, ANLS-01, ANLS-02, ANLS-03, ANLS-04, ANLS-05, ANLS-06, AUTO-01, AUTO-02, AUTO-03, AUTO-04
**Success Criteria** (what must be TRUE):
  1. User can trigger a check for a keyword and receive normalized responses from ChatGPT, Perplexity, and Gemini with raw responses stored for auditing
  2. System runs each prompt 3 times per check cycle, stores all individual responses, and calculates visibility score as mention rate (e.g., "mentioned in 2/3 runs = 67%")
  3. System detects brand mentions (including aliases) in AI responses with position tracking, sentiment classification, and highlighted context
  4. Scheduled daily checks run automatically at a configurable time, with rate limiting per provider and daily budget caps that pause checks when exceeded
  5. User can define competitor brands and the system tracks their mentions alongside the user's own brand
**Plans**: 3 plans

Plans:
- [ ] 02-01-PLAN.md — Query executor, cost calculator, env vars, schema migration, queue job helpers
- [ ] 02-02-PLAN.md — Brand detector, sentiment analyzer, snapshot aggregator, worker job handlers
- [ ] 02-03-PLAN.md — Budget checker, daily scheduler, on-demand check API, scheduled-check handler

### Phase 3: Dashboard
**Goal**: User can see and interact with all collected data through a web dashboard showing visibility scores, competitor comparisons, trends, and full response archives
**Depends on**: Phase 2
**Requirements**: DASH-01, DASH-02, DASH-03, DASH-04, DASH-05, DASH-06
**Success Criteria** (what must be TRUE):
  1. User sees an overview dashboard with current visibility scores per platform, key metrics, and last-check timestamps
  2. User sees a competitor comparison table showing visibility scores side-by-side across platforms
  3. User sees trend charts showing visibility score changes over time per keyword per platform
  4. User can browse the full AI response archive with brand mentions highlighted in context
  5. User can manage keywords and brands (add, edit, delete, toggle active/inactive, configure aliases) through the dashboard UI
**Plans**: 3 plans

Plans:
- [ ] 03-01-PLAN.md — Dashboard API routes (overview, trends, archive), layout shell with sidebar and keyword selector
- [ ] 03-02-PLAN.md — Data view pages: Overview, Competitors, Trends, Archive with Recharts charts
- [ ] 03-03-PLAN.md — Management pages: Keywords and Brands CRUD UI with modal forms

### Phase 4: Alerts and Reporting
**Goal**: The system proactively notifies users of meaningful changes and provides reporting tools for stakeholder communication
**Depends on**: Phase 3
**Requirements**: ALRT-01, ALRT-02, ALRT-03, ALRT-04, ALRT-05
**Success Criteria** (what must be TRUE):
  1. System detects meaningful visibility changes (brand appeared, disappeared, rank changed significantly) and creates alert records
  2. User receives email notifications when alerts are triggered
  3. User sees an alert feed in the dashboard with read/unread state
  4. System generates a weekly summary report of visibility changes across all tracked keywords and platforms
  5. User can export monitoring data to CSV for external reporting
**Plans**: TBD

Plans:
- [ ] 04-01: TBD
- [ ] 04-02: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 0/3 | Complete    | 2026-03-21 |
| 2. Data Pipeline | 3/3 | Complete    | 2026-03-22 |
| 3. Dashboard | 0/3 | Not started | - |
| 4. Alerts and Reporting | 0/2 | Not started | - |
