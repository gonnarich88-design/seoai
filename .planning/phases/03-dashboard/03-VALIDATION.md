---
phase: 3
slug: dashboard
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-22
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (existing — `vitest.config.ts` present) |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 3-01-01 | 01 | 0 | INFR | setup | `npx vitest run` | ❌ W0 | ⬜ pending |
| 3-01-02 | 01 | 1 | DASH-01 | unit | `npx vitest run src/app/api/dashboard` | ❌ W0 | ⬜ pending |
| 3-01-03 | 01 | 1 | DASH-02 | unit | `npx vitest run src/app/api/dashboard` | ❌ W0 | ⬜ pending |
| 3-01-04 | 01 | 1 | DASH-03 | unit | `npx vitest run src/app/api/dashboard` | ❌ W0 | ⬜ pending |
| 3-01-05 | 01 | 2 | DASH-04 | unit | `npx vitest run src/app/api/dashboard` | ❌ W0 | ⬜ pending |
| 3-02-01 | 02 | 1 | DASH-01 | visual | manual | N/A | ⬜ pending |
| 3-02-02 | 02 | 1 | DASH-02 | visual | manual | N/A | ⬜ pending |
| 3-02-03 | 02 | 2 | DASH-03 | visual | manual | N/A | ⬜ pending |
| 3-02-04 | 02 | 2 | DASH-04 | visual | manual | N/A | ⬜ pending |
| 3-02-05 | 02 | 3 | DASH-05 | unit+visual | `npx vitest run src/app/api/keywords` | ✅ | ⬜ pending |
| 3-02-06 | 02 | 3 | DASH-06 | unit+visual | `npx vitest run src/app/api/brands` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/app/api/dashboard/__tests__/overview.test.ts` — stubs for DASH-01 overview API
- [ ] `src/app/api/dashboard/__tests__/trends.test.ts` — stubs for DASH-03 trends API
- [ ] `src/app/api/dashboard/__tests__/archive.test.ts` — stubs for DASH-04 archive API

*Existing `/api/keywords` and `/api/brands` test files cover DASH-05 and DASH-06 — no new stubs needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Visibility score cards display correctly in browser | DASH-01 | React Server Component rendering requires browser | Open `/dashboard/overview?keyword=<id>`, verify 3 platform cards show % scores |
| Competitor table shows side-by-side comparison | DASH-02 | Visual layout verification | Open `/dashboard/overview?keyword=<id>`, verify competitor rows in table |
| Recharts LineChart renders trend data | DASH-03 | Canvas/SVG rendering requires browser | Open `/dashboard/trends?keyword=<id>`, verify line chart with date x-axis |
| Brand mention highlighting in archive | DASH-04 | Text highlight rendering requires browser | Open `/dashboard/archive?keyword=<id>`, verify highlighted brand names in response text |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
