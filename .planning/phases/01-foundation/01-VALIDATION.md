---
phase: 1
slug: foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-21
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.x |
| **Config file** | `vitest.config.ts` — Wave 0 installs |
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
| 1-01-xx | 01 | 0 | INFR-01 | smoke | `npx next build` | N/A | ⬜ pending |
| 1-02-xx | 02 | 0 | INFR-02 | integration | `npx vitest run src/lib/db/__tests__/schema.test.ts -x` | ❌ W0 | ⬜ pending |
| 1-02-xx | 02 | 1 | INFR-03 | integration | `npx vitest run src/lib/queue/__tests__/queue.test.ts -x` | ❌ W0 | ⬜ pending |
| 1-03-xx | 03 | 1 | INFR-04 | unit | `npx vitest run src/lib/ai/__tests__/providers.test.ts -x` | ❌ W0 | ⬜ pending |
| 1-03-xx | 03 | 1 | INFR-05 | integration | `npx vitest run src/__tests__/auth.test.ts -x` | ❌ W0 | ⬜ pending |
| 1-03-xx | 03 | 2 | DATA-01 | integration | `npx vitest run src/app/api/keywords/__tests__/keywords.test.ts -x` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `vitest.config.ts` — Vitest config with path aliases matching tsconfig
- [ ] `src/lib/db/__tests__/schema.test.ts` — Verify all 6 tables exist via Drizzle introspection
- [ ] `src/lib/queue/__tests__/queue.test.ts` — Enqueue test job, verify worker processes it
- [ ] `src/lib/ai/__tests__/providers.test.ts` — Verify provider instantiation (mock API keys)
- [ ] `src/__tests__/auth.test.ts` — Verify middleware redirects unauthenticated requests
- [ ] `src/app/api/keywords/__tests__/keywords.test.ts` — Full CRUD test against test DB

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Next.js dev server runs on localhost:3000 | INFR-01 | Runtime environment check | Run `npm run dev`, verify browser loads without error |
| PostgreSQL migrations apply cleanly | INFR-02 | Requires live database | Run `npx drizzle-kit push`, verify no errors |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
