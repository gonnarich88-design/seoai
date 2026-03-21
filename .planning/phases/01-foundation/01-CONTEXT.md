# Phase 1: Foundation - Context

**Gathered:** 2026-03-21
**Status:** Ready for planning

<domain>
## Phase Boundary

ตั้ง project infrastructure, database schema, และ API พื้นฐาน — Next.js 15 app, PostgreSQL พร้อม Drizzle migrations, Redis + BullMQ, Vercel AI SDK, และ simple auth

การ query AI platforms และ analysis engine อยู่ใน Phase 2 ไม่ใช่ Phase นี้

</domain>

<decisions>
## Implementation Decisions

### Keyword/Prompt Model
- User กรอก **full prompt** โดยตรง เช่น "What are the best SEO tools in 2025?" — ไม่ใช่ keyword เดี่ยว
- แต่ละ prompt มี **label แยกต่างหาก** สำหรับแสดงใน dashboard (เช่น label: "Best SEO tools")
- prompt หนึ่งรายการส่งไป **ทุก platform เสมอ** (ChatGPT + Perplexity + Gemini) ไม่ต้องเลือก
- สามารถ toggle **active/inactive** ได้ — ไม่ลบข้อมูลเดิมเมื่อปิด

### Brand Data Model
- "แบรนด์" = **ชื่อบริษัท/ผลิตภัณฑ์** (ไม่ใช่ domain/URL) — ใช้เพื่อ detect ใน AI response text
- aliases เก็บเป็น **JSON array ใน brands table** (ไม่ใช่ table แยก) เช่น `{name: "Ahrefs", aliases: ["ahrefs", "Ahrefs.com"]}`
- own brand vs competitor แยกกันด้วย **`is_own` flag** ใน brands table เดียวกัน
- ไม่จำกัดจำนวน competitor brands

### Claude's Discretion
- Auth approach: INFR-05 กำหนด "simple auth" — Claude เลือก approach ที่เหมาะสม (แนะนำ middleware-based password หรือ Auth.js credentials สำหรับ internal tool)
- Development environment: Docker Compose vs local services สำหรับ PostgreSQL + Redis
- Database schema details นอกเหนือจากที่ระบุด้านบน

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — INFR-01 ถึง INFR-05, DATA-01 ที่ Phase นี้ต้องทำให้ครบ
- `.planning/PROJECT.md` — Tech stack constraints (Next.js + PostgreSQL, ไม่ใช้ Supabase), API keys ที่ต้องการ

### Roadmap
- `.planning/ROADMAP.md` §Phase 1 — Success criteria 5 ข้อที่ต้องผ่านก่อน Phase 2

No external ADRs or design docs — requirements fully captured above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- ไม่มี existing codebase — เริ่มจาก scratch

### Established Patterns
- ไม่มี prior patterns — Phase นี้เป็นการกำหนด foundation patterns สำหรับ phases ต่อๆ ไป

### Integration Points
- Phase 2 จะใช้ DB schema จาก Phase นี้โดยตรง — schema design สำคัญมาก
- BullMQ worker จาก Phase นี้จะถูก Phase 2 ใช้สำหรับ scheduling AI queries

</code_context>

<specifics>
## Specific Ideas

- DB tables ที่ ROADMAP.md ระบุไว้: `keywords`, `brands`, `query_runs`, `brand_mentions`, `alerts`, `daily_snapshots`
- REQUIREMENTS.md DATA-05: ระบบรัน prompt 3 ครั้งต่อ check cycle — schema ต้องรองรับ multi-run ต่อ keyword ต่อ platform
- REQUIREMENTS.md DATA-08: ต้อง track prompt template versions — schema ต้องมี versioning
- ใช้ Vercel AI SDK (INFR-04) เป็น unified interface สำหรับ AI providers — ไม่ call provider APIs โดยตรง

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-03-21*
