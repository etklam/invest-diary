     Context: Comprehensive tech debt assessment covering code quality, test coverage, and known issues.

     ---
     Problem Statement

     The project has accumulated technical debt across multiple dimensions:
     - Type Safety: 40+ instances of any type usage in production code (143 total including tests and type declarations)
     - Code Structure: 11 files exceeding 500 lines (mixing concerns)
     - Test Coverage: 83.91% on covered files (lib/, server/api/*, server/middleware/*, server/utils/*, server/websocket/*)
Note: Composables, components, and pages may have significantly lower coverage
     - Legacy Code: Deprecated auth functions, compatibility shims
     - Inconsistency: Mixed error handling patterns, hardcoded values

     ---
     High Priority Fixes (Week 1)

     1. Remove Deprecated Auth Token Function

     File: server/utils/auth.ts:60-61
     - Remove @deprecated setAuthTokenCookie function
     - Verify no remaining references exist
     - Update tests if needed

     2. Fix Critical any Types in Error Handling

     Files:
     - pages/alerts/index.vue:98,114
     - pages/tools/etf.vue:7,48,58,109,188
     - pages/tools/relative-value.vue:249,281,306
     - plugins/error-handler.ts:10

     Action: Create proper error type interfaces to replace any

     3. Fix Missing ref Import Pattern

     Multiple components have incomplete Vue imports (found during health check).

     ---
     Medium Priority (Week 2-3)

     4. Split Large Vue Files (>500 lines)

     Target files:

     ┌───────────────────────────────────┬───────┬─────────────────────────────────────────┐
     │               File                │ Lines │                 Action                  │
     ├───────────────────────────────────┼───────┼─────────────────────────────────────────┤
     │ pages/tools/financial-freedom.vue │ 929   │ Extract calculation logic to composable │
     ├───────────────────────────────────┼───────┼─────────────────────────────────────────┤
     │ pages/tools/position-sizing.vue   │ 883   │ Extract strategy logic                  │
     ├───────────────────────────────────┼───────┼─────────────────────────────────────────┤
     │ pages/tools/relative-value.vue    │ 873   │ Extract calculation logic               │
     ├───────────────────────────────────┼───────┼─────────────────────────────────────────┤
     │ pages/index.vue                   │ 816   │ Extract hero sections                   │
     ├───────────────────────────────────┼───────┼─────────────────────────────────────────┤
     │ pages/tools/etf.vue               │ 704   │ Extract chart/data fetching             │
     ├───────────────────────────────────┼───────┼─────────────────────────────────────────┤
     │ pages/articles/index.vue          │ 668   │ Extract filtering logic                 │
     ├───────────────────────────────────┼───────┼─────────────────────────────────────────┤
     │ pages/articles/[slug].vue         │ 668   │ Extract content rendering               │
     └───────────────────────────────────┴───────┴─────────────────────────────────────────┘

     5. Replace any with Proper Types

     Files:
     - composables/useSpeechRecognition.ts:10,13
     - lib/etf-profile/aggregator.ts:23
     - server/api/diaries.post.ts:87,93
     - server/api/diaries/[id].put.ts:80

     Action: Create/shared types in types/ directory

     6. Implement Consistent Error Handling

     Create: composables/useAsyncError.ts for standard error handling pattern
     Replace: Inconsistent try-catch patterns across admin pages

     7. Extract Magic Numbers to Constants

     Create: lib/constants.ts for:
     - Poll intervals (60000, 300000)
     - Month boundaries (0, 11)
     - UI timeouts (300ms)
     - Form step values

     ---
     Low Priority (Week 4+)

     8. Remove Legacy Template Localization

     File: lib/quicknote/template-localization.ts
     - Remove 50+ lines of legacy compatibility arrays
     - Verify i18n system covers all cases

     9. Replace Console Logging with Proper Logger

     Files: composables/useAlerts.ts, composables/useAppPWA.ts
     - Implement log levels (debug, info, warn, error)
     - Use structured logging

     10. Remove IE Compatibility Code

     File: composables/useMobileDetection.ts:56
     - Remove msMaxTouchPoints if IE no longer supported

     ---
     Test Coverage Improvements (Parallel Track)

     Phase 1: Critical Missing Tests

     1. useAuth.ts - Authentication logic (230 lines)
     2. useAlerts.ts - Alert system (264 lines)
     3. useCalendar.ts - Calendar functionality
     4. Auth pages - login.vue, register.vue
     5. BlogEditor.vue - Complex editing (300 lines)

     Phase 2: Component Coverage

     Target: 60% component coverage (22% → 60%)
     - FloatingActionButton.vue (437 lines)
     - Navigation components
     - Diary editor components
     - Discipline components

     Phase 3: Integration Tests

     - Complete user workflows (register → login → create diary)
     - WebSocket connection handling
     - Token refresh scenarios
     - PWA installation flow

     ---
     Verification Steps

     After each fix:
     1. Run npm run typecheck - Ensure no new TS errors
     2. Run npm test - Verify existing tests pass
     3. Run npm run health:quick - Full health validation
     4. Manual smoke test of affected features

     ---
     Files to Modify

     Critical Files

     - server/utils/auth.ts - Remove deprecated function
     - plugins/error-handler.ts - Fix error typing
     - types/errors.ts - Create proper error types (new)

     Large Files to Refactor

     - pages/tools/*.vue - 4 files >700 lines
     - pages/articles/*.vue - 2 files >600 lines
     - pages/index.vue - 816 lines

     New Files to Create

     - lib/constants.ts - Centralized constants
     - types/api-responses.ts - API response types
     - composables/useAsyncError.ts - Standard error handling
     - tests/composables/useAuth.test.ts - Auth tests (new)
     - tests/composables/useAlerts.test.ts - Alert tests (new)

     ---
     Success Metrics

     ┌──────────────────┬─────────────┬─────────────────────┐
     │      Metric      │   Current   │       Target        │
     ├──────────────────┼─────────────┼─────────────────────┤
     │ any type count   │ 40+         │ <10                 │
     ├──────────────────┼─────────────┼─────────────────────┤
     │ Files >500 lines │ 11          │ <3                  │
     ├──────────────────┼─────────────┼─────────────────────┤
     │ Test coverage    │ ~84% (covered) │ >85% (overall)    │
     ├──────────────────┼─────────────┼─────────────────────┤
     │ @ts-ignore       │ 5           │ 2 (legitimate only) │
     ├──────────────────┼─────────────┼─────────────────────┤
     │ Deprecated code  │ 2 functions │ 0                   │
     └──────────────────┴─────────────┴─────────────────────┘

     ---
     Implementation Order

     1. Day 1-2: Remove deprecated auth function, fix critical any types
     2. Day 3-5: Split 2-3 largest files, create constants
     3. Day 6-8: Implement useAsyncError pattern, replace console logs
     4. Day 9-10: Add tests for useAuth, useAlerts, useCalendar
     5. Ongoing: Continue refactoring large files and adding tests

     ---
     2026-04-04 Security and Maintainability Review Addendum

     Context

     Additional review focused on maintainability and security posture of the current alpha codebase.

     Top Findings

     1. Missing Rate Limiting on Auth-Sensitive Endpoints

     Severity: High

     Files:
     - server/api/auth/login.post.ts
     - server/api/auth/register.post.ts
     - server/api/user/password.put.ts
     - lib/rate-limiter.ts

     Problem:
     - Login, registration, and password change flows do not use any rate limiting or account/IP throttling.
     - Existing rate limiter is only applied to market-data style endpoints.

     Risk:
     - Credential stuffing and brute-force attacks are unnecessarily easy.
     - Password change endpoint can be abused for repeated guessing when a session is already compromised.

     Action:
     - Add dedicated auth rate limiter helpers in lib/rate-limiter.ts.
     - Enforce per-IP and per-identity throttling on login/register/password endpoints.
     - Return consistent 429 responses and log throttling events through the shared logger.

     2. Overly Broad Runtime Env and CORS Configuration

     Severity: High

     Files:
     - nuxt.config.ts
     - server/plugins/websocket.ts

     Problem:
     - Nitro is configured with experimental.vars = true and envPrefix = ''.
     - /api/** route rules globally enable CORS.
     - WebSocket origin falls back to '*' when NUXT_PUBLIC_SITE_URL is not defined.

     Risk:
     - Future sensitive endpoints can be exposed under overly permissive defaults.
     - Environment variable handling is too loose and increases accidental secret exposure risk.
     - Deployment mistakes can silently degrade origin restrictions.

     Action:
     - Remove envPrefix = '' unless there is a proven hard requirement.
     - Limit runtime env access to explicit runtimeConfig keys.
     - Replace blanket /api/** CORS with route-specific allowlists.
     - Fail closed for WebSocket origin when site URL is missing in production.

     3. Inconsistent Logging and Error Handling Across Server and Client

     Severity: Medium

     Files:
     - lib/logger.ts
     - composables/useAuth.ts
     - server/api/auth/register.post.ts
     - server/api/user/password.put.ts
     - server/api/blog/index.post.ts
     - server/api/blog/[id].put.ts
     - server/api/blog/admin/[id].get.ts
     - server/api/blog/[id].delete.ts

     Problem:
     - The project has a shared structured logger, but many endpoints still use raw console.log / console.error.
     - Client auth flow logs detailed state transitions and user-identifying data to browser console.
     - Error handling style varies between custom AppError usage and ad hoc createError responses.

     Risk:
     - Harder production troubleshooting and noisier observability.
     - Browser console can leak auth-related operational details during support/debug sessions.
     - Future maintenance cost increases because behavior is not standardized.

     Action:
     - Standardize server logging on lib/logger.ts.
     - Remove or gate noisy client-side auth logs behind development-only guards.
     - Define one server error-handling pattern for authenticated CRUD endpoints.
     - Normalize imports to use ~/ aliases consistently.

     4. Quality Gates Are Not Clean Enough to Trust as a Safety Net

     Severity: Medium

     Files:
     - lib/yahoo-finance.ts
     - pages/admin/blog/new.vue
     - pages/admin/blog/[id]/edit.vue
     - components/FloatingActionButton.vue
     - Multiple additional files reported by eslint

     Problem:
     - npm run typecheck currently fails.
     - npm run lint passes with a large warning count.

     Current Verification Snapshot:
     - typecheck: failing at lib/yahoo-finance.ts line 35
     - lint: 56 warnings, 0 errors

     Risk:
     - CI signals become easy to ignore.
     - Refactors become slower and riskier because the baseline is already noisy.

     Action:
     - Fix the current type error immediately and make typecheck mandatory before merge.
     - Burn down eslint warnings in batches, starting with auth/admin/blog related files.
     - Raise the bar gradually until warnings are near-zero on touched files.

     5. Local Secret Hygiene Needs Explicit Operational Discipline

     Severity: Medium

     Files:
     - .env
     - .gitignore
     - .dockerignore

     Problem:
     - .env contains live-looking DATABASE_URL and JWT_SECRET values.
     - The file is currently ignored by git and excluded by .dockerignore, which is good, but the local secret hygiene still relies on developer discipline.

     Risk:
     - Secrets can still leak through manual sharing, screenshots, copied archives, or ad hoc deployment packaging.

     Action:
     - Rotate any real secrets that have been used in local/shared environments.
     - Keep .env.example as the only template under version control.
     - Prefer per-environment secret injection in deployment instead of local file propagation.

     Recommended Execution Order

     1. Add auth rate limiting and tighten CORS/runtime env policy.
     2. Fix typecheck failure and stop adding new lint noise.
     3. Standardize logger and error handling on auth/admin/blog APIs.
     4. Review WebSocket origin policy and production deployment requirements.
     5. Rotate and re-audit local/deployment secrets.

     Validation Run on 2026-04-04

     Commands run:
     - npx vitest run tests/api/auth.test.ts tests/api/user-password.test.ts tests/unit/server/auth.middleware.test.ts tests/unit/server/auth.cookies.test.ts tests/unit/websocket-plugin-regression.test.ts
     - npm run lint
     - npm run typecheck

     Result summary:
     - Auth and middleware related targeted tests: 5 files passed, 29 tests passed
     - Lint: passed with warnings
     - Typecheck: failed
