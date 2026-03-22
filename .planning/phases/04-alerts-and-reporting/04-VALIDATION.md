---
phase: 4
slug: alerts-and-reporting
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-23
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npm test -- --run` |
| **Full suite command** | `npm test -- --run --reporter=verbose` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --run`
- **After every plan wave:** Run `npm test -- --run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 4-01-01 | 01 | 1 | ALRT-01 | unit | `npm test -- --run src/lib/alerts` | ❌ W0 | ⬜ pending |
| 4-01-02 | 01 | 1 | ALRT-01 | unit | `npm test -- --run src/lib/alerts` | ❌ W0 | ⬜ pending |
| 4-01-03 | 01 | 2 | ALRT-02 | unit | `npm test -- --run src/lib/email` | ❌ W0 | ⬜ pending |
| 4-02-01 | 02 | 1 | ALRT-03 | integration | `npm test -- --run src/app/api/alerts` | ❌ W0 | ⬜ pending |
| 4-02-02 | 02 | 2 | ALRT-04 | unit | `npm test -- --run src/lib/reports` | ❌ W0 | ⬜ pending |
| 4-02-03 | 02 | 2 | ALRT-05 | integration | `npm test -- --run src/app/api/export` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/alerts/__tests__/detection.test.ts` — stubs for ALRT-01 (change detection logic)
- [ ] `src/lib/email/__tests__/mailer.test.ts` — stubs for ALRT-02 (email sending)
- [ ] `src/app/api/alerts/__tests__/route.test.ts` — stubs for ALRT-03 (alert feed API)
- [ ] `src/lib/reports/__tests__/weekly.test.ts` — stubs for ALRT-04 (weekly summary)
- [ ] `src/app/api/export/__tests__/route.test.ts` — stubs for ALRT-05 (CSV export)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Email received in inbox | ALRT-02 | Requires real SMTP or Ethereal check | Trigger alert, check Ethereal inbox at web URL |
| Alert feed read/unread state | ALRT-03 | Visual UI behavior | Open dashboard, check alert indicators update on click |
| Weekly report email format | ALRT-04 | Email rendering varies by client | Trigger weekly job manually, inspect Ethereal email |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
