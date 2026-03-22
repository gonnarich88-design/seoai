# Deferred Items - Phase 03 Dashboard

## Pre-existing ESLint Errors

**Discovered during:** Plan 01, Task 2 verification
**Impact:** `next build` fails due to ~24 `@typescript-eslint/no-explicit-any` errors across pre-existing files
**Affected files:** Multiple files in `src/lib/pipeline/__tests__/`, `src/worker/handlers/__tests__/`, `src/app/api/checks/__tests__/`, `src/lib/pipeline/query-executor.ts`
**Resolution:** Add eslint-disable comments to affected test files, or configure eslint to allow `any` in test files via override
**Priority:** Medium - blocks production builds but not development
