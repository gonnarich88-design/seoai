# Phase 3: Dashboard - Context

**Gathered:** 2026-03-22
**Status:** Ready for planning

<domain>
## Phase Boundary

สร้าง web dashboard UI สำหรับ internal team ดูข้อมูล AI visibility — overview metrics, competitor comparison, trend charts, response archive, และจัดการ keywords/brands ทั้งหมดผ่าน UI

Phase นี้ไม่รวม Alerts/Email notifications (Phase 4)

</domain>

<decisions>
## Implementation Decisions

### Layout Structure
- **Sidebar + content area** — sidebar ซ้าย, content area ขวา
- Sidebar มี 2 กลุ่ม:
  - Data views: Overview, Competitors, Trends, Archive
  - Management: Keywords, Brands
- **Global keyword selector** (dropdown) อยู่ด้านบน sidebar — เหมือน project switcher ใน Linear/Vercel
  - เลือก keyword แล้ว content ทุกหน้า (Overview, Competitors, Trends, Archive) เปลี่ยนตาม keyword ที่เลือก
  - หน้า Keywords และ Brands (management) ไม่ขึ้นกับ keyword selector

### Overview Page
- **Visibility score cards** เป็น primary content — แสดง score ปัจจุบันต่อ platform (ChatGPT / Perplexity / Gemini) แต่ละ card แสดง % visibility และ last-check timestamp
- ด้านล่าง cards: competitor comparison table + mini trend chart
- เน้นดูสถานะปัจจุบันได้ทันทีเมื่อเปิดหน้า

### Trend Charts
- **Trends เป็น page แยก** — เข้าผ่าน sidebar "Trends"
- ใช้ **Recharts** library — lightweight, React-native, SVG, เหมาะ internal tool
- แสดง line chart visibility score ตามเวลา per platform สำหรับ keyword ที่เลือก

### Claude's Discretion
- Response archive UX (DASH-04): filter/search design, brand mention highlight approach, pagination vs infinite scroll
- Management forms (DASH-05, DASH-06): modal vs inline edit vs dedicated sub-page
- Color scheme และ exact styling
- Empty states และ loading states
- Mobile responsiveness (internal tool — desktop first เพียงพอ)
- Competitor comparison table layout ใน detail

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — DASH-01 ถึง DASH-06 ที่ Phase นี้ต้องทำให้ครบ
- `.planning/PROJECT.md` — Tech stack (Next.js 15, Tailwind), internal tool constraints

### Roadmap
- `.planning/ROADMAP.md` §Phase 3 — Success criteria 5 ข้อที่ต้องผ่านก่อน Phase 4

### Prior Phases
- `.planning/phases/01-foundation/01-CONTEXT.md` — Keyword/Prompt model, Brand data model (label vs prompt, is_own flag, aliases)
- `.planning/phases/02-data-pipeline/02-CONTEXT.md` — visibility score calculation (mention_rate), daily_snapshots schema, sentiment values
- `src/lib/db/schema.ts` — keywords, brands, queryRuns, brandMentions, dailySnapshots tables
- `src/app/api/keywords/route.ts` — Keywords CRUD API (Phase 3 จะ call จาก UI)
- `src/app/api/brands/route.ts` — Brands CRUD API
- `src/app/api/checks/run/route.ts` — On-demand check API

No external ADRs or design docs — requirements fully captured above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/app/login/page.tsx` — Login UI ใช้ Tailwind CSS อย่างเดียว (ไม่มี component library) — pattern ที่ต้องตามใน dashboard
- `src/app/globals.css` — Global CSS, dark mode support ด้วย CSS variables
- `src/lib/db/schema.ts` — `dailySnapshots` table มี `mentionRate`, `avgPosition`, `runCount` — เป็น data source หลักสำหรับ charts และ overview cards
- `src/lib/db/schema.ts` — `brandMentions` table มี `contextSnippet`, `sentiment`, `position`, `mentioned` — ใช้สำหรับ response archive

### Established Patterns
- **Tailwind CSS only** — ไม่มี component library ใน codebase ปัจจุบัน
- **Next.js App Router** — API routes ใช้ Route Handlers, pages ใช้ Server/Client Components
- **Simple password auth** — middleware ป้องกัน routes ที่ไม่ใช่ `/login` (ดู `src/middleware.ts`)
- **Zod validation** ใน API routes, Drizzle ORM สำหรับ DB queries

### Integration Points
- Phase 3 สร้าง `src/app/dashboard/` directory ใหม่ (หรือแก้ `src/app/page.tsx` เป็น redirect ไป `/dashboard`)
- Dashboard pages fetch data จาก API routes ที่มีอยู่แล้ว + อาจเพิ่ม API routes ใหม่สำหรับ dashboard data
- `dailySnapshots` เป็น read-heavy table — dashboard queries ส่วนใหญ่จะ join keywords + dailySnapshots + brands
- Global keyword selector state อาจใช้ URL params (`?keyword=xxx`) เพื่อ shareable และ server-renderable

</code_context>

<specifics>
## Specific Ideas

- Sidebar keyword selector เหมือน project switcher ใน Linear หรือ Vercel — เปลี่ยน keyword แล้ว context ทั้งหน้าเปลี่ยน
- Overview cards แสดง score แบบ "67%" พร้อม last-check timestamp ชัดเจน

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-dashboard*
*Context gathered: 2026-03-22*
