# Project Quality Review

Date: 2026-02-25  
Scope: `diary-vue` codebase (`Nuxt 4 + Vue 3 + Prisma + Vitest`)

## Executive Summary

- Overall quality: **Medium-Low** (feature-rich but stability/consistency issues exist)
- Biggest risks:
  - Test suite drift from implementation (trustworthiness issue)
  - Lint/typecheck gates are not reliably operational
  - Composable lifecycle/listener issues

## Fix Status (Updated 2026-02-25)

### Completed

- Duplicate API routes removed:
  - Deleted `server/api/diaries/index.post.ts`
  - Deleted `server/api/alerts.get.ts`
- Canonical `POST /api/diaries` merged into `server/api/diaries.post.ts` with `appendToToday` support.
- 4xx preservation fixed in catch blocks:
  - `server/api/alerts/[id]/dismiss.put.ts`
  - `server/api/blog/[id].put.ts`
  - `server/api/diaries.post.ts`

## Findings (Ordered by Severity)

### 1) MEDIUM: `useMobileDetection` lifecycle and initialization issues

File:
- `composables/useMobileDetection.ts`

Problems:
- `init()` is called in `onMounted` and also immediately on client (`if (typeof window !== 'undefined')`), causing duplicate listener registration risk.
- Global singleton (`getMobileDetection`) calls composable outside component setup context, leading to lifecycle warnings and hard-to-reason behavior.

Impact:
- Memory leaks / duplicated events
- Test noise and unstable runtime behavior

Recommendation:
- Initialize only once in a controlled lifecycle path.
- Avoid singleton patterns that invoke lifecycle APIs outside setup context.

### 2) MEDIUM: `useGestures` unbinding may target wrong element on ref changes

File:
- `composables/useGestures.ts`

Problem:
- Watcher receives `oldElement`, but `unbindEvents()` reads `element.value` (current ref) instead of unbinding `oldElement`.

Impact:
- Event listeners can remain on detached elements (leak, unexpected callbacks).

Recommendation:
- Refactor unbind to accept a target element parameter and use `oldElement` during watcher updates.

### 3) MEDIUM: Lint/typecheck quality gates are not reliable

Observations:
- `npm run lint` fails because no `eslint.config.(js|mjs|cjs)` exists.
- `npm run typecheck` failed in this environment due to unresolved `vue-tsc` fetch/network dependency.

Impact:
- CI/local quality gates are not dependable.
- Regressions can merge undetected.

Recommendation:
- Add and commit a working ESLint flat config.
- Ensure typecheck dependencies are pinned and installable in CI.

### 4) MEDIUM: Test suite has contract drift and low signal quality

Test run result:
- **18 files** total: **6 failed**, 12 passed  
- **260 tests** total: **34 failed**, 226 passed

Key examples:
- `tests/api/blog.test.ts` references `mockGetRouterParam` without importing/defining it in that file.
- `tests/integration/auth-flow.test.ts` mocks old JWT API (`signToken`) while implementation uses `signAccessToken` / `signRefreshToken`.
- Several integration tests assume outdated response shapes (`ok/data`) not matching current handlers.

Impact:
- Red tests do not cleanly map to production defects.
- Team confidence in test outcomes is reduced.

Recommendation:
- Align tests with current API contracts and auth utility interfaces.
- Separate true unit tests from DB/integration tests.

### 5) MEDIUM: API integration tests depend on external DB availability

File:
- `tests/setup.ts`

Problem:
- Direct dependence on `DATABASE_URL` can fail hard when DB is unreachable.

Impact:
- Flaky local runs and CI instability.

Recommendation:
- Use isolated test DB strategy with explicit `.env.test`.
- Make integration tests opt-in or containerized in CI.

## Positive Signals

- Project structure is generally clean and modular.
- Feature coverage is broad (auth, diaries, alerts, blog, admin, tooling pages).
- There is an existing test foundation across unit/composable/api/integration layers.

## Priority Action Plan

1. Fix composable lifecycle/listener patterns (`useMobileDetection`, `useGestures`).
2. Restore enforceable quality gates (ESLint config + stable typecheck path).
3. Rebaseline integration tests against current contracts and auth stack.
4. Isolate DB-dependent tests with `.env.test` and reproducible local/CI database setup.

## Review Notes

- This review used static inspection and local command outputs.
- Typecheck execution was blocked by environment dependency/network resolution; results above reflect observed runtime constraints.
