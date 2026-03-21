---
phase: 2
slug: data-pipeline
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-22
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest ^4.1.0 |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | DATA-02,03,04,AUTO-04 | unit (mock) | `npx vitest run src/lib/pipeline/__tests__/query-executor.test.ts` | ❌ W0 | ⬜ pending |
| 02-01-02 | 01 | 1 | DATA-05,07,08 | unit | `npx vitest run src/worker/handlers/__tests__/query-handler.test.ts` | ❌ W0 | ⬜ pending |
| 02-01-03 | 01 | 1 | DATA-06 | unit | `npx vitest run src/lib/pipeline/__tests__/cost-calculator.test.ts` | ❌ W0 | ⬜ pending |
| 02-02-01 | 02 | 2 | ANLS-01,03,04,06 | unit | `npx vitest run src/lib/pipeline/__tests__/brand-detector.test.ts` | ❌ W0 | ⬜ pending |
| 02-02-02 | 02 | 2 | ANLS-05 | unit (mock) | `npx vitest run src/lib/pipeline/__tests__/sentiment-analyzer.test.ts` | ❌ W0 | ⬜ pending |
| 02-02-03 | 02 | 2 | ANLS-02 | unit | `npx vitest run src/lib/pipeline/__tests__/snapshot-aggregator.test.ts` | ❌ W0 | ⬜ pending |
| 02-03-01 | 03 | 3 | AUTO-01 | unit (mock) | `npx vitest run src/worker/handlers/__tests__/scheduler-setup.test.ts` | ❌ W0 | ⬜ pending |
| 02-03-02 | 03 | 3 | AUTO-02 | unit | `npx vitest run src/app/api/checks/__tests__/run.test.ts` | ❌ W0 | ⬜ pending |
| 02-03-03 | 03 | 3 | AUTO-03 | unit | `npx vitest run src/lib/pipeline/__tests__/budget-checker.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/pipeline/__tests__/query-executor.test.ts` — stubs for DATA-02, DATA-03, DATA-04, AUTO-04
- [ ] `src/lib/pipeline/__tests__/brand-detector.test.ts` — stubs for ANLS-01, ANLS-03, ANLS-04, ANLS-06
- [ ] `src/lib/pipeline/__tests__/cost-calculator.test.ts` — stubs for DATA-06
- [ ] `src/lib/pipeline/__tests__/budget-checker.test.ts` — stubs for AUTO-03
- [ ] `src/lib/pipeline/__tests__/sentiment-analyzer.test.ts` — stubs for ANLS-05
- [ ] `src/lib/pipeline/__tests__/snapshot-aggregator.test.ts` — stubs for ANLS-02
- [ ] `src/worker/handlers/__tests__/query-handler.test.ts` — stubs for DATA-07, DATA-08
- [ ] `src/worker/handlers/__tests__/scheduler-setup.test.ts` — stubs for AUTO-01
- [ ] `src/app/api/checks/__tests__/run.test.ts` — stubs for AUTO-02

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Daily scheduler runs at 00:00 UTC | AUTO-01 | Requires live Redis + time travel | Run `npx vitest run src/worker/handlers/__tests__/scheduler-setup.test.ts`, verify job created in BullMQ dashboard |
| Real AI API responses returned | DATA-02,03,04 | Requires live API keys + network | Set API keys, run `npx tsx src/scripts/test-query.ts`, verify response stored in DB |
| Budget cap pauses after exceeding limit | AUTO-03 | Requires live DB with cost data | Insert cost records exceeding cap, trigger check, verify rejection response |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
