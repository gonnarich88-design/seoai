# Phase 2: Data Pipeline - Research

**Researched:** 2026-03-22
**Domain:** AI query engine, brand analysis, job scheduling, cost tracking
**Confidence:** HIGH

## Summary

Phase 2 implements the core data pipeline: querying 3 AI providers (OpenAI, Google Gemini, Perplexity) via Vercel AI SDK `generateText`, detecting brand mentions via string matching, classifying sentiment via gpt-4o-mini, aggregating daily snapshots, and running scheduled checks with budget controls. The existing Phase 1 foundation provides all necessary infrastructure -- AI provider instances, BullMQ queue with retry config, DB schema with 6 tables, and API route patterns.

The main technical challenges are: (1) orchestrating 3 runs per keyword per provider with batch tracking, (2) correct cost calculation from token usage, (3) BullMQ Job Scheduler for daily cron, (4) rate limiting per provider, and (5) budget cap enforcement that halts a platform mid-day when exceeded. All dependencies are already installed -- no new packages required.

**Primary recommendation:** Structure implementation as job handlers in the existing worker switch-case pattern, with separate job types for query execution, brand analysis, sentiment classification, and snapshot aggregation. Use BullMQ `upsertJobScheduler` for the daily cron schedule.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Brand mention detection: string matching + case-insensitive + aliases from brands.aliases jsonb array
- Position = ordinal position of first mention in response (1st = position 1, 2nd = position 2)
- Context snippet = 50-100 chars around brand mention position
- Sentiment: LLM-based classification with gpt-4o-mini, separate BullMQ analysis job
- Sentiment only for rows where mentioned = true
- Scheduler: BullMQ Job Scheduler (built-in), 00:00 UTC daily, configurable via env var
- Budget cap: per-platform per-day, stop platform when exceeded for the day, reset next day
- Rate limiting: BullMQ limiter delay between jobs per provider
- On-demand: POST /api/checks/run with { keywordId }, high priority, still respects budget cap
- Daily snapshot: upsert to daily_snapshots after batch of 3 runs complete
- Cost: calculate from token usage (promptTokens + completionTokens) x price table constants
- Retry: 3 attempts + exponential backoff per job
- Partial batch failure: successful runs still stored normally

### Claude's Discretion
- Job type naming and queue structure (suggested: query-job, analysis-job, snapshot-job)
- Price constants per model (reference from official pricing pages)
- Exact delay values for rate limiting per provider
- Error notification strategy (log vs alert)
- API response normalization format between providers

### Deferred Ideas (OUT OF SCOPE)
- LLM-based brand mention extraction (ADV-01 in v2) -- Phase 2 uses string matching
- Citation/source URL tracking (ADV-02) -- deferred to v2
- "Run all active keywords" on-demand trigger -- Phase 2 supports specific keyword only
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DATA-02 | Query ChatGPT with tracking prompts, normalized responses | AI SDK `generateText` with `openai('gpt-4o-mini')`, returns text + usage |
| DATA-03 | Query Perplexity with tracking prompts, normalized responses with citations | AI SDK `generateText` with `perplexity('sonar')`, `result.sources` for citations |
| DATA-04 | Query Gemini with tracking prompts, normalized responses | AI SDK `generateText` with `google('gemini-2.0-flash')` |
| DATA-05 | Run each prompt 3 times per check cycle | batchId groups 3 runs, runNumber 1-3 per keyword+provider |
| DATA-06 | Track API cost per query run, cumulative per keyword/platform | Token usage from AI SDK + price table constants per model |
| DATA-07 | Store raw AI responses for re-analysis and auditing | rawResponse text column in queryRuns table (already in schema) |
| DATA-08 | Track prompt template versions for methodology visibility | promptVersion from keywords table, copied to queryRuns.promptVersion |
| ANLS-01 | Detect brand mentions using alias-aware matching | Case-insensitive string matching across brand name + aliases array |
| ANLS-02 | Calculate visibility score (mention rate) per keyword per platform | mentionRate = mentions / 3 runs, stored in daily_snapshots |
| ANLS-03 | Define competitor brands, track alongside own brand | Existing brands table with isOwn flag; analysis runs against ALL brands |
| ANLS-04 | Track mention position in AI responses | Ordinal position (1st, 2nd, 3rd) of first mention occurrence |
| ANLS-05 | Classify mention sentiment (positive/neutral/negative) | Separate sentiment-job using gpt-4o-mini to classify context snippets |
| ANLS-06 | Store full response with brand mention highlighting | rawResponse stored; contextSnippet extracted during analysis |
| AUTO-01 | Scheduled daily checks at configurable time | BullMQ upsertJobScheduler with cron pattern, env-configurable |
| AUTO-02 | On-demand check for specific keyword | POST /api/checks/run endpoint, priority: 1 (higher than scheduled) |
| AUTO-03 | Daily budget cap per platform, pause when exceeded | SUM(costUsd) from query_runs per provider per day, checked before each job |
| AUTO-04 | Rate limiting per AI provider | BullMQ worker limiter config or manual delay between jobs per provider |
</phase_requirements>

## Standard Stack

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| ai | ^4.3.19 | `generateText` for AI queries | Unified interface across providers, returns usage tokens |
| @ai-sdk/openai | ^3.0.47 | OpenAI provider | Already configured in providers.ts |
| @ai-sdk/google | ^3.0.52 | Google Gemini provider | Already configured in providers.ts |
| @ai-sdk/perplexity | ^3.0.25 | Perplexity provider | Already configured, returns sources |
| bullmq | ^5.71.0 | Job queue, scheduler, rate limiting | Already configured with queue and worker |
| drizzle-orm | ^0.45.1 | Database queries, upserts | Already configured with schema |
| zod | ^3.25.76 | Request validation | Already used in API routes |

### Supporting (Already Installed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| date-fns | ^4.1.0 | Date manipulation for daily snapshots | Date formatting, start/end of day calculations |

### No New Dependencies Required
All needed libraries are already in package.json from Phase 1. No additional packages to install.

## Architecture Patterns

### Recommended Project Structure
```
src/
  lib/
    pipeline/
      query-executor.ts     # generateText wrapper per provider, returns normalized result
      brand-detector.ts     # String matching + alias detection logic
      sentiment-analyzer.ts # gpt-4o-mini sentiment classification
      snapshot-aggregator.ts # Calculate and upsert daily_snapshots
      cost-calculator.ts    # Price table + cost calculation from tokens
      budget-checker.ts     # Check daily spend per provider against cap
    queue/
      queues.ts             # Add job helper functions (addQueryJob, addAnalysisJob, etc.)
      connection.ts         # Existing connection config
  worker/
    index.ts                # Add job handlers to existing switch-case
    handlers/
      query-handler.ts      # Process query-job: call AI, store queryRun, trigger analysis
      analysis-handler.ts   # Process analysis-job: detect brands, create brandMentions
      sentiment-handler.ts  # Process sentiment-job: classify sentiment via gpt-4o-mini
      snapshot-handler.ts   # Process snapshot-job: aggregate batch into daily_snapshots
      scheduler-setup.ts    # upsertJobScheduler for daily cron
  app/
    api/
      checks/
        run/
          route.ts          # POST /api/checks/run -- on-demand check trigger
```

### Pattern 1: Job Chain (Query -> Analysis -> Sentiment -> Snapshot)
**What:** Each job type triggers the next in the pipeline
**When to use:** For every query execution flow
**Example:**
```typescript
// query-handler.ts -- after AI query completes
// 1. Store queryRun in DB
// 2. For each brand, add analysis-job
// 3. After all 3 runs in batch complete, add snapshot-job

// analysis-handler.ts -- after brand detection completes
// 1. Store brandMention in DB
// 2. If mentioned=true, add sentiment-job

// sentiment-handler.ts -- after sentiment classification
// 1. Update brandMention.sentiment in DB

// snapshot-handler.ts -- after batch complete
// 1. Query all runs+mentions for this batch
// 2. Calculate mentionRate, avgPosition
// 3. Upsert daily_snapshots
```

### Pattern 2: Batch Orchestration with batchId
**What:** Group 3 runs of the same keyword+provider under a UUID batchId
**When to use:** Every check cycle (scheduled or on-demand)
**Example:**
```typescript
const batchId = crypto.randomUUID();
for (let runNumber = 1; runNumber <= 3; runNumber++) {
  await seoaiQueue.add('query-job', {
    keywordId,
    providerId,
    batchId,
    runNumber,
    prompt,
    promptVersion,
  }, {
    priority: isManual ? 1 : 10,
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
  });
}
```

### Pattern 3: Budget Check Before Execution
**What:** Query SUM(costUsd) for provider+today before processing each query-job
**When to use:** At the start of every query-handler
**Example:**
```typescript
import { sql, eq, and, gte, lt } from 'drizzle-orm';

async function checkBudget(providerId: string): Promise<boolean> {
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

  const budgetCap = getBudgetCap(providerId); // from env
  return parseFloat(result.total) < budgetCap;
}
```

### Anti-Patterns to Avoid
- **Single monolithic job handler:** Do NOT put all logic (query + analysis + sentiment + snapshot) in one job. Separate job types allow independent retries and better error isolation.
- **Blocking on sentiment for snapshot:** Sentiment is a separate concern. Snapshot aggregation should trigger after 3 query runs complete, not after sentiment finishes.
- **Global rate limiter:** Do NOT use a single global rate limiter. Each provider has different rate limits. Use per-provider delay strategy.
- **Counting batch completion in memory:** Do NOT track batch progress in worker memory. Query the DB for `COUNT(*) WHERE batchId = X` to determine if 3 runs are complete.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cron scheduling | Custom setTimeout/setInterval | BullMQ `upsertJobScheduler` | Handles restarts, persistence, exact cron semantics |
| Job retry with backoff | Custom retry loop | BullMQ `attempts` + `backoff` config | Already battle-tested, handles edge cases |
| AI provider abstraction | Custom fetch wrappers per provider | AI SDK `generateText` | Unified interface, handles auth, returns usage tokens |
| Rate limiting | Custom token bucket | BullMQ worker `limiter` or manual `delay` in job opts | Built into the queue system |
| DB upsert for snapshots | SELECT then INSERT/UPDATE | Drizzle `onConflictDoUpdate` | Atomic, handles race conditions |

## Common Pitfalls

### Pitfall 1: Perplexity Sources vs Citations Schema Mismatch
**What goes wrong:** The `queryRuns.citations` column expects `string[]`, but AI SDK v4 returns `result.sources` as source objects (not plain strings).
**Why it happens:** AI SDK changed from raw citation arrays to structured source objects with `url` and `title` properties.
**How to avoid:** Map `result.sources` to extract URLs as string array before storing: `result.sources?.map(s => s.url) ?? []`
**Warning signs:** Type errors when inserting citations, or null citations for Perplexity runs.

### Pitfall 2: Cost Calculation with Decimal Precision
**What goes wrong:** Floating-point arithmetic produces values like 0.0000014999... instead of 0.000015.
**Why it happens:** JavaScript float math on very small numbers (token price * count).
**How to avoid:** Use integer arithmetic in smallest unit (e.g., microdollars) then convert, or use string-based decimal from Drizzle. The `costUsd` column is `decimal(10,6)` which is already correct for storage.
**Warning signs:** Budget cap checks fail due to accumulating floating-point errors.

### Pitfall 3: Daily Snapshots Upsert Needs Unique Constraint
**What goes wrong:** `onConflictDoUpdate` requires a unique constraint target, but the current schema only has an index, not a unique constraint, on `(keywordId, brandId, providerId, date)`.
**Why it happens:** Schema was created with `index()` not `uniqueIndex()`.
**How to avoid:** Create a Drizzle migration to add a unique constraint on `(keyword_id, brand_id, provider_id, date)` in `daily_snapshots`, OR use `onConflictDoNothing` with a separate update query.
**Warning signs:** Duplicate daily_snapshot rows for the same keyword+brand+provider+date, or upsert errors.

### Pitfall 4: Budget Cap Race Condition
**What goes wrong:** Multiple concurrent jobs check budget at the same time, all pass, then all execute and collectively exceed the cap.
**Why it happens:** Budget check is not atomic with job execution.
**How to avoid:** Acceptable at this scale -- the overshoot is bounded by concurrency (max 5 concurrent workers). For extra safety, reduce worker concurrency for query jobs or check budget again after execution and log a warning.
**Warning signs:** Daily spend exceeds cap by more than the cost of a few queries.

### Pitfall 5: BullMQ Rate Limiting Is Global, Not Per-Provider
**What goes wrong:** BullMQ worker `limiter` config applies to ALL jobs in the queue, not per provider.
**Why it happens:** BullMQ rate limiter works at queue level, not at job data level (groupKey was removed in v3+).
**How to avoid:** Use separate queues per provider (e.g., `seoai-openai`, `seoai-perplexity`, `seoai-gemini`) each with their own rate limit. OR use a single queue with manual delay by setting `delay` on each job based on its provider, OR use concurrency=1 with a built-in delay in the handler.
**Warning signs:** OpenAI jobs starved because Perplexity jobs consume all rate capacity, or vice versa.

### Pitfall 6: Worker Crashes Before Snapshot Aggregation
**What goes wrong:** 3 query runs complete, but worker crashes before snapshot-job is processed.
**Why it happens:** No persistent tracking of "batch complete" state.
**How to avoid:** On worker startup or as a periodic check, scan for batches with 3 completed runs but no corresponding daily_snapshot entry, and create snapshot jobs for them.
**Warning signs:** Missing daily_snapshots for dates where query_runs exist.

## Code Examples

### Example 1: Query Executor with generateText
```typescript
// src/lib/pipeline/query-executor.ts
import { generateText } from 'ai';
import { openai, google, perplexity, MODELS, type ProviderId } from '@/lib/ai/providers';

const providerMap = {
  chatgpt: () => openai(MODELS.chatgpt),
  gemini: () => google(MODELS.gemini),
  perplexity: () => perplexity(MODELS.perplexity),
} as const;

export interface QueryResult {
  text: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd: number;
  latencyMs: number;
  citations: string[];
}

export async function executeQuery(
  providerId: ProviderId,
  prompt: string,
): Promise<QueryResult> {
  const model = providerMap[providerId]();
  const start = Date.now();

  const result = await generateText({
    model,
    prompt,
  });

  const latencyMs = Date.now() - start;
  const { promptTokens, completionTokens, totalTokens } = result.usage;
  const costUsd = calculateCost(providerId, promptTokens, completionTokens);
  const citations = result.sources?.map((s: { url: string }) => s.url) ?? [];

  return {
    text: result.text,
    promptTokens,
    completionTokens,
    totalTokens,
    costUsd,
    latencyMs,
    citations,
  };
}
```

### Example 2: Brand Detection with Aliases
```typescript
// src/lib/pipeline/brand-detector.ts
export interface BrandMatch {
  brandId: string;
  mentioned: boolean;
  position: number | null;       // 1-based ordinal
  contextSnippet: string | null; // 50-100 chars around mention
}

export function detectBrands(
  responseText: string,
  brands: Array<{ id: string; name: string; aliases: string[] }>,
): BrandMatch[] {
  const lowerText = responseText.toLowerCase();

  return brands.map((brand) => {
    const searchTerms = [brand.name, ...brand.aliases];
    let earliestIndex = -1;
    let matchedTerm = '';

    for (const term of searchTerms) {
      const idx = lowerText.indexOf(term.toLowerCase());
      if (idx !== -1 && (earliestIndex === -1 || idx < earliestIndex)) {
        earliestIndex = idx;
        matchedTerm = term;
      }
    }

    if (earliestIndex === -1) {
      return { brandId: brand.id, mentioned: false, position: null, contextSnippet: null };
    }

    // Calculate ordinal position among all brand mentions
    // Position = how many other brands appear before this one + 1
    // (simplified: position based on character offset order)
    const position = calculateOrdinalPosition(lowerText, earliestIndex, brands);
    const contextSnippet = extractSnippet(responseText, earliestIndex, matchedTerm.length);

    return { brandId: brand.id, mentioned: true, position, contextSnippet };
  });
}

function extractSnippet(text: string, matchIndex: number, matchLength: number): string {
  const contextRadius = 40; // ~80 chars total + match
  const start = Math.max(0, matchIndex - contextRadius);
  const end = Math.min(text.length, matchIndex + matchLength + contextRadius);
  let snippet = text.slice(start, end);
  if (start > 0) snippet = '...' + snippet;
  if (end < text.length) snippet = snippet + '...';
  return snippet;
}
```

### Example 3: Price Table Constants
```typescript
// src/lib/pipeline/cost-calculator.ts
// Prices per 1M tokens (USD) -- verified 2026-03-22
const PRICE_TABLE: Record<string, { inputPerMillion: number; outputPerMillion: number }> = {
  'gpt-4o-mini':      { inputPerMillion: 0.150,  outputPerMillion: 0.600 },
  'gemini-2.0-flash':  { inputPerMillion: 0.100,  outputPerMillion: 0.400 },
  'sonar':             { inputPerMillion: 1.000,  outputPerMillion: 1.000 },
};

export function calculateCost(
  providerId: string,
  promptTokens: number,
  completionTokens: number,
): number {
  const model = MODELS[providerId as keyof typeof MODELS];
  const prices = PRICE_TABLE[model];
  if (!prices) return 0;

  const inputCost = (promptTokens / 1_000_000) * prices.inputPerMillion;
  const outputCost = (completionTokens / 1_000_000) * prices.outputPerMillion;
  return parseFloat((inputCost + outputCost).toFixed(6));
}
```

### Example 4: BullMQ Job Scheduler Setup
```typescript
// src/worker/handlers/scheduler-setup.ts
import { seoaiQueue } from '@/lib/queue/queues';

export async function setupDailyScheduler() {
  const cronPattern = process.env.CHECK_SCHEDULE_CRON || '0 0 0 * * *'; // 00:00 UTC

  await seoaiQueue.upsertJobScheduler(
    'daily-check-scheduler',
    { pattern: cronPattern },
    {
      name: 'scheduled-check',
      data: { type: 'daily' },
      opts: {
        priority: 10, // lower priority than manual (1)
      },
    },
  );
  console.log(`Daily scheduler set with cron: ${cronPattern}`);
}
```

### Example 5: Sentiment Analysis via gpt-4o-mini
```typescript
// src/lib/pipeline/sentiment-analyzer.ts
import { generateText } from 'ai';
import { openai } from '@/lib/ai/providers';

export type Sentiment = 'positive' | 'neutral' | 'negative';

export async function analyzeSentiment(contextSnippet: string): Promise<Sentiment> {
  const result = await generateText({
    model: openai('gpt-4o-mini'),
    prompt: `Classify the sentiment of this brand mention as exactly one of: positive, neutral, negative.

Context: "${contextSnippet}"

Respond with only one word: positive, neutral, or negative.`,
  });

  const sentiment = result.text.trim().toLowerCase();
  if (sentiment === 'positive' || sentiment === 'neutral' || sentiment === 'negative') {
    return sentiment;
  }
  return 'neutral'; // fallback
}
```

### Example 6: Daily Snapshot Upsert
```typescript
// src/lib/pipeline/snapshot-aggregator.ts
import { db } from '@/lib/db';
import { queryRuns, brandMentions, dailySnapshots } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';

export async function aggregateSnapshot(batchId: string) {
  // Get all runs in this batch
  const runs = await db.select().from(queryRuns).where(eq(queryRuns.batchId, batchId));
  if (runs.length === 0) return;

  const { keywordId, providerId } = runs[0];
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  // Get all brand mentions for these runs
  const runIds = runs.map(r => r.id);
  const mentions = await db.select().from(brandMentions)
    .where(sql`${brandMentions.queryRunId} IN ${runIds}`);

  // Group by brand
  const brandGroups = new Map<string, typeof mentions>();
  for (const m of mentions) {
    if (!brandGroups.has(m.brandId)) brandGroups.set(m.brandId, []);
    brandGroups.get(m.brandId)!.push(m);
  }

  // Upsert snapshot per brand
  for (const [brandId, brandMentionList] of brandGroups) {
    const mentionedCount = brandMentionList.filter(m => m.mentioned).length;
    const mentionRate = mentionedCount / runs.length;
    const mentionedWithPosition = brandMentionList.filter(m => m.mentioned && m.position);
    const avgPosition = mentionedWithPosition.length > 0
      ? mentionedWithPosition.reduce((sum, m) => sum + (m.position ?? 0), 0) / mentionedWithPosition.length
      : null;

    await db.insert(dailySnapshots).values({
      date: today,
      keywordId,
      brandId,
      providerId,
      mentionRate: mentionRate.toFixed(4),
      avgPosition: avgPosition?.toFixed(2) ?? null,
      runCount: runs.length,
    }).onConflictDoUpdate({
      target: [dailySnapshots.keywordId, dailySnapshots.brandId, dailySnapshots.providerId, dailySnapshots.date],
      set: {
        mentionRate: mentionRate.toFixed(4),
        avgPosition: avgPosition?.toFixed(2) ?? null,
        runCount: runs.length,
      },
    });
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| BullMQ `queue.add('name', data, { repeat: {...} })` | `queue.upsertJobScheduler(id, repeatOpts, template)` | BullMQ v5.16.0 | New API, old repeatable jobs deprecated |
| Perplexity raw citations array | AI SDK `result.sources` structured objects | AI SDK v4.2+ | Must map source objects to URL strings |
| BullMQ `limiter.groupKey` for per-group rate limiting | Removed in BullMQ v3+ | BullMQ v3.0 | Must use separate queues or manual delays for per-provider limiting |

**Deprecated/outdated:**
- `queue.add(..., { repeat: { cron: '...' } })` -- replaced by `upsertJobScheduler`
- `limiter.groupKey` -- removed in BullMQ v3+, use separate queues or manual strategies

## Rate Limiting Strategy

Since BullMQ removed `groupKey` for per-provider rate limiting, the recommended approach for this project is:

**Option A (Recommended): Manual delay per provider**
Add a configurable delay to each job based on provider. Simple, no extra queues.
```typescript
const PROVIDER_DELAYS: Record<ProviderId, number> = {
  chatgpt: 500,     // 2 req/sec for OpenAI
  perplexity: 1000, // 1 req/sec for Perplexity
  gemini: 200,      // 5 req/sec for Gemini
};

await seoaiQueue.add('query-job', jobData, {
  delay: PROVIDER_DELAYS[providerId] * runNumber,
  // ... other opts
});
```

**Option B: Separate queues per provider**
More robust but more complex -- requires 3 queues, 3 workers with individual limiter configs.

Option A is simpler and sufficient for this project's scale (daily checks for a small number of keywords).

## Schema Migration Required

The `daily_snapshots` table needs a unique constraint for the upsert pattern to work. The current schema has an `index` but NOT a `uniqueIndex` on `(keywordId, brandId, providerId, date)`.

**Required migration:**
```sql
ALTER TABLE daily_snapshots
ADD CONSTRAINT uq_daily_snapshots_lookup
UNIQUE (keyword_id, brand_id, provider_id, date);
```

This can be done via Drizzle migration by changing `index(...)` to `uniqueIndex(...)` in the schema definition.

## Environment Variables (New for Phase 2)

```
# Budget caps (USD per day per provider)
DAILY_BUDGET_OPENAI=1.00
DAILY_BUDGET_PERPLEXITY=1.00
DAILY_BUDGET_GEMINI=1.00

# Schedule (optional, defaults to 00:00 UTC)
CHECK_SCHEDULE_CRON=0 0 0 * * *
```

These must be added to `src/lib/env.ts` Zod schema as optional with defaults.

## Open Questions

1. **Position calculation: character-offset vs enumerated-mention order**
   - What we know: CONTEXT.md says "ordinal position of first mention in response"
   - What's unclear: Is position relative to other brands in the same response (brand A is 1st, brand B is 2nd) or the Nth mention of the same brand?
   - Recommendation: Position = ordinal rank among ALL brands detected in the response, sorted by first-appearance character offset. This matches the "1st recommended, 2nd recommended" semantics.

2. **Batch completion detection**
   - What we know: Snapshot triggers after 3 runs complete
   - What's unclear: Best mechanism for detecting "batch complete"
   - Recommendation: After each query-handler completes, count query_runs WHERE batchId=X. When count=3, add snapshot-job. Idempotent -- if snapshot already exists, upsert overwrites.

3. **Worker deployment model**
   - What we know: STATE.md flags "BullMQ worker deployment model should be confirmed before Phase 2"
   - What's unclear: Docker vs separate process vs serverless
   - Recommendation: Continue with existing `npm run worker` pattern (tsx-based process). Deployment details are operational, not blocking for implementation.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest ^4.1.0 |
| Config file | vitest.config.ts |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DATA-02 | Query ChatGPT returns normalized response | unit (mock) | `npx vitest run src/lib/pipeline/__tests__/query-executor.test.ts -t "chatgpt"` | No - Wave 0 |
| DATA-03 | Query Perplexity returns response + citations | unit (mock) | `npx vitest run src/lib/pipeline/__tests__/query-executor.test.ts -t "perplexity"` | No - Wave 0 |
| DATA-04 | Query Gemini returns normalized response | unit (mock) | `npx vitest run src/lib/pipeline/__tests__/query-executor.test.ts -t "gemini"` | No - Wave 0 |
| DATA-05 | 3 runs per batch with correct runNumber | unit | `npx vitest run src/lib/pipeline/__tests__/batch-orchestrator.test.ts` | No - Wave 0 |
| DATA-06 | Cost calculated correctly from tokens | unit | `npx vitest run src/lib/pipeline/__tests__/cost-calculator.test.ts` | No - Wave 0 |
| DATA-07 | Raw response stored in queryRuns | unit | `npx vitest run src/worker/handlers/__tests__/query-handler.test.ts -t "stores raw"` | No - Wave 0 |
| DATA-08 | promptVersion copied from keyword | unit | `npx vitest run src/worker/handlers/__tests__/query-handler.test.ts -t "prompt version"` | No - Wave 0 |
| ANLS-01 | Brand detection with aliases, case-insensitive | unit | `npx vitest run src/lib/pipeline/__tests__/brand-detector.test.ts` | No - Wave 0 |
| ANLS-02 | Visibility score = mention rate calculation | unit | `npx vitest run src/lib/pipeline/__tests__/snapshot-aggregator.test.ts -t "mention rate"` | No - Wave 0 |
| ANLS-03 | Competitor brands analyzed alongside own brand | unit | `npx vitest run src/lib/pipeline/__tests__/brand-detector.test.ts -t "multiple brands"` | No - Wave 0 |
| ANLS-04 | Position tracking (ordinal) | unit | `npx vitest run src/lib/pipeline/__tests__/brand-detector.test.ts -t "position"` | No - Wave 0 |
| ANLS-05 | Sentiment classification returns valid values | unit (mock) | `npx vitest run src/lib/pipeline/__tests__/sentiment-analyzer.test.ts` | No - Wave 0 |
| ANLS-06 | Context snippet extraction 50-100 chars | unit | `npx vitest run src/lib/pipeline/__tests__/brand-detector.test.ts -t "snippet"` | No - Wave 0 |
| AUTO-01 | Scheduler creates repeatable job with cron | unit (mock) | `npx vitest run src/worker/handlers/__tests__/scheduler-setup.test.ts` | No - Wave 0 |
| AUTO-02 | On-demand endpoint adds high-priority jobs | unit | `npx vitest run src/app/api/checks/__tests__/run.test.ts` | No - Wave 0 |
| AUTO-03 | Budget check blocks when exceeded | unit | `npx vitest run src/lib/pipeline/__tests__/budget-checker.test.ts` | No - Wave 0 |
| AUTO-04 | Rate limiting delays applied per provider | unit | `npx vitest run src/lib/pipeline/__tests__/query-executor.test.ts -t "delay"` | No - Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/pipeline/__tests__/query-executor.test.ts` -- covers DATA-02, DATA-03, DATA-04, AUTO-04
- [ ] `src/lib/pipeline/__tests__/brand-detector.test.ts` -- covers ANLS-01, ANLS-03, ANLS-04, ANLS-06
- [ ] `src/lib/pipeline/__tests__/cost-calculator.test.ts` -- covers DATA-06
- [ ] `src/lib/pipeline/__tests__/budget-checker.test.ts` -- covers AUTO-03
- [ ] `src/lib/pipeline/__tests__/sentiment-analyzer.test.ts` -- covers ANLS-05
- [ ] `src/lib/pipeline/__tests__/snapshot-aggregator.test.ts` -- covers ANLS-02
- [ ] `src/worker/handlers/__tests__/query-handler.test.ts` -- covers DATA-07, DATA-08
- [ ] `src/worker/handlers/__tests__/scheduler-setup.test.ts` -- covers AUTO-01
- [ ] `src/app/api/checks/__tests__/run.test.ts` -- covers AUTO-02

## Sources

### Primary (HIGH confidence)
- [AI SDK generateText docs](https://ai-sdk.dev/docs/reference/ai-sdk-core/generate-text) -- usage tokens, return type
- [AI SDK Perplexity provider](https://ai-sdk.dev/providers/ai-sdk-providers/perplexity) -- sources support
- [BullMQ Job Schedulers docs](https://docs.bullmq.io/guide/job-schedulers) -- upsertJobScheduler API
- [BullMQ Rate Limiting docs](https://docs.bullmq.io/guide/rate-limiting) -- limiter config, groupKey removal
- [Drizzle ORM Upsert docs](https://orm.drizzle.team/docs/guides/upsert) -- onConflictDoUpdate pattern

### Secondary (MEDIUM confidence)
- [OpenAI Pricing](https://openai.com/api/pricing/) -- gpt-4o-mini: $0.15/1M input, $0.60/1M output
- [Google Gemini Pricing](https://ai.google.dev/gemini-api/docs/pricing) -- gemini-2.0-flash: $0.10/1M input, $0.40/1M output
- [Perplexity Pricing](https://docs.perplexity.ai/docs/getting-started/pricing) -- sonar: $1.00/1M input, $1.00/1M output
- [BullMQ Repeat Strategies](https://docs.bullmq.io/guide/job-schedulers/repeat-strategies) -- cron pattern format

### Tertiary (LOW confidence)
- None -- all findings verified against official sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all packages already installed and verified in Phase 1
- Architecture: HIGH -- patterns directly follow existing codebase conventions
- Pitfalls: HIGH -- verified against official docs (BullMQ groupKey removal, AI SDK sources format)
- Pricing: MEDIUM -- prices checked via web search, may change; using hardcoded constants with easy updates

**Research date:** 2026-03-22
**Valid until:** 2026-04-07 (pricing may change; core patterns stable)
