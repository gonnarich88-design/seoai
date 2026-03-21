# Phase 2: Data Pipeline - Context

**Gathered:** 2026-03-22
**Status:** Ready for planning

<domain>
## Phase Boundary

ระบบ query AI ทั้ง 3 platforms (ChatGPT, Perplexity, Gemini), วิเคราะห์ brand mentions ใน responses, และ run checks อัตโนมัติรายวันพร้อม cost controls

Phase นี้ไม่รวม Dashboard (Phase 3) และ Alerts/Reporting (Phase 4)

</domain>

<decisions>
## Implementation Decisions

### Brand Mention Detection
- ใช้ **string matching + case-insensitive** — ค้นหา brand name และ aliases ใน response text โดยตรง
- Case-insensitive: 'Ahrefs', 'ahrefs', 'AHREFS' นับเป็น match เดียวกัน
- Aliases จาก `brands.aliases` jsonb array ใช้ทั้งหมด
- **Position** = ลำดับที่ brand ถูก mention ใน response (1st mention = position 1, 2nd = position 2, ฯลฯ)
- **Context snippet** = extract 50-100 chars รอบตำแหน่งที่ brand ถูก mention สำหรับ display ใน dashboard
- ถ้า brand ไม่ถูก mention → `mentioned: false`, position/snippet เป็น null

### Sentiment Analysis
- ใช้ **LLM-based classification** ด้วย **gpt-4o-mini** — ส่ง context snippet ไปถามว่า positive/neutral/negative
- แยกเป็น **separate analysis job** ใน BullMQ — ไม่ block query job, retry ได้อิสระ
- Sentiment วิเคราะห์เฉพาะ rows ที่ `mentioned: true` เท่านั้น

### Scheduler & Budget
- ใช้ **BullMQ Job Scheduler** (built-in) สำหรับ daily schedule — ไม่ต้องเพิ่ม dependency
- Schedule time: **00:00 UTC ทุกวัน** (configurable ผ่าน env var ได้)
- **Budget cap: per-platform per-day** — OpenAI, Perplexity, Gemini แยกกัน (ตั้งใน env)
- เมื่อ platform ใดเกิน cap → **หยุด platform นั้นทั้งวัน** (skip ทุก keyword ที่ยังไม่ได้รัน) → reset วันใหม่
- **Rate limiting**: BullMQ limiter ตั้ง delay ระหว่าง jobs ต่อ provider (ไม่ต้อง token bucket)

### On-demand Check
- Endpoint: **POST /api/checks/run** รับ `{ keywordId: string }`
- On-demand jobs มี **priority สูงกว่า** scheduled jobs ใน BullMQ queue
- ยังเช็ค budget cap เหมือนกัน — ถ้าเกิน cap แจ้ง error กลับ user แทน

### Daily Snapshot Aggregation
- สร้าง snapshot **หลังครบ 3 runs** ของ batch นั้น — ไม่รอ end-of-day
- คำนวณ: `mention_rate` = mentions / 3 runs, `avg_position` จาก runs ที่ mention, `run_count = 3`
- เขียนลง `daily_snapshots` table (upsert by date + keyword + brand + provider)

### Error Handling & Retry
- **3 attempts + exponential backoff** ต่อ job (ตาม pattern ที่ Phase 1 ตั้งใน addTestJob)
- ถ้า job fail ทั้ง 3 attempts → บันทึก error ใน BullMQ failed queue, ไม่ block jobs อื่น
- Partial batch failure (บาง provider ล้ม): runs ที่สำเร็จยังคง store ตามปกติ

### Cost Tracking
- คำนวณ cost จาก **token usage จริง** — AI SDK คืน `usage.promptTokens + usage.completionTokens`
- ใช้ price table per model (hardcoded constants ใน codebase) → คำนวณ `costUsd` per query run
- Budget cap เช็คจาก `SUM(costUsd)` ของวันนั้น per provider จาก `query_runs` table

### Claude's Discretion
- Job type naming และ queue structure (แนะนำ: `query-job`, `analysis-job`, `snapshot-job`)
- Price constants per model (อ้างอิงจาก OpenAI/Google/Perplexity pricing pages)
- Exact delay values สำหรับ rate limiting per provider
- Error notification strategy (log vs alert)
- API response normalization format ระหว่าง providers

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — DATA-02 ถึง DATA-08, ANLS-01 ถึง ANLS-06, AUTO-01 ถึง AUTO-04 ที่ Phase นี้ต้องทำให้ครบ
- `.planning/PROJECT.md` — Cost constraints, API keys ที่ต้องการ, tech stack

### Roadmap
- `.planning/ROADMAP.md` §Phase 2 — Success criteria 5 ข้อที่ต้องผ่านก่อน Phase 3

### Prior Phase
- `.planning/phases/01-foundation/01-CONTEXT.md` — Keyword/Prompt model decisions, Brand data model decisions
- `src/lib/db/schema.ts` — 6 tables ที่ Phase 2 จะ read/write (queryRuns, brandMentions, dailySnapshots)
- `src/lib/ai/providers.ts` — Provider instances + MODELS constant ที่ Phase 2 จะใช้
- `src/lib/queue/queues.ts` — Queue `seoai-jobs` ที่ Phase 2 จะเพิ่ม job types ใหม่
- `src/worker/index.ts` — Worker scaffold ที่ Phase 2 จะ implement job handlers

No external ADRs or design docs — requirements fully captured above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/ai/providers.ts` — `openai`, `google`, `perplexity` instances + `MODELS` constant + `ProviderId` type พร้อมใช้
- `src/lib/queue/queues.ts` — `seoaiQueue` queue พร้อม retry config (attempts=3, exponential backoff)
- `src/worker/index.ts` — Worker scaffold ที่ใช้ switch-case บน job.name — Phase 2 เพิ่ม cases ใหม่ได้เลย
- `src/lib/db/schema.ts` — Schema ครบ: queryRuns (batchId, runNumber, rawResponse, costUsd, citations), brandMentions (mentioned, position, contextSnippet, sentiment), dailySnapshots (mentionRate, avgPosition)
- `src/lib/db/client.ts` — DB singleton พร้อมใช้
- `src/lib/env.ts` — Zod env validation, Phase 2 ต้องเพิ่ม DAILY_BUDGET_OPENAI, DAILY_BUDGET_PERPLEXITY, DAILY_BUDGET_GEMINI

### Established Patterns
- Job retry config: `{ attempts: 3, backoff: { type: 'exponential', delay: 1000 } }` (จาก addTestJob)
- DB singleton ด้วย global variable pattern (hot-reload safe)
- API routes ใช้ Zod validation + Drizzle ORM

### Integration Points
- Phase 2 เพิ่ม job types ใน `src/worker/index.ts` switch-case
- Phase 2 เพิ่ม API endpoint `src/app/api/checks/run/route.ts`
- Phase 2 เพิ่ม BullMQ Job Scheduler ใน worker startup (หรือ separate scheduler process)
- Budget cap logic ต้อง query `query_runs` table สำหรับ `SUM(costUsd)` ของวันนั้น

</code_context>

<specifics>
## Specific Ideas

- AI SDK `generateText()` คืน `usage.promptTokens` + `usage.completionTokens` — ใช้คำนวณ costUsd ได้ทันที
- Perplexity API คืน citations array — เก็บใน `queryRuns.citations` jsonb (schema รองรับแล้ว)
- ใช้ `batchId` (UUID) เพื่อ group 3 runs ของ keyword+platform เดียวกัน — trigger snapshot aggregation เมื่อ batch ครบ
- BullMQ priority: manual runs ใช้ `priority: 1`, scheduled runs ใช้ `priority: 10` (ยิ่งน้อยยิ่งสูง)

</specifics>

<deferred>
## Deferred Ideas

- LLM-based brand mention extraction (ADV-01 ใน v2 requirements) — Phase 2 ใช้ string matching ก่อน, upgrade ใน v2
- Citation/source URL tracking (ADV-02) — deferred to v2
- "Run all active keywords" on-demand trigger — Phase 2 support specific keyword เท่านั้น, all-run สามารถ loop จาก client ได้

</deferred>

---

*Phase: 02-data-pipeline*
*Context gathered: 2026-03-22*
