---
phase: 02-data-pipeline
verified: 2026-03-22T18:05:00Z
status: passed
score: 20/20 must-haves verified
re_verification: false
---

# Phase 02: Data Pipeline Verification Report

**Phase Goal:** The system can query all three AI platforms, analyze responses for brand mentions, and run checks automatically on a daily schedule with cost controls
**Verified:** 2026-03-22T18:05:00Z
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
|----|-------|--------|----------|
| 1  | executeQuery('chatgpt', prompt) returns normalized QueryResult with text, token counts, costUsd, and empty citations | VERIFIED | `src/lib/pipeline/query-executor.ts` lines 21-37; 4 passing tests in query-executor.test.ts |
| 2  | executeQuery('perplexity', prompt) returns QueryResult with citations array extracted from sources | VERIFIED | `result.sources?.map((s) => s.url)` at line 34 of query-executor.ts; test "returns citations from perplexity sources" passes |
| 3  | executeQuery('gemini', prompt) returns normalized QueryResult | VERIFIED | providerMap includes `gemini: () => google(MODELS.gemini)` at line 7; test passes |
| 4  | calculateCost computes correct USD from token counts using per-model price table | VERIFIED | `src/lib/pipeline/cost-calculator.ts` exports PRICE_TABLE and calculateCost; 6 passing tests including exact numeric assertions |
| 5  | addQueryJobs enqueues 3 jobs with runNumber 1-3 sharing one batchId | VERIFIED | `queues.ts` loop `for (let runNumber = 1; runNumber <= 3; runNumber++)` at line 42; batchId via crypto.randomUUID() at line 39 |
| 6  | Budget env vars and schedule cron are validated via Zod with defaults | VERIFIED | `env.ts` lines 10-13: DAILY_BUDGET_OPENAI/PERPLEXITY/GEMINI (default 1.0), CHECK_SCHEDULE_CRON (default '0 0 * * *') |
| 7  | daily_snapshots table has a unique constraint for upsert support | VERIFIED | `schema.ts` line 143: `uniqueIndex('uq_daily_snapshots_lookup')` replacing prior index |
| 8  | detectBrands finds brand name and aliases case-insensitively in response text | VERIFIED | `brand-detector.ts` line 34: `lowerText = responseText.toLowerCase()`, line 49: `term.toLowerCase()`; 7 passing tests |
| 9  | detectBrands returns position as ordinal rank among all brands by first-appearance offset | VERIFIED | `brand-detector.ts` lines 62-67: sort by matchIndex, assign i+1 as position; test "position is ordinal rank" passes |
| 10 | detectBrands extracts 50-100 char context snippet around each mention | VERIFIED | `extractSnippet` at lines 14-28 uses contextRadius=40 (40+40+match); test "context snippet is 50-100 chars" passes |
| 11 | detectBrands returns mentioned:false with null position/snippet when brand not found | VERIFIED | `brand-detector.ts` line 84-87; test "returns mentioned:false" passes |
| 12 | analyzeSentiment returns 'positive', 'neutral', or 'negative' via gpt-4o-mini | VERIFIED | `sentiment-analyzer.ts` line 10: `openai('gpt-4o-mini')`; fallback `return 'neutral'` at line 22; 4 passing tests |
| 13 | aggregateSnapshot calculates mentionRate = mentions/3 and avgPosition, upserts to daily_snapshots | VERIFIED | `snapshot-aggregator.ts` lines 46-88; onConflictDoUpdate at line 76; 3 passing tests |
| 14 | Worker processes query-job, analysis-job, sentiment-job, snapshot-job in chain | VERIFIED | `worker/index.ts` switch cases at lines 31-45; query->analysis->snapshot chain wired via handlers |
| 15 | Budget checker returns false when daily spend for a provider exceeds the env-configured cap | VERIFIED | `budget-checker.ts` line 34: `return spent < cap`; 7 passing tests including at-cap and over-cap cases |
| 16 | Daily scheduler set up with BullMQ upsertJobScheduler using configurable cron pattern | VERIFIED | `scheduler-setup.ts` lines 6-15: `seoaiQueue.upsertJobScheduler('daily-check-scheduler', ...)` |
| 17 | POST /api/checks/run accepts keywordId and enqueues high-priority jobs for all 3 providers | VERIFIED | `checks/run/route.ts` lines 16-62; PROVIDERS=['chatgpt','perplexity','gemini'], runType:'manual', priority 1 |
| 18 | POST /api/checks/run returns 400/404/402 on invalid input/missing keyword/budget exceeded | VERIFIED | Lines 21, 29, 54 of route.ts; 6 passing API tests covering all error codes |
| 19 | Scheduled check handler loads all active keywords and enqueues jobs with budget check | VERIFIED | `worker/index.ts` lines 46-69: `keywords.isActive === true`, checkBudget per provider before enqueue |
| 20 | Rate limiting applied via per-provider delay on job enqueue | VERIFIED | `queues.ts` lines 15-19: PROVIDER_DELAYS (chatgpt:500ms, perplexity:1000ms, gemini:200ms), applied as `delay` option |

**Score:** 20/20 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/pipeline/query-executor.ts` | generateText wrapper per provider, returns QueryResult | VERIFIED | 37 lines, exports executeQuery and QueryResult, wired to cost-calculator and providers |
| `src/lib/pipeline/cost-calculator.ts` | Price table and cost calculation | VERIFIED | 24 lines, exports calculateCost and PRICE_TABLE, all 3 model prices present |
| `src/lib/queue/queues.ts` | Job enqueue helpers | VERIFIED | 84 lines, exports addQueryJobs, addAnalysisJob, addSentimentJob, addSnapshotJob, QueryJobData |
| `src/lib/pipeline/brand-detector.ts` | Brand mention detection with aliases, position, snippet | VERIFIED | 89 lines, exports detectBrands, BrandMatch, BrandInput |
| `src/lib/pipeline/sentiment-analyzer.ts` | LLM-based sentiment classification | VERIFIED | 23 lines, exports analyzeSentiment and Sentiment type |
| `src/lib/pipeline/snapshot-aggregator.ts` | Daily snapshot aggregation with upsert | VERIFIED | 90 lines, exports aggregateSnapshot, uses onConflictDoUpdate |
| `src/worker/handlers/query-handler.ts` | Query job processing | VERIFIED | 46 lines, exports handleQueryJob, calls executeQuery, addAnalysisJob, addSnapshotJob |
| `src/worker/handlers/analysis-handler.ts` | Analysis job processing | VERIFIED | 53 lines, exports handleAnalysisJob, calls detectBrands, addSentimentJob |
| `src/worker/handlers/sentiment-handler.ts` | Sentiment job processing | VERIFIED | 30 lines, exports handleSentimentJob, calls analyzeSentiment, updates brandMention |
| `src/worker/handlers/snapshot-handler.ts` | Snapshot job processing | VERIFIED | 9 lines, exports handleSnapshotJob, calls aggregateSnapshot |
| `src/lib/pipeline/budget-checker.ts` | Budget cap checking per provider per day | VERIFIED | 35 lines, exports checkBudget and getBudgetCap, SQL aggregation over UTC day range |
| `src/worker/handlers/scheduler-setup.ts` | BullMQ Job Scheduler for daily cron | VERIFIED | 19 lines, exports setupDailyScheduler, uses upsertJobScheduler |
| `src/app/api/checks/run/route.ts` | On-demand check trigger endpoint | VERIFIED | 62 lines, exports POST, Zod validation, budget checks, addQueryJobs for all 3 providers |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `query-executor.ts` | `src/lib/ai/providers.ts` | imports openai, google, perplexity, MODELS, ProviderId | WIRED | Line 2: `import { openai, google, perplexity, MODELS, type ProviderId } from '@/lib/ai/providers'` |
| `query-executor.ts` | `cost-calculator.ts` | calls calculateCost | WIRED | Line 3: import; line 32: `calculateCost(providerId, promptTokens, completionTokens)` |
| `queues.ts` | `query-executor.ts` | job data typed with QueryResult fields | WIRED | Line 3: `import type { ProviderId } from '@/lib/ai/providers'`; QueryJobData interface at line 21 |
| `worker/handlers/query-handler.ts` | `query-executor.ts` | calls executeQuery | WIRED | Line 7: import; line 15: `await executeQuery(providerId, prompt)` |
| `worker/handlers/query-handler.ts` | `queues.ts` | calls addAnalysisJob, addSnapshotJob | WIRED | Line 8: import; lines 35, 44 |
| `worker/handlers/analysis-handler.ts` | `brand-detector.ts` | calls detectBrands | WIRED | Line 5: import; line 27: `detectBrands(queryRun.rawResponse, ...)` |
| `worker/handlers/analysis-handler.ts` | `queues.ts` | calls addSentimentJob | WIRED | Line 6: import; line 50: `addSentimentJob(mention.id)` |
| `worker/handlers/sentiment-handler.ts` | `sentiment-analyzer.ts` | calls analyzeSentiment | WIRED | Line 5: import; line 23: `await analyzeSentiment(mention.contextSnippet)` |
| `worker/handlers/snapshot-handler.ts` | `snapshot-aggregator.ts` | calls aggregateSnapshot | WIRED | Line 2: import; line 8: `await aggregateSnapshot(batchId)` |
| `worker/index.ts` | `worker/handlers/*.ts` | switch-case dispatches to handlers | WIRED | Lines 4-7: all 4 handler imports; lines 31-45: cases query-job, analysis-job, sentiment-job, snapshot-job |
| `worker/index.ts` | `budget-checker.ts` | checks budget before executing query | WIRED | Line 9: import; line 33: `await checkBudget(providerId)` in query-job case |
| `worker/index.ts` | `scheduler-setup.ts` | calls setupDailyScheduler on worker startup | WIRED | Line 8: import; line 86: `setupDailyScheduler().catch(...)` |
| `checks/run/route.ts` | `queues.ts` | calls addQueryJobs for each provider | WIRED | Line 6: import; line 41: `await addQueryJobs({...})` in PROVIDERS loop |
| `checks/run/route.ts` | `budget-checker.ts` | checks budget before enqueuing | WIRED | Line 7: import; line 35: `await checkBudget(providerId)` |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| DATA-02 | 02-01 | User can query ChatGPT with tracking prompts | SATISFIED | executeQuery('chatgpt', ...) in query-executor.ts; 4 passing tests |
| DATA-03 | 02-01 | User can query Perplexity API with citations | SATISFIED | Perplexity provider in providerMap; citations extracted from result.sources |
| DATA-04 | 02-01 | User can query Gemini API | SATISFIED | Gemini provider in providerMap via google(MODELS.gemini) |
| DATA-05 | 02-01 | System runs each prompt 3 times per cycle | SATISFIED | addQueryJobs loop runNumber 1-3 with shared batchId |
| DATA-06 | 02-01 | System tracks API cost per query run | SATISFIED | calculateCost in cost-calculator.ts; costUsd stored in queryRuns via query-handler.ts |
| DATA-07 | 02-01 | System stores raw AI responses | SATISFIED | query-handler.ts line 24: `rawResponse: result.text` inserted to queryRuns |
| DATA-08 | 02-01 | System tracks prompt template versions | SATISFIED | promptVersion field in QueryJobData and queryRuns insert in query-handler.ts line 26 |
| ANLS-01 | 02-02 | System detects brand mentions with alias-aware matching | SATISFIED | brand-detector.ts: name + aliases searched case-insensitively; 7 passing tests |
| ANLS-02 | 02-02 | System calculates visibility score (% of runs where brand mentioned) | SATISFIED | snapshot-aggregator.ts: `mentionRate = mentionedCount / runs.length` |
| ANLS-03 | 02-02 | System tracks competitor brands alongside own brand | SATISFIED | analysis-handler.ts loads ALL brands (`db.select().from(brands)`); brands table has `isOwn` column |
| ANLS-04 | 02-02 | System tracks mention position (1st, 2nd, 3rd) | SATISFIED | brand-detector.ts assigns ordinal positions by first-appearance offset |
| ANLS-05 | 02-02 | System classifies mention sentiment | SATISFIED | sentiment-analyzer.ts via gpt-4o-mini; sentiment-handler.ts updates brandMentions.sentiment |
| ANLS-06 | 02-02 | System stores full response text with mention context | SATISFIED | rawResponse stored in queryRuns; contextSnippet (50-100 chars) stored in brandMentions |
| AUTO-01 | 02-03 | System runs scheduled daily checks at configurable time | SATISFIED | scheduler-setup.ts: upsertJobScheduler with CHECK_SCHEDULE_CRON; scheduled-check case in worker/index.ts |
| AUTO-02 | 02-03 | User can trigger on-demand check for a specific keyword | SATISFIED | POST /api/checks/run accepts keywordId, enqueues manual-priority jobs for all 3 providers |
| AUTO-03 | 02-03 | System enforces daily budget cap per platform | SATISFIED | budget-checker.ts: SQL SUM(costUsd) per UTC day vs cap; checked at enqueue (API) and execution (worker) |
| AUTO-04 | 02-03 | System implements rate limiting per AI provider | SATISFIED | queues.ts PROVIDER_DELAYS (chatgpt:500ms, perplexity:1000ms, gemini:200ms) applied as BullMQ job delay |

All 17 requirement IDs satisfied. No orphaned requirements detected (all IDs in REQUIREMENTS.md for Phase 2 are accounted for in the three plans).

---

### Anti-Patterns Found

No anti-patterns detected. Scanning of all 12 phase-02 source files revealed:
- No TODO/FIXME/PLACEHOLDER comments
- No stub implementations (return null, return {}, return [])
- No console.log-only handlers
- No empty async functions

---

### Human Verification Required

The following behaviors cannot be verified by static analysis:

#### 1. End-to-end pipeline execution

**Test:** With API keys set, call POST /api/checks/run with a real keywordId and observe the job chain processing.
**Expected:** query-job executes (AI call), analysis-job detects brands in response, sentiment-job classifies mentions, snapshot-job upserts to daily_snapshots.
**Why human:** Requires live Redis, database, and AI provider API keys. Static analysis cannot verify the full async chain fires correctly in a real BullMQ environment.

#### 2. Daily scheduler actual cron firing

**Test:** Set CHECK_SCHEDULE_CRON to a near-future time (e.g., 1 minute from now), start the worker, wait for the scheduled-check job to fire.
**Expected:** All active keywords get query jobs enqueued for all 3 providers.
**Why human:** BullMQ upsertJobScheduler cron behavior requires a running Redis and worker; cannot be verified in unit tests.

#### 3. Budget enforcement at scale

**Test:** Set a low DAILY_BUDGET_OPENAI (e.g., 0.001), execute a query that exceeds it, then trigger another check for the same provider.
**Expected:** Second check returns budget_exceeded status without executing the AI call.
**Why human:** Requires real query cost data accumulating in the database; mock-based tests verify logic but not real decimal precision from actual API responses.

---

## Verification Summary

Phase 02 goal is fully achieved. All three plans delivered working, substantive implementations:

- **Plan 02-01** (Query Engine): executeQuery wraps all 3 AI providers via AI SDK generateText, calculateCost uses a per-model price table, addQueryJobs batches 3 runs with provider-specific delays. Env vars validated. Schema unique constraint in place.

- **Plan 02-02** (Analysis Engine): detectBrands performs case-insensitive alias matching with ordinal position ranking and 50-100 char context snippets. analyzeSentiment uses gpt-4o-mini with neutral fallback. aggregateSnapshot calculates mentionRate and avgPosition with Drizzle upsert. All 4 worker handlers wired into the switch-case chain.

- **Plan 02-03** (Automation Layer): checkBudget queries daily SQL spend against env-configured caps. setupDailyScheduler uses BullMQ upsertJobScheduler with configurable cron. POST /api/checks/run validates input, checks budget per provider, enqueues manual-priority jobs. Worker checks budget before each query-job execution.

All 17 requirement IDs (DATA-02 through DATA-08, ANLS-01 through ANLS-06, AUTO-01 through AUTO-04) are satisfied with working, wired implementations. All 8 commits verified in git log. 46 unit tests pass across all phase-02 modules. The one failing test suite (queue.test.ts) is a pre-existing integration test that requires Redis and is unrelated to this phase.

---

_Verified: 2026-03-22T18:05:00Z_
_Verifier: Claude (gsd-verifier)_
