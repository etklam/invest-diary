# Testing Guide

This document describes the **actual** test setup for Diary Vue as of June 2026. It was rewritten from scratch after the original version drifted from reality. Where verification was not possible, the section is marked "Needs verification".

---

## 1. Test commands

All commands come from `package.json`. There is no Husky pre-commit hook wired up — these are invoked manually or by CI.

```bash
npm test                    # vitest run — single-shot, all tests (default CI entry)
npm run test:watch          # vitest watch — re-run on file change
npm run test:ui             # vitest --ui — browser dashboard
npm run test:coverage       # vitest run --coverage — text + json + html
npm run test:unit           # vitest run tests/unit — only the unit/ tree
npm run test:integration    # vitest run tests/integration — only integration/ tree
npm run test:e2e            # playwright test — E2E suite (separate config)
npm run test:ci             # vitest run --coverage --reporter=json — CI reporter
npm run coverage:gate       # runs coverage twice (text + json + lcovonly) — gate script
npm run health:quick        # npm test && npx prisma validate
```

Single file or directory:

```bash
npx vitest run tests/unit/server/serialize.test.ts
npx vitest run tests/lib/market-rotation
```

Skip the slow lint+typecheck guard (see section 8) when iterating on unrelated tests:

```bash
SKIP_LINT_GUARD=1 npx vitest run tests/api/auth.test.ts
```

E2E tests are separate (see section 3). They boot a real dev server via Playwright's `webServer` config — never run them against a production database. Seed first with `npm run seed`.

---

## 2. Vitest config summary

Config lives in `/Users/klam/Desktop/project/diary-vue/vitest.config.ts`.

| Setting | Value |
| --- | --- |
| environment | `happy-dom` |
| globals | `true` (`describe`, `it`, `expect` available without imports — though most files still import them explicitly) |
| root | `.` |
| setupFiles | `['./tests/vi-setup.ts']` |
| include | `**/*.test.{ts,tsx}` |
| exclude | `node_modules`, `dist`, `.nuxt`, `.output` |
| plugins | `@vitejs/plugin-vue` |
| coverage.provider | `v8` |
| coverage.reporter | `text`, `json`, `html` |

### Alias setup (`resolve.alias`)

```
~        → project root
@        → project root
~~       → project root
@@       → project root
#imports → tests/mocks/nuxt-imports.ts   ← Nuxt auto-import shim
assets   → ./assets
public   → ./public
```

`tests/mocks/nuxt-imports.ts` is the seam that lets Vitest import `.vue` files that depend on Nuxt auto-imports (`useAuth`, `useI18n`, `useToast`, `useFetch`, `useRoute`, etc.). Each export delegates to a `globalThis` override if tests register one, else returns a sensible default. Tests that need to control Nuxt composables install globals via `Object.assign(globalThis, { ... })` or `vi.stubGlobal`.

### `tests/vi-setup.ts` (global setup)

This file runs before every test file and installs:

- **H3 mocks**: `mockReadBody`, `mockGetQuery`, `mockGetRouterParam`, `mockSetCookie`, `mockDeleteCookie`, `mockGetCookie`, `mockGetHeader`, `mockSetHeader`, `mockSendRedirect`, `mockSetResponseStatus`. Each is a `vi.fn()` exported so tests can `mockReturnValue` / `mockResolvedValue` on them.
- **Nuxt auto-import shims**: `defineEventHandler`, `readBody`, `getQuery`, etc. bound to the mocks above; `cachedEventHandler` is identity-pass-through; `createError` builds an Error with `statusCode`/`statusMessage`.
- **`useToast`, `useI18n` globals** for composables that read them at module-load time.
- **`useFetch`, `useLazyFetch`, `$fetch` globals** returning `ref(null)` defaults so Vue templates don't crash during mount.
- **`vi.mock('#app/composables/useToast')`** and **`vi.mock('~/composables/useToast')`** to intercept the explicit import paths as well.

Tests do **not** need to re-import these globals — just `import { mockReadBody } from '../vi-setup'` to grab the mock function reference and drive it.

---

## 3. Test folder layout

All tests live under `/Users/klam/Desktop/project/diary-vue/tests/`. Naming is `*.test.ts` for Vitest, `*.spec.ts` for Playwright.

```
tests/
├── vi-setup.ts              # Global mocks (see section 2)
├── setup.ts                 # Legacy DB helper entry — unused by unit/api suite
├── README.md                # Short pointer doc (kept in sync with this file)
├── helpers/                 # Shared test utilities (DB-backed)
│   ├── api.ts               # H3 test server (unused by current Vitest suite)
│   ├── auth.ts              # bcrypt + JWT factories (unused — DB-backed)
│   ├── database.ts          # Prisma test DB helpers (unused — DB-backed)
│   └── mock.ts              # mockPrisma(), mockH3Event(), createMockData(), etc.
├── mocks/
│   └── nuxt-imports.ts      # #imports alias target
├── api/                     # API handler tests (mocked Prisma)
├── components/              # Vue component tests (@vue/test-utils)
├── composables/             # Composable behavior tests
├── guards/                  # Repo-wide invariant guards
├── integration/             # Cross-module workflow tests
├── lib/                     # Pure-function lib tests
├── unit/                    # Unit tests, nested by concern
└── e2e/                     # Playwright E2E specs (separate config)
```

### Subdirectory contents

**`tests/api/`** — 32 files. Handler-level tests for REST endpoints. Each file imports the handler default export directly and invokes it with a fake `event`. Prisma is always mocked via `vi.mock('~/lib/prisma', ...)`.

Examples: `auth.test.ts`, `diaries.test.ts`, `blog.test.ts`, `etf-watchlist.test.ts`, `stock-notes.test.ts`, `partner-stock-notes.test.ts`, `reviews.test.ts`, `trade-plans.test.ts`, `rotation-monitor.test.ts`, `market-state.test.ts`.

**`tests/components/`** — 9 files. `@vue/test-utils` mount tests for interactive components. Each test stubs `NuxtLink`, `NuxtImg`, `Icon`, and `TransitionGroup` as needed.

Files: `AlertNotification`, `BlogCard`, `QuickDiaryModal`, `QuickDiaryOneLiner`, `QuickNoteEditorCore`, `QuickNoteTemplateAssistant`, `QuickReminder`, `Toast`, `TransactionInput`.

**`tests/composables/`** — 9 files. Behavior tests for composables, using real `ref`/`computed` and (where needed) fake timers.

Files: `useArticleMarkdown`, `useAuthRecovery`, `useDiscipline`, `useGestures`, `useMobileDetection`, `useNavigation`, `usePerformance`, `useQuickNoteComposer`, `useToast`.

**`tests/guards/`** — 2 files. Repo-wide source-grep or command-execution invariants.

- `lint-typecheck.test.ts` — actually runs `npm run lint` and `npm run typecheck` via `execFileSync`. Skipped when `SKIP_LINT_GUARD=1`. Replaces the old `lint-config.test.ts` which inspected ESLint config shape but never executed lint.
- `no-legacy-branding.test.ts` — walks the source tree and asserts the legacy product name (constructed from fragments to avoid self-tripping) never appears outside `prisma/migrations/`.

**`tests/integration/`** — 5 files. Cross-module workflows that exercise multiple handlers or full Vue component trees.

- `article-markdown-ssr.test.ts` — mounts the real `pages/articles/[slug].vue` inside `<Suspense>` and asserts parsed markdown body is rendered (regression guard for fire-and-forget SSR bug).
- `auth-flow.test.ts`, `diary-workflow.test.ts`, `agent-stock-timeline.test.ts`.

**`tests/lib/`** — 16 files (plus 2 subdirs: `dates/`, `quicknote/`). Pure-function tests for library modules. No mocks, no Vue, no Prisma.

Examples: `recurring-alerts`, `blog`, `position-state`, `format`, `utils`, `market-data`, `stocks-view`, `diary-date`, `holiday-heatmap`, `relativeValue`, `stocks-analytics`, `admin-page-helpers`, `auth-session-error`.

**`tests/unit/`** — Nested by concern:

| Path | Contents |
| --- | --- |
| `unit/components/` | `BaseButton`, `EtfMobileCard`, `LedgerCard`, `ReviewCandidateCard`, `StatusBadge` — presentational/design-system primitive tests |
| `unit/composables/` | `useAuth.test.ts` (older copy; the newer copy is at top-level `composables/`) |
| `unit/lib/` | Deep lib tests: `market-rotation/` (16 files), `market-state/` (2 files), `dates/`, plus `jwt`, `logger`, `error-i18n-mapping`, `discipline-share-url`, `prisma-*`, `symbol-normalization`, `stocks-symbols`, `trade-analytics`, `yahoo-request-queue`, `market-data-cache` |
| `unit/pages/` | 12 files. Page-level guards and contracts: admin route guards, article content rendering, discipline share/import URL handling, portfolio-risk / position-sizing / reviews / strategy-performance / trade-plans / tools-etf-profile-v2 contract tests, stocks-notes i18n |
| `unit/server/` | Server-side query-layer and middleware tests, all Prisma-mocked: `diary-write`, `diary-read`, `diaries-query`, `discipline-queries`, `etf-watchlist-queries`, `etf-profile-api`, `etf-detail-api`, `etf-ownership-regressions`, `market-quote-api`, `market-rotation-queries`, `market-rotation-monitor-queries`, `market-rotation-batch`, `spx-session-api`, `partner-queries`, `partner-compare`, `price-alert-queries`, `transaction-read`, `serialize`, `og-discipline-svg`, `phase2-auth-contracts`, `auth.middleware`, `auth.cookies`, `admin.middleware`, `health.get`, `alert-scheduler`, `alert-persistence` |
| `unit/schedulers/` | `alert-pusher`, `price-alert-checker` — scheduler job logic |
| `unit/websocket/` | `connectionManager`, `alertHandler` — Socket.IO server-side logic |
| `unit/scripts/` | `market-rotation/run-batch`, `market-state/seed-universe-utils`, `market-state/update-breadth-utils` — tests for `scripts/` TypeScript entry points |
| `unit/types/` | `common.test.ts` — shared type guards |
| `unit/*.test.ts` (top-level) | Repo-wide regression guards: `api-logger-regression`, `auth-client-regressions`, `auth-page-hydration-regressions`, `csp-regressions`, `dockerfile-prisma-config`, `pwa-regressions`, `prisma-market-rotation-run-schema`, `typecheck-config`, `websocket-client-regressions`, `websocket-plugin-regression`, `stock-watchlist-queries`, `stock-timeline-queries`, `api-docs-content` |

**`tests/e2e/`** — 7 Playwright specs + helpers. See section 9.

SEC Filings Downloader tests use only local fixtures under `tests/fixtures/sec/` and mocked server/browser routes. Never add a test that calls `sec.gov` or `data.sec.gov`; queue, retry, stale-cache, download, and ZIP behavior must be exercised through deterministic mocked responses.

---

## 4. What should be tested as behavior

The project explicitly favors **behavior tests over source-string or implementation-coupling tests**. The most recent test refactor (`bea93c3 test: replace source-string tests with behavior tests`) replaced every `expect(sourceString).toContain('...')` style assertion with a behavior or runtime-contract assertion. New tests should follow the same rule.

### Principles

1. **Public behavior, not implementation.** Assert what the code does from the outside (HTTP response shape, emitted DOM text, emitted events, returned value), not how it does it (private method names, internal data structures, variable names).
2. **API endpoint contracts.** Invoke the handler with a fake event, mock Prisma, assert the response body, status, cookies/headers set, and side effects (e.g. `refreshToken.create` called once with rotation values).
3. **Pure function inputs/outputs.** For `lib/`, `lib/market-rotation/`, etc.: pass inputs, assert outputs. No mocks. This is the bulk of the high-value test coverage.
4. **User-visible interactions.** For Vue components: mount, trigger a real click/input, assert emitted events and rendered text. Stub Nuxt built-ins (`NuxtLink`, `NuxtImg`, `Icon`) as plain elements that expose their props as DOM attributes so assertions can query real attributes.
5. **Regression guards for past bugs.** When a test exists because of a specific incident, the test file's top comment must explain the bug and the root cause being guarded against. See `tests/integration/article-markdown-ssr.test.ts` (fire-and-forget SSR bug) and `tests/unit/auth-client-regressions.test.ts`.
6. **Repo-wide invariants go in `tests/guards/`.** Things like "lint passes", "typecheck passes", "no legacy branding in source" belong there — they are source-tree-wide guards, not module behavior tests.

### When source-string or CSS-class assertions are OK

The project has exactly two files that still use source/class-string assertions, and both have explicit written justification:

- `tests/unit/components/LedgerCard.test.ts` — asserts `bg-dt-surface`, `border-dt-border`, `text-dt-text`, `text-dt-text-muted`. Justification in the file header: LedgerCard is the canonical DESIGN.md panel primitive; these classes are its public design-system API and downstream pages depend on them.
- `tests/unit/api-docs-content.test.ts` — reads `docs/API.md` to load the documented contract, then invokes the real handler to verify the runtime matches the doc. It does not assert the doc string itself; it asserts behavior. The file includes a comment: "If API.md is ever regenerated from a schema, replace the parseSection() helper below with an assertion against the generated artifact."

Any new class-token or doc-string assertion must include a comment explaining why it is a real contract and not a brittle substring check.

---

## 5. What should NOT be tested

These anti-patterns were removed in recent refactors and should not return:

### Raw source-code string assertions
```ts
// Bad — passes as long as the literal string exists, regardless of behavior
expect(sourceCode).toContain('useAsyncData(')
expect(sourceCode).toContain('"scope": "AGENT_WRITE"')
```
**Why:** gives false confidence. The string can be present in dead code, comments, or unrelated context while the actual behavior is broken. Use behavior tests (invoke the handler / mount the component) instead.

### ESLint/TS config shape inspection
```ts
// Bad — reads eslint.config.ts and asserts property structure
expect(config.rules['@typescript-eslint/no-explicit-any']).toBe('error')
```
**Why:** config can be structurally valid but not actually execute. The replacement, `tests/guards/lint-typecheck.test.ts`, runs the real `npm run lint` / `npm run typecheck` commands.

### Private component methods
```ts
// Bad
expect(wrapper.vm.somePrivateMethod()).toBe(...)
```
**Why:** couples the test to an implementation detail that can be renamed or inlined without changing behavior. Test via emitted events, rendered output, or public props.

### CSS class locking for presentational components
```ts
// Bad (unless the component is a DESIGN.md primitive — see section 4)
expect(wrapper.classes()).toContain('px-4')
expect(button.attributes('class')).toContain('shadow-md')
```
**Why:** Tailwind utility classes are refactored frequently during design iteration. Locking them creates churn and false failures. Only the dt-* design tokens on declared primitives (LedgerCard, and only because DESIGN.md says so) are locked.

### Third-party library behavior
Do not write tests that verify `bcrypt.hash` actually hashes, `zod` actually validates, or `vue` actually re-renders on ref change. Mock the library at the seam and assert that your code calls it with the right inputs.

### snapshot tests of large components
No `toMatchSnapshot()` calls exist in the repo. Snapshots fail on any whitespace change and don't communicate intent. Use explicit assertions.

---

## 6. Coverage gate explanation

Coverage is configured in `vitest.config.ts` `test.coverage`. Provider is `v8`.

### Thresholds (enforced)

```ts
thresholds: {
  lines: 55,
  functions: 55,
  branches: 45,
  statements: 55,
}
```

If any metric falls below the threshold, `vitest run --coverage` exits non-zero. CI treats this as a failure.

### Files included in coverage

The `include` list is an explicit allow-list — only files listed there count toward the threshold. As of the latest config:

- `server/api/auth/**`, `server/api/diaries/**`, `server/api/stocks/**`, `server/api/alerts/**`
- `server/api/market/rotation-monitor.get.ts`, `server/api/admin/market/rotation-batch.post.ts`
- `server/middleware/auth.ts`, `server/middleware/admin.ts`
- `server/utils/**`
- `server/websocket/connectionManager.ts`
- `server/plugins/alert-scheduler.ts`
- `lib/blog.ts`, `lib/diary-date.ts`, `lib/jwt.ts`, `lib/logger.ts`, `lib/prisma.ts`
- `lib/market-data/**`, `lib/market-rotation/**`
- `composables/useAuth.ts`, `composables/useToast.ts`, `composables/useAlerts.ts`, `composables/useAuthRecovery.ts`, `composables/useDiscipline.ts`, `composables/useErrorI18n.ts`, `composables/useTimezone.ts`

### Files excluded from coverage

`components/**/*.vue`, `pages/**/*.vue`, `layouts/**/*.vue`, `app.vue`, `error.vue`, `prisma/`, `*.config.{ts,js}`, `*.test.{ts,tsx}`, and the usual build artifacts.

The `vitest.config.ts` comment calls out: *"Purely presentational components are excluded unless intentionally tested. LedgerCard/BaseButton/StatusBadge are covered by their own component tests but are not part of the line-coverage gate to keep thresholds pragmatic."*

### Running coverage locally

```bash
npm run test:coverage         # writes text table to stdout + coverage/
npm run coverage:gate         # runs the full gate script (text + json + lcovonly)
```

Open `coverage/index.html` after the run for the HTML report.

### What happens when gates fail

The `vitest run --coverage` process exits non-zero. Locally, you see the threshold table at the end of stdout with the failing metric highlighted. CI fails the build. There is no partial-pass mode.

---

## 7. Known weak areas

These are areas where coverage is known to be thin or where tests exist but are of limited value. Items marked **"Needs verification"** were not independently confirmed during this rewrite.

### Currently failing (verified June 17 2026)

- `tests/unit/components/BaseButton.test.ts > has min-h-10 class for 40px touch target` — asserts the old `min-h-10` class but the component now uses `min-h-11`. **Needs fix.** The rest of the suite (1696 tests) passes.

### Explicitly fragile or narrowly scoped

- **`tests/unit/components/BaseButton.test.ts`** — uses Tailwind utility class assertions (`min-h-*`, `inline-flex`). This is the exact anti-pattern section 5 warns against; the failing test is direct evidence of the brittleness. Only LedgerCard has written justification for class-token assertions.
- **`tests/unit/components/LedgerCard.test.ts`** — dt-* class assertions are intentional (see DESIGN.md justification in file header), but the test still locks presentational detail.
- **`tests/unit/api-docs-content.test.ts`** — parses `docs/API.md` with a regex (`/^### \`([A-Z]+ [^\s]+)\`\s*$/gm`). If API.md's heading format changes, the section loader silently returns empty. The file's own comment acknowledges this: "If API.md is ever regenerated from a schema, replace the parseSection() helper below with an assertion against the generated artifact."

### Areas with thin or missing coverage

- **Pages (`pages/**/*.vue`)** — excluded from the coverage gate entirely. Only a handful of pages have mount-level tests (`tests/integration/article-markdown-ssr.test.ts`, `tests/unit/pages/article-content-rendering.test.ts`, `tests/unit/pages/admin-*-route-guard.test.ts`). The bulk of the authenticated app UI (`/diaries`, `/timeline`, `/alerts`, `/stocks`, `/tools/*`) has **no** Vitest component tests. E2E specs cover the happy paths only.
- **Layouts** — no tests.
- **Agent API (`server/api/agent/**`)** — **Needs verification.** `tests/api/agent-diaries.test.ts`, `agent-stocks-records.test.ts`, `agent-stocks-watchlist.test.ts` exist but I did not audit them against the current handler surface area.
- **`server/utils/partner-compare.ts` and `server/utils/partner-queries.ts`** — covered, but the partner comparison algorithm has known edge cases around cross-timezone compare days. **Needs verification** that the test cases cover the edge cases.
- **WebSocket** — `connectionManager` and `alertHandler` have unit tests, but there is **no** integration test that verifies end-to-end Socket.IO message delivery. **Needs verification.**
- **Market rotation snapshot pipeline** — `tests/unit/lib/market-rotation/` has 16 files and is the most TDD-driven area of the codebase (see commit `3ff23b8 feat(market-rotation): add calculation utils with TDD coverage`). Still, the end-to-end pipeline (`pipeline.test.ts`, `snapshot-builder.test.ts`) operates on synthetic inputs — **needs verification** against real Yahoo Finance shape.
- **i18n locale files** — no test verifies that all three locale files (`en.json`, `zh-TW.json`, `zh-CN.json`) have the same key set. `tests/unit/pages/article-content-rendering.test.ts` checks one specific key (`blog.contentUnavailable`) across locales but nothing systematic.

### Dead test infrastructure

- `tests/setup.ts` remains the shared Vitest setup. The old DB-backed helper modules were removed because no current test imported them.
- `tests/helpers/mock.ts` contains only `mockLocalStorage`, the sole helper still used by the Vitest suite.

---

## 8. How to write new tests

### Where to put a new test

| Code under test | Test location |
| --- | --- |
| Pure function in `lib/` | `tests/lib/<module>.test.ts` or `tests/unit/lib/<module>.test.ts` |
| API handler in `server/api/` | `tests/api/<resource>.test.ts` |
| Query-layer util in `server/utils/` | `tests/unit/server/<util>.test.ts` |
| Vue component | `tests/components/<Component>.test.ts` or `tests/unit/components/<Component>.test.ts` (the split is historical; prefer `tests/components/` for new interactive components, `tests/unit/components/` for design-system primitives) |
| Composable | `tests/composables/<useX>.test.ts` |
| Page-level behavior | `tests/integration/<feature>.test.ts` (mounts real page) or `tests/unit/pages/<feature>.test.ts` (contract/guard) |
| Repo-wide invariant | `tests/guards/<name>.test.ts` |
| E2E user flow | `tests/e2e/<flow>.spec.ts` |

### Naming

```
File:    <source-name>.test.ts          (Vitest)
         <flow-name>.spec.ts            (Playwright)
Suite:   describe('Module / Feature')
Case:    it('should <behavior> when <condition>', ...)
```

### How to mock Prisma

Every API test mocks `~/lib/prisma` at the module level. The pattern is consistent across the codebase:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockUserFindUnique = vi.fn()
const mockUserCreate = vi.fn()

vi.mock('~/lib/prisma', () => ({
  default: {
    user: {
      findUnique: mockUserFindUnique,
      create: mockUserCreate,
    },
    $connect: vi.fn(),
    $disconnect: vi.fn(),
  },
}))
```

For query-layer utilities that use `prisma.$transaction`, use `vi.hoisted` to keep mock references available inside the factory (see `tests/unit/server/diary-write.test.ts` for the canonical example):

```ts
const { mockPrismaTransaction, mockTxDiaryCreate } = vi.hoisted(() => ({
  mockPrismaTransaction: vi.fn(),
  mockTxDiaryCreate: vi.fn(),
}))

vi.mock('~/lib/prisma', () => ({
  default: {
    diary: { create: mockTxDiaryCreate, ... },
    $transaction: mockPrismaTransaction,
  },
}))
```

**Never** import `PrismaClient` directly in tests — it triggers the Vite/Prisma packaging bug described in CLAUDE.md. Always mock the module.

### How to mock H3 helpers

Import the mock fns from `tests/vi-setup.ts` — they are already installed as globals by the setup file. You only need the import to get a typed reference:

```ts
import { mockReadBody, mockGetQuery, mockSetCookie } from '../vi-setup'

beforeEach(() => {
  mockReadBody.mockResolvedValue({ email: 'test@example.com', password: 'pw' })
  mockGetQuery.mockReturnValue({ page: 1 })
  mockSetCookie.mockClear()
})
```

If your handler imports `h3` directly for `createError`, also add:

```ts
vi.mock('h3', () => ({
  createError: (params: { statusCode: number; statusMessage: string }) => {
    const error = new Error(params.statusMessage)
    ;(error as any).statusCode = params.statusCode
    ;(error as any).statusMessage = params.statusMessage
    return error
  },
  defineEventHandler: (handler: Function) => handler,
}))
```

### Example: API handler test skeleton

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockReadBody } from '../vi-setup'

const mockWidgetCreate = vi.fn()
const mockWidgetFindUnique = vi.fn()

vi.mock('~/lib/prisma', () => ({
  default: {
    widget: { create: mockWidgetCreate, findUnique: mockWidgetFindUnique },
  },
}))

vi.mock('~/lib/logger', () => ({
  logger: { widget: { withRequestId: vi.fn(() => ({ info: vi.fn(), error: vi.fn() })) } },
}))

describe('POST /api/widgets', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockWidgetCreate.mockResolvedValue({ id: 1n, name: 'w' })
  })

  it('creates a widget and returns serialized body', async () => {
    mockReadBody.mockResolvedValue({ name: 'w' })

    // Dynamic import AFTER mocks are registered
    const { default: handler } = await import('~/server/api/widgets.post')

    const result = await handler({
      context: { user: { id: 1n }, requestId: 'req-1' },
    } as any)

    expect(mockWidgetCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ name: 'w' }) }),
    )
    expect(result).toEqual({ data: { id: '1', name: 'w' } })
  })
})
```

### Example: pure-function unit test skeleton

```ts
import { describe, it, expect } from 'vitest'
import { calculateScore } from '~/lib/widget/score'

describe('calculateScore', () => {
  it('returns 0 for empty input', () => {
    expect(calculateScore([])).toBe(0)
  })

  it.each([
    [[1, 2, 3], 6],
    [[10, -5], 5],
  ])('sums values %j to %i', (input, expected) => {
    expect(calculateScore(input)).toBe(expected)
  })
})
```

### Example: component test skeleton

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import MyWidget from '~/components/MyWidget.vue'

const stubs = {
  NuxtLink: { template: '<a v-bind="$attrs"><slot /></a>', inheritAttrs: false },
  NuxtImg: { template: '<img :src="src" :alt="alt" />', props: ['src', 'alt'] },
  Icon: { template: '<span />', props: ['name'] },
}

describe('MyWidget', () => {
  it('emits "click" with the item id on click', async () => {
    const wrapper = mount(MyWidget, {
      props: { item: { id: 'abc', label: 'hello' } },
      global: {
        stubs,
        config: { globalProperties: { $t: (k: string) => k } },
      },
    })

    await wrapper.find('button').trigger('click')

    expect(wrapper.emitted('click')).toEqual([['abc']])
    expect(wrapper.text()).toContain('hello')
  })
})
```

### Lint + typecheck guard

`tests/guards/lint-typecheck.test.ts` runs the real `npm run lint` and `npm run typecheck` commands. It runs by default on every `npm test`. If you are iterating locally on an unrelated test and the guard is slow, skip it:

```bash
SKIP_LINT_GUARD=1 npx vitest run tests/api/widgets.test.ts
```

Do not commit with the guard disabled.

---

## 9. E2E (Playwright)

Config: `/Users/klam/Desktop/project/diary-vue/playwright.config.ts`. Test directory: `tests/e2e/`. Specs use the `.spec.ts` suffix.

### Projects

Two device profiles, both Chromium:

- `iphone-12` — standard mobile viewport
- `pixel-5` — 60s timeout (slower device)

### Server

Playwright boots the dev server itself via `webServer.command = 'npm run dev'` against `http://127.0.0.1:3000`. `reuseExistingServer: false` — it always starts fresh. Timeout 120s.

### Global setup / teardown

`tests/e2e/global-setup.ts` and `global-teardown.ts` are currently console-log stubs. The setup file's comment says: "Database seeding should be done manually before running E2E tests. Run: `npm run seed`."

**Needs verification:** it is unclear whether E2E specs actually pass in CI today. The `auth-flow.spec.ts` uses a real login form submit against `test@example.com / password123`, which requires the seeded user to exist.

### Existing specs

- `auth-flow.spec.ts` — real login flow
- `diary-crud.spec.ts` — diary create / read / update / delete
- `stock-tracking.spec.ts` — stock watchlist add/remove
- `quick-diary.spec.ts` — quick diary modal flow
- `relative-value.spec.ts` — relative value tool, with mocked market quote routes
- `tools-responsive.spec.ts` — responsive layout assertion
- `tools-text-containment.spec.ts` — text overflow assertion

### Running E2E

```bash
npm run test:e2e                           # all specs
npx playwright test tests/e2e/auth-flow.spec.ts   # single spec
```

E2E is **not** included in `npm test`. It is a separate suite.

---

## 10. Test counts (verified June 17 2026)

```
Vitest:  184 files, 1697 tests (1696 passing, 1 known failure in BaseButton)
E2E:      7 specs (status uncertain — see section 9)
```

The 1 Vitest failure is `tests/unit/components/BaseButton.test.ts > has min-h-10 class for 40px touch target` — the component now uses `min-h-11` but the test still asserts `min-h-10`. This is a failing test, not a failing feature.

---

*Last verified: 2026-06-17 against commit `bea93c3`.*
