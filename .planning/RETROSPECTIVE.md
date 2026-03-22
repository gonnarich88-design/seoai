# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.0 — MVP

**Shipped:** 2026-03-23
**Phases:** 4 | **Plans:** 12 | **Timeline:** 3 days (2026-03-20 → 2026-03-23)

### What Was Built
- Full AEO monitoring pipeline: query 3 AI platforms, detect brand mentions, calculate visibility scores
- Dashboard with overview, competitor comparison, trend charts (Recharts), and response archive
- Alert system: change detection (4 types), email notifications, alert feed UI, weekly report
- CSV export, Keywords/Brands CRUD management, daily scheduler with budget caps
- ~6,200 LOC TypeScript, 99 tests passing (1 pre-existing integration test requires live Redis)

### What Worked
- Wave-based parallel execution — Phase 4 Plans 01+02 built simultaneously, saved time
- TDD approach — tests written first caught integration issues early
- Phase-by-phase structure — each phase delivered usable capability that the next phase could build on
- Pre-existing queue infrastructure from Phase 1+2 made Phase 4 alert pipeline straightforward to wire up

### What Was Inefficient
- ROADMAP.md ไม่ได้ mark Phase 4 complete ทันที (roadmap_complete: false ใน roadmap analyze) — ต้องแก้ manually หลัง execute
- Queue integration test timeout (requires live Redis) ทำให้ test suite report 1 failed ทุก run — ควร skip หรือ mock ใน CI

### Patterns Established
- Summary.md files เก็บ `provides:` section ที่ใช้ cross-reference ระหว่าง phases ได้ดี
- Alert pipeline pattern: snapshot → change-detector → alert-handler → alert-notify-handler (queue chain)
- BullMQ handler per responsibility ทำให้ retry logic ชัดเจน

### Key Lessons
1. API-only approach (ไม่ scrape) ทำงานได้ดีกว่าที่คาด — platform APIs เสถียรและมี SDK พร้อมใช้
2. non-deterministic AI ต้องการ 3 runs ต่อ cycle — visibility score เป็น metric ที่ meaningful กว่า binary mention
3. Internal tool ไม่ต้องการ auth ซับซ้อน — simple cookie auth เพียงพอและ implement เร็ว

### Cost Observations
- Model mix: executor = opus, verifier = sonnet
- 4 phases, 12 plans, parallel Wave 1 execution ใน Phase 4
- Notable: parallel agent spawning ลด wall-clock time สำหรับ independent plans ได้ชัดเจน

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Plans | Timeline | Key Change |
|-----------|--------|-------|----------|------------|
| v1.0 | 4 | 12 | 3 days | First milestone — baseline established |

### Cumulative Quality

| Milestone | Tests | Notes |
|-----------|-------|-------|
| v1.0 | 99 passing | 1 integration test requires live Redis (pre-existing) |
