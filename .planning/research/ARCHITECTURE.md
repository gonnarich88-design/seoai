# Architecture Patterns

**Domain:** AI SEO / AEO (Answer Engine Optimization) Monitoring System
**Researched:** 2026-03-20

## Recommended Architecture

The system follows a **modular monolith** pattern inside a Next.js application, with a separate worker process for background jobs. This avoids microservice complexity while maintaining clean separation of concerns.

```
                    +---------------------------+
                    |     Next.js Application    |
                    |                           |
                    |  +---------------------+  |
  Browser -------->|  |  Dashboard (React)   |  |
                    |  +---------------------+  |
                    |           |               |
                    |  +---------------------+  |
                    |  |  API Routes (/api)   |  |
                    |  +---------------------+  |
                    |           |               |
                    |  +---------------------+  |
                    |  |  Service Layer       |  |
                    |  |  (Business Logic)    |  |
                    |  +---------------------+  |
                    |       |           |       |
                    +-------|-----------|-------+
                            |           |
              +-------------|-----------|-------------+
              |             |           |             |
    +---------v--+  +-------v---+  +---v----------+  |
    | PostgreSQL |  |   Redis   |  | AI Provider  |  |
    | (Data)     |  |  (Queue)  |  | APIs         |  |
    +------------+  +-----------+  +--------------+  |
                         |                            |
                    +----v---------+                  |
                    | Worker       |                  |
                    | Process      |                  |
                    | (BullMQ)     |                  |
                    +--------------+                  |
```

### High-Level Components

| Component | Technology | Responsibility |
|-----------|-----------|---------------|
| Dashboard | React (Next.js App Router) | Data visualization, user interactions, on-demand triggers |
| API Layer | Next.js Route Handlers | REST endpoints for CRUD, query triggers, data retrieval |
| Service Layer | TypeScript modules | Business logic: query orchestration, analysis, alerting |
| Query Engine | TypeScript + AI SDKs | Send prompts to AI platforms, normalize responses |
| Analysis Engine | TypeScript | Parse AI responses, detect brand mentions, score sentiment |
| Job Queue | BullMQ + Redis | Schedule daily checks, manage retries, rate limiting |
| Worker Process | Separate Node.js process | Execute queued jobs outside the Next.js request cycle |
| Data Store | PostgreSQL (Drizzle ORM) | Persistent storage for all tracking data |
| Alert Service | TypeScript | Detect changes, send notifications (email/webhook) |

---

## Component Boundaries

### 1. Query Engine (`/src/lib/query-engine/`)

The query engine is the core differentiator. It sends structured prompts to multiple AI platforms and collects responses.

**Architecture: Provider Pattern with unified interface.**

```typescript
// Abstract provider interface
interface AIProvider {
  id: string;               // 'chatgpt' | 'perplexity' | 'gemini'
  name: string;
  query(prompt: string, options?: QueryOptions): Promise<AIResponse>;
  isAvailable(): Promise<boolean>;
}

// Unified response format
interface AIResponse {
  providerId: string;
  model: string;
  content: string;          // Raw text response
  citations?: string[];     // URLs cited (Perplexity returns these natively)
  tokensUsed: number;
  latencyMs: number;
  timestamp: Date;
}

// Query orchestrator sends to all providers in parallel
interface QueryOrchestrator {
  queryAll(prompt: string, providers?: string[]): Promise<AIResponse[]>;
  queryWithRetry(prompt: string, provider: string, maxRetries: number): Promise<AIResponse>;
}
```

**Provider implementations:**

| Provider | API | Model | Notes |
|----------|-----|-------|-------|
| ChatGPT | OpenAI Chat Completions | gpt-4o / gpt-4o-mini | Standard OpenAI SDK. No web search in API by default. |
| Perplexity | Perplexity Chat Completions | sonar / sonar-pro | OpenAI-compatible endpoint. Returns citations natively. Best for "what does the web say" queries. |
| Gemini | Google Generative AI | gemini-2.0-flash / gemini-2.5-pro | Google AI SDK. Supports grounding with Google Search. |

**Why Provider Pattern:** Each AI platform has different authentication, rate limits, response formats, and quirks (e.g., Perplexity requires strict alternating message format). A unified interface hides these differences from the rest of the system while allowing provider-specific logic internally.

**Prompt Strategy:**
- Use consistent prompt templates across providers for comparable results
- Include the keyword and ask for recommendations/comparisons in the domain
- Example: "What are the best [keyword] tools/services? Compare top options."
- Run the same prompt multiple times (3x minimum) because AI responses are non-deterministic

### 2. Analysis Engine (`/src/lib/analysis/`)

Parses AI responses to extract structured data about brand mentions.

```typescript
interface MentionAnalysis {
  brand: string;
  mentioned: boolean;
  position: number | null;     // 1st, 2nd, 3rd mentioned (ordinal rank)
  context: string;             // Surrounding text snippet
  sentiment: 'positive' | 'neutral' | 'negative';
  isRecommended: boolean;      // Explicitly recommended?
  competitorsFound: string[];  // Other brands mentioned in same response
}

interface ResponseAnalyzer {
  analyzeMentions(response: AIResponse, brands: string[]): MentionAnalysis[];
  calculateVisibilityScore(mentions: MentionAnalysis[]): number;
  compareWithPrevious(current: MentionAnalysis[], previous: MentionAnalysis[]): ChangeReport;
}
```

**Analysis approach: String matching + simple heuristics, NOT heavy NLP.**

For an internal tool tracking known brand names against AI responses, heavy NLP/ML is overkill. Use:

1. **Case-insensitive string search** for brand name detection
2. **Position tracking** by finding the ordinal occurrence of brand names in the response text
3. **Context extraction** by grabbing surrounding sentences (100 chars before/after)
4. **Sentiment keywords** with a simple positive/negative word list applied to the context window
5. **Recommendation detection** by looking for patterns like "I recommend", "best option", "top choice" near the brand mention

This keeps the system simple, fast, and dependency-free. If accuracy needs improve later, swap in a small LLM call to classify sentiment on extracted context snippets.

### 3. Job Queue & Worker (`/src/lib/jobs/` + `/worker/`)

**BullMQ + Redis** for scheduled and on-demand job processing.

```
Next.js App                     Redis                    Worker Process
    |                             |                          |
    |-- Add job to queue -------->|                          |
    |                             |<-- Poll for jobs --------|
    |                             |--- Deliver job --------->|
    |                             |                          |-- Execute query
    |                             |                          |-- Analyze response
    |                             |                          |-- Write to PostgreSQL
    |                             |<-- Mark complete --------|
    |<-- Read results from DB ----|                          |
```

**Job types:**

| Job | Schedule | Description |
|-----|----------|-------------|
| `daily-check` | Cron: `0 6 * * *` (6 AM daily) | Query all active keywords across all providers |
| `on-demand-check` | User-triggered | Single keyword check triggered from dashboard |
| `weekly-report` | Cron: `0 9 * * 1` (Monday 9 AM) | Generate weekly summary report |
| `alert-check` | After each query completes | Compare results with previous, trigger alerts if changed |

**Why separate worker process:** Next.js API routes and serverless functions have execution time limits and are not designed for long-running background processing. BullMQ workers run as a persistent Node.js process that can handle rate limiting, retries, and concurrent job execution properly.

**Rate limiting strategy:**
- Configure per-provider rate limiters in BullMQ (e.g., max 3 requests/minute for OpenAI)
- Use BullMQ's built-in rate limiter and retry with exponential backoff
- Budget tracking: count tokens/costs per day, pause if daily budget exceeded

### 4. Data Layer (`/src/lib/db/`)

**PostgreSQL with Drizzle ORM.**

#### Core Schema

```
keywords
  ├── id (PK)
  ├── keyword (text, unique)
  ├── category (text, nullable)
  ├── isActive (boolean)
  ├── createdAt (timestamp)
  └── updatedAt (timestamp)

brands
  ├── id (PK)
  ├── name (text)
  ├── aliases (text[])          -- Alternative names/spellings
  ├── isOwn (boolean)           -- Our brand vs competitor
  ├── createdAt (timestamp)
  └── updatedAt (timestamp)

query_runs
  ├── id (PK)
  ├── keywordId (FK → keywords)
  ├── providerId (text)         -- 'chatgpt' | 'perplexity' | 'gemini'
  ├── model (text)              -- Specific model used
  ├── prompt (text)             -- Exact prompt sent
  ├── rawResponse (text)        -- Full AI response
  ├── citations (text[])        -- URLs cited
  ├── tokensUsed (integer)
  ├── costUsd (decimal)
  ├── latencyMs (integer)
  ├── runType (text)            -- 'scheduled' | 'on-demand'
  ├── createdAt (timestamp)
  └── batchId (uuid)            -- Groups runs from same schedule

brand_mentions
  ├── id (PK)
  ├── queryRunId (FK → query_runs)
  ├── brandId (FK → brands)
  ├── mentioned (boolean)
  ├── position (integer, nullable)
  ├── contextSnippet (text)
  ├── sentiment (text)          -- 'positive' | 'neutral' | 'negative'
  ├── isRecommended (boolean)
  ├── visibilityScore (decimal) -- 0-100 composite score
  └── createdAt (timestamp)

alerts
  ├── id (PK)
  ├── keywordId (FK → keywords)
  ├── brandId (FK → brands)
  ├── alertType (text)          -- 'appeared' | 'disappeared' | 'rank_changed' | 'sentiment_changed'
  ├── previousValue (jsonb)
  ├── currentValue (jsonb)
  ├── isRead (boolean)
  ├── createdAt (timestamp)
  └── notifiedAt (timestamp, nullable)

daily_snapshots (materialized/aggregated view)
  ├── id (PK)
  ├── date (date)
  ├── keywordId (FK → keywords)
  ├── brandId (FK → brands)
  ├── providerId (text)
  ├── avgPosition (decimal)
  ├── mentionRate (decimal)     -- % of runs where mentioned
  ├── avgSentiment (decimal)
  ├── avgVisibilityScore (decimal)
  └── runCount (integer)
```

**Key design decisions:**

- **`query_runs` stores raw responses** -- full text preserved for re-analysis if analysis logic improves
- **`brand_mentions` is the analytical table** -- one row per brand per query run, enabling time-series queries
- **`daily_snapshots` aggregates for dashboard performance** -- pre-computed daily averages avoid expensive aggregation queries on every page load
- **`batchId` groups runs** -- a single scheduled check produces multiple query_runs (one per keyword per provider), batchId ties them together
- **`aliases` on brands** -- brands may be referred to differently by AI ("McDonald's" vs "McDonalds" vs "Mickey D's")
- **No partitioning needed initially** -- at daily check frequency, data volume is manageable for years. Add BRIN indexes on `createdAt` columns for time-range queries.

#### Indexing Strategy

```sql
-- Time-range queries (BRIN for time-series pattern)
CREATE INDEX idx_query_runs_created_brin ON query_runs USING BRIN (createdAt);
CREATE INDEX idx_brand_mentions_created_brin ON brand_mentions USING BRIN (createdAt);

-- Lookup patterns
CREATE INDEX idx_query_runs_keyword ON query_runs (keywordId, providerId);
CREATE INDEX idx_brand_mentions_query_run ON brand_mentions (queryRunId);
CREATE INDEX idx_brand_mentions_brand ON brand_mentions (brandId, createdAt DESC);

-- Dashboard aggregation
CREATE INDEX idx_daily_snapshots_lookup ON daily_snapshots (keywordId, brandId, providerId, date DESC);
```

### 5. API Layer (`/src/app/api/`)

Next.js App Router route handlers organized by resource.

```
/api
├── /keywords
│   ├── route.ts               -- GET (list), POST (create)
│   └── /[id]
│       └── route.ts           -- GET, PUT, DELETE
├── /brands
│   ├── route.ts               -- GET (list), POST (create)
│   └── /[id]
│       └── route.ts           -- GET, PUT, DELETE
├── /queries
│   ├── route.ts               -- GET (list with filters)
│   ├── /trigger
│   │   └── route.ts           -- POST (trigger on-demand check)
│   └── /[id]
│       └── route.ts           -- GET (single run detail)
├── /mentions
│   └── route.ts               -- GET (with filters: brand, keyword, date range, provider)
├── /analytics
│   ├── /visibility
│   │   └── route.ts           -- GET (visibility scores over time)
│   ├── /comparison
│   │   └── route.ts           -- GET (brand vs competitor data)
│   └── /trends
│       └── route.ts           -- GET (trend data for charts)
├── /alerts
│   ├── route.ts               -- GET (list), PUT (mark read)
│   └── /settings
│       └── route.ts           -- GET, PUT (alert configuration)
└── /system
    ├── /status
    │   └── route.ts           -- GET (worker health, queue status)
    └── /costs
        └── route.ts           -- GET (API usage and cost tracking)
```

**Pattern: Thin route handlers, thick service layer.** Route handlers validate input and call service functions. Business logic lives in `/src/lib/services/`.

### 6. Dashboard Components (`/src/app/(dashboard)/`)

```
(dashboard)/
├── layout.tsx                  -- Sidebar nav + main content area
├── page.tsx                    -- Overview: key metrics cards + recent alerts
├── /keywords
│   ├── page.tsx               -- Keyword management table
│   └── /[id]
│       └── page.tsx           -- Single keyword detail: mentions across providers over time
├── /brands
│   ├── page.tsx               -- Brand management (own + competitors)
│   └── /[id]
│       └── page.tsx           -- Single brand: visibility across all keywords
├── /comparison
│   └── page.tsx               -- Side-by-side brand comparison charts
├── /trends
│   └── page.tsx               -- Time-series charts: visibility, sentiment, position
├── /alerts
│   └── page.tsx               -- Alert feed with filters
├── /reports
│   └── page.tsx               -- Weekly report view
└── /settings
    └── page.tsx               -- API keys, schedules, budget limits
```

**Chart library: Recharts.** Lightweight, React-native, good for time-series line charts and bar charts. No need for heavier options like D3 for this use case.

**Key dashboard views:**

| View | Chart Type | Data Source |
|------|-----------|-------------|
| Visibility Over Time | Line chart (per provider) | `daily_snapshots` |
| Brand Comparison | Grouped bar chart | `daily_snapshots` filtered by date |
| Mention Position | Heatmap or ranked list | `brand_mentions` aggregated |
| Sentiment Trend | Area chart | `daily_snapshots.avgSentiment` |
| Provider Breakdown | Pie/donut chart | `brand_mentions` grouped by provider |
| Alert Timeline | Event timeline | `alerts` table |

---

## Data Flow

### Scheduled Daily Check Flow

```
1. Cron (BullMQ) triggers 'daily-check' job at 6 AM
2. Worker loads all active keywords from PostgreSQL
3. For each keyword:
   a. Generate prompt from template
   b. For each AI provider (ChatGPT, Perplexity, Gemini):
      i.   Send query via Query Engine (with rate limiting)
      ii.  Receive AIResponse
      iii. Store raw response in query_runs table
      iv.  Run Analysis Engine on response for all tracked brands
      v.   Store brand_mentions rows
   c. Run alert-check: compare today's mentions with yesterday's
   d. If changes detected, create alert records
4. After all keywords processed:
   a. Aggregate daily_snapshots for the day
   b. Send alert notifications (email/webhook) for unread alerts
5. Mark job as complete
```

### On-Demand Check Flow

```
1. User clicks "Check Now" for a keyword in dashboard
2. POST /api/queries/trigger { keywordId, providers? }
3. API route adds job to BullMQ queue with high priority
4. Returns jobId to client
5. Client polls GET /api/queries?jobId=xxx or uses SSE for status
6. Worker processes the job (same as steps 3a-3c above)
7. Dashboard refreshes to show new data
```

### Dashboard Data Flow

```
1. React Server Components fetch data directly from PostgreSQL via service layer
2. Time-series charts use daily_snapshots for fast aggregated data
3. Detail views query brand_mentions with date range filters
4. Alerts badge polls /api/alerts?unread=true every 60 seconds
5. Client components handle interactions (filters, date pickers, trigger checks)
```

---

## Patterns to Follow

### Pattern 1: Provider Adapter with Factory

**What:** Each AI provider gets its own adapter class implementing the shared interface. A factory creates the right adapter based on provider ID.

**When:** Adding a new AI provider (e.g., Claude, Grok) should require only a new adapter file.

```typescript
// /src/lib/query-engine/providers/chatgpt.ts
export class ChatGPTProvider implements AIProvider {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async query(prompt: string): Promise<AIResponse> {
    const completion = await this.client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
    });
    return this.normalize(completion);
  }
}

// /src/lib/query-engine/providers/perplexity.ts
export class PerplexityProvider implements AIProvider {
  private client: OpenAI; // Perplexity uses OpenAI-compatible API

  constructor(apiKey: string) {
    this.client = new OpenAI({
      apiKey,
      baseURL: 'https://api.perplexity.ai',
    });
  }

  async query(prompt: string): Promise<AIResponse> {
    const completion = await this.client.chat.completions.create({
      model: 'sonar',
      messages: [{ role: 'user', content: prompt }],
    });
    return this.normalize(completion);
  }
}

// /src/lib/query-engine/factory.ts
export function createProvider(id: string): AIProvider {
  switch (id) {
    case 'chatgpt': return new ChatGPTProvider(env.OPENAI_API_KEY);
    case 'perplexity': return new PerplexityProvider(env.PERPLEXITY_API_KEY);
    case 'gemini': return new GeminiProvider(env.GEMINI_API_KEY);
    default: throw new Error(`Unknown provider: ${id}`);
  }
}
```

### Pattern 2: Prompt Templates with Variables

**What:** Centralized prompt templates that ensure consistent queries across providers and make prompts easy to iterate on.

**When:** Every time a query is sent to any AI provider.

```typescript
// /src/lib/query-engine/prompts.ts
export const PROMPTS = {
  brandMention: (keyword: string) =>
    `What are the best ${keyword}? Compare the top options, listing specific brand names and explaining why you recommend each one.`,

  productComparison: (keyword: string, category: string) =>
    `I'm looking for ${keyword} in the ${category} space. What are the top recommendations? Please be specific about brand names and products.`,
} as const;
```

### Pattern 3: Idempotent Job Processing

**What:** Jobs can be safely retried without creating duplicate data.

**When:** Worker crashes mid-job, network timeouts, API failures.

```typescript
// Use batchId + keywordId + providerId + date as a composite unique constraint
// Before inserting, check if this combination already exists
// If it does, update instead of insert (upsert pattern)
```

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Querying AI from API Route Handlers

**What:** Calling AI APIs directly from Next.js route handlers in response to user requests.

**Why bad:** AI API calls take 2-30 seconds. This blocks the request, risks timeouts, makes rate limiting hard, and provides no retry mechanism. Vercel/serverless has execution time limits.

**Instead:** Always queue AI queries as BullMQ jobs. API routes only add jobs to the queue and return immediately. The worker process handles execution.

### Anti-Pattern 2: Storing Only Analyzed Results

**What:** Running analysis on AI responses and only storing the extracted mentions, discarding the raw response.

**Why bad:** Analysis logic will improve over time. Without raw responses, you cannot re-analyze historical data. You lose debugging ability and cannot verify analysis accuracy.

**Instead:** Store the full raw response in `query_runs.rawResponse`. Analysis results go in `brand_mentions`. You can always re-process.

### Anti-Pattern 3: Single Query Per Keyword

**What:** Querying each AI only once per keyword per check cycle.

**Why bad:** AI responses are non-deterministic. A brand might be mentioned in one response but not another. Single-query results are unreliable.

**Instead:** Run each query 3 times per provider per check cycle. Store all runs. Use `mentionRate` (% of runs where brand appeared) as the reliability metric. This costs more in API calls but produces meaningful data.

### Anti-Pattern 4: Real-Time Aggregation for Dashboard Charts

**What:** Running `SELECT AVG(...) FROM brand_mentions WHERE ...` on every dashboard page load.

**Why bad:** As data grows, aggregation queries become slow. Multiple users hitting the dashboard simultaneously creates unnecessary DB load.

**Instead:** Pre-compute `daily_snapshots` after each batch completes. Dashboard reads from snapshots. Detail drill-downs can query raw data with proper indexes and pagination.

---

## Scalability Considerations

| Concern | Current Scale (internal team) | At 100+ keywords | At 1000+ keywords |
|---------|-------------------------------|-------------------|--------------------|
| API Costs | ~$5-15/day (3 providers x keywords x 3 runs) | ~$50-150/day, need budget caps | Tiered checking: daily for top, weekly for rest |
| Query Time | Minutes per batch | 30-60 min with rate limits | Parallelize workers, prioritize by importance |
| Storage | < 1 GB/year | ~10 GB/year | Add table partitioning by month on query_runs |
| Dashboard Speed | Instant from snapshots | Still fast from snapshots | Add Redis caching for frequently viewed pages |
| Worker Load | Single worker sufficient | Single worker sufficient | Multiple worker instances if needed |

---

## Suggested Build Order (Dependencies)

The components have clear dependency relationships that dictate build order:

```
Phase 1: Foundation
  ├── PostgreSQL schema + Drizzle ORM setup
  ├── Project scaffolding (Next.js + TypeScript)
  └── Basic data models (keywords, brands)

Phase 2: Query Engine
  ├── Provider interface + factory
  ├── ChatGPT provider (start with one)
  ├── Perplexity provider
  ├── Gemini provider
  └── Prompt templates

Phase 3: Analysis Engine
  ├── Brand mention detection
  ├── Position tracking
  ├── Sentiment scoring (simple)
  └── Visibility score calculation

Phase 4: Job Queue
  ├── Redis + BullMQ setup
  ├── Worker process (separate entry point)
  ├── Daily scheduled job
  ├── On-demand job
  └── Rate limiting + cost tracking

Phase 5: API Layer
  ├── CRUD routes (keywords, brands)
  ├── Query trigger route
  ├── Analytics/trends routes
  └── Alert routes

Phase 6: Dashboard
  ├── Layout + navigation
  ├── Overview page (metrics cards)
  ├── Keyword management
  ├── Brand management
  ├── Visibility trends (charts)
  ├── Brand comparison view
  └── Alert feed

Phase 7: Alerts & Reports
  ├── Change detection logic
  ├── Alert creation + notification
  ├── Weekly report generation
  └── Settings/configuration UI
```

**Rationale:** Each phase depends on the previous one. You cannot build analysis without query results. You cannot build the dashboard without API routes. You cannot build alerts without analysis data to compare. The foundation must come first because everything writes to and reads from the database.

---

## Directory Structure (Full)

```
/src
├── app/
│   ├── (dashboard)/           -- Dashboard pages (see section 6)
│   ├── api/                   -- API routes (see section 5)
│   └── layout.tsx             -- Root layout
├── components/
│   ├── ui/                    -- Shadcn/ui primitives
│   ├── charts/                -- Recharts wrappers
│   │   ├── visibility-chart.tsx
│   │   ├── sentiment-chart.tsx
│   │   ├── comparison-chart.tsx
│   │   └── provider-breakdown.tsx
│   ├── keywords/              -- Keyword management components
│   ├── brands/                -- Brand management components
│   ├── alerts/                -- Alert feed components
│   └── shared/                -- Date pickers, filters, data tables
├── lib/
│   ├── db/
│   │   ├── schema.ts          -- Drizzle schema definitions
│   │   ├── client.ts          -- Database connection
│   │   └── migrations/        -- Drizzle migrations
│   ├── query-engine/
│   │   ├── types.ts           -- AIProvider, AIResponse interfaces
│   │   ├── factory.ts         -- Provider factory
│   │   ├── orchestrator.ts    -- Multi-provider query coordinator
│   │   ├── prompts.ts         -- Prompt templates
│   │   └── providers/
│   │       ├── chatgpt.ts
│   │       ├── perplexity.ts
│   │       └── gemini.ts
│   ├── analysis/
│   │   ├── mention-detector.ts
│   │   ├── sentiment.ts
│   │   ├── visibility-score.ts
│   │   └── change-detector.ts
│   ├── jobs/
│   │   ├── queue.ts           -- BullMQ queue definitions
│   │   ├── daily-check.ts     -- Daily check job handler
│   │   ├── on-demand.ts       -- On-demand check handler
│   │   └── weekly-report.ts   -- Report generation handler
│   ├── services/
│   │   ├── keyword-service.ts
│   │   ├── brand-service.ts
│   │   ├── query-service.ts
│   │   ├── analytics-service.ts
│   │   ├── alert-service.ts
│   │   └── cost-service.ts
│   └── utils/
│       ├── rate-limiter.ts
│       └── budget-tracker.ts
├── worker/
│   └── index.ts               -- BullMQ worker entry point (run separately)
└── types/
    └── index.ts               -- Shared TypeScript types
```

---

## Sources

- [BullMQ Official Documentation](https://bullmq.io/) - Job queue for Node.js
- [Integrating BullMQ with Next.js](https://medium.com/@asanka_l/integrating-bullmq-with-nextjs-typescript-f41cca347ef8) - Integration patterns
- [Running Long Jobs with Queues in Next.js](https://www.nico.fyi/blog/long-running-jobs-nextjs-redis-bull) - Worker process separation
- [Perplexity API Documentation](https://docs.perplexity.ai/api-reference/chat-completions-post) - Chat completions endpoint
- [Multi-Provider Architecture with OpenAI SDK](https://medium.com/@amri369/build-agents-with-openai-sdk-using-any-llm-provider-claude-deepseek-perplexity-gemini-5c80185b3cc2) - Provider pattern
- [Next.js App Router Patterns 2026](https://dev.to/teguh_coding/nextjs-app-router-the-patterns-that-actually-matter-in-2026-146) - Modern architecture patterns
- [Next.js Architecture - Server First](https://www.yogijs.tech/blog/nextjs-project-architecture-app-router) - App Router best practices
- [PostgreSQL Time Series Design](https://aws.amazon.com/blogs/database/designing-high-performance-time-series-data-tables-on-amazon-rds-for-postgresql/) - BRIN indexes, partitioning
- [AEO Complete Guide 2026](https://llmrefs.com/answer-engine-optimization) - AEO monitoring metrics and approach
- [Best AEO Tracking Tools 2026](https://aiclicks.io/blog/best-aeo-tracking-tools) - Existing tool landscape
- [AEO Enterprise Platforms 2026](https://scrunch.com/blog/best-answer-engine-optimization-aeo-generative-engine-optimization-geo-enterprise-platforms-2026) - Enterprise AEO architecture
