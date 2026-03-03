# Public ETF Profile V2 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add pluggable, cache-backed public ETF research data (Risk, Valuation, RS) without database schema changes or regressions to existing ETF/admin behavior.

**Architecture:** Introduce a new `lib/etf-profile` service layer with provider interface + registry + field-level aggregator + 15-minute cache. Expose additive APIs under `/api/etf/:symbol/*` and incrementally wire UI panels in `pages/tools/etf.vue` while preserving current flow.

**Tech Stack:** Nuxt 4, Nitro server routes, TypeScript, Vitest, existing Prisma reads, existing Yahoo utilities.

---

### Task 1: Define ETF Profile Types and Provider Contract

**Files:**
- Create: `lib/etf-profile/types.ts`
- Create: `lib/etf-profile/providers/base.ts`
- Test: `tests/unit/lib/etf-profile/types-contract.test.ts`

**Step 1: Write the failing test**
```ts
import { describe, expect, it } from 'vitest'
import type { EtfProfileResponse } from '~/lib/etf-profile/types'

describe('etf profile type contract', () => {
  it('supports risk/valuation/rs/meta fields', () => {
    const sample: EtfProfileResponse = {} as any
    expect(sample).toBeDefined()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/unit/lib/etf-profile/types-contract.test.ts`  
Expected: FAIL (missing module/types)

**Step 3: Write minimal implementation**
- Add exported domain types in `types.ts`:
  - `RiskMetrics`, `ValuationMetrics`, `RsMetrics`, `ProfileMeta`, `EtfProfileResponse`
- Add provider contract in `providers/base.ts`:
  - `EtfDataProvider` interface
  - `ProviderResult<T>`

**Step 4: Run test to verify it passes**

Run: `npm run test -- tests/unit/lib/etf-profile/types-contract.test.ts`  
Expected: PASS

**Step 5: Commit**
```bash
git add lib/etf-profile/types.ts lib/etf-profile/providers/base.ts tests/unit/lib/etf-profile/types-contract.test.ts
git commit -m "feat(etf): define profile types and provider contract"
```

### Task 2: Add Cache Module (TTL 15 Minutes)

**Files:**
- Create: `lib/etf-profile/cache.ts`
- Test: `tests/unit/lib/etf-profile/cache.test.ts`

**Step 1: Write the failing test**
```ts
import { describe, expect, it } from 'vitest'
import { getCached, setCached } from '~/lib/etf-profile/cache'

describe('etf profile cache', () => {
  it('expires values by ttl', async () => {
    setCached('k', { ok: true }, 1)
    await new Promise(r => setTimeout(r, 1100))
    expect(getCached('k')).toBeNull()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/unit/lib/etf-profile/cache.test.ts`  
Expected: FAIL (missing module/functions)

**Step 3: Write minimal implementation**
- In-memory map cache with structure `{ value, expiresAt }`
- Export:
  - `getCached(key)`
  - `setCached(key, value, ttlSeconds = 900)` (15 minutes default)
  - `clearExpired()`

**Step 4: Run test to verify it passes**

Run: `npm run test -- tests/unit/lib/etf-profile/cache.test.ts`  
Expected: PASS

**Step 5: Commit**
```bash
git add lib/etf-profile/cache.ts tests/unit/lib/etf-profile/cache.test.ts
git commit -m "feat(etf): add profile cache with default 15m ttl"
```

### Task 3: Implement RS and Risk Calculation Utilities

**Files:**
- Create: `lib/etf-profile/calculators/risk.ts`
- Create: `lib/etf-profile/calculators/rs.ts`
- Test: `tests/unit/lib/etf-profile/risk-calculator.test.ts`
- Test: `tests/unit/lib/etf-profile/rs-calculator.test.ts`

**Step 1: Write the failing tests**
- Add deterministic fixtures for close prices and volume.
- Assert:
  - 52W high/low
  - volatility outputs are finite
  - max drawdown <= 0
  - RS relative return equals `(symbolReturn - benchmarkReturn) * 100`

**Step 2: Run tests to verify they fail**

Run: `npm run test -- tests/unit/lib/etf-profile/risk-calculator.test.ts tests/unit/lib/etf-profile/rs-calculator.test.ts`  
Expected: FAIL

**Step 3: Write minimal implementation**
- `computeRiskMetrics(series)` in `risk.ts`
- `computeRelativeStrength(symbolSeries, benchmarkSeries, period)` in `rs.ts`
- Handle insufficient data by returning `null` values

**Step 4: Run tests to verify they pass**

Run: `npm run test -- tests/unit/lib/etf-profile/risk-calculator.test.ts tests/unit/lib/etf-profile/rs-calculator.test.ts`  
Expected: PASS

**Step 5: Commit**
```bash
git add lib/etf-profile/calculators/risk.ts lib/etf-profile/calculators/rs.ts tests/unit/lib/etf-profile/risk-calculator.test.ts tests/unit/lib/etf-profile/rs-calculator.test.ts
git commit -m "feat(etf): add risk and relative strength calculators"
```

### Task 4: Add Provider Registry and Aggregator with Field-Level Fallback

**Files:**
- Create: `lib/etf-profile/providers/yahoo.ts`
- Create: `lib/etf-profile/providers/external-free.ts`
- Create: `lib/etf-profile/providers/registry.ts`
- Create: `lib/etf-profile/aggregator.ts`
- Test: `tests/unit/lib/etf-profile/aggregator.test.ts`

**Step 1: Write the failing test**
- Mock two providers:
  - provider A gives `aum` only
  - provider B gives `expenseRatioPct` only
- Assert merged valuation includes both and tracks source map.

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/unit/lib/etf-profile/aggregator.test.ts`  
Expected: FAIL

**Step 3: Write minimal implementation**
- Registry returns enabled providers in priority order.
- Aggregator merges by first non-null field.
- Build `meta.sources` per field.
- Catch provider errors and continue.

**Step 4: Run test to verify it passes**

Run: `npm run test -- tests/unit/lib/etf-profile/aggregator.test.ts`  
Expected: PASS

**Step 5: Commit**
```bash
git add lib/etf-profile/providers/yahoo.ts lib/etf-profile/providers/external-free.ts lib/etf-profile/providers/registry.ts lib/etf-profile/aggregator.ts tests/unit/lib/etf-profile/aggregator.test.ts
git commit -m "feat(etf): add pluggable providers and fallback aggregator"
```

### Task 5: Expose New Public ETF APIs

**Files:**
- Create: `server/api/etf/[symbol]/profile.get.ts`
- Create: `server/api/etf/[symbol]/risk.get.ts`
- Create: `server/api/etf/[symbol]/valuation.get.ts`
- Create: `server/api/etf/[symbol]/rs.get.ts`
- Test: `tests/unit/server/etf-profile-api.test.ts`

**Step 1: Write the failing test**
- Assert 400 on invalid `benchmark`/`period`
- Assert 200 with partial payload when provider throws

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/unit/server/etf-profile-api.test.ts`  
Expected: FAIL

**Step 3: Write minimal implementation**
- Validate params.
- Reuse cache + aggregator.
- Return metadata (`asOf`, `fetchedAt`, `isStale`, `sources`).

**Step 4: Run test to verify it passes**

Run: `npm run test -- tests/unit/server/etf-profile-api.test.ts`  
Expected: PASS

**Step 5: Commit**
```bash
git add server/api/etf/[symbol]/profile.get.ts server/api/etf/[symbol]/risk.get.ts server/api/etf/[symbol]/valuation.get.ts server/api/etf/[symbol]/rs.get.ts tests/unit/server/etf-profile-api.test.ts
git commit -m "feat(etf): add public profile/risk/valuation/rs apis"
```

### Task 6: Wire Public ETF UI Panels (Risk, Valuation, RS)

**Files:**
- Modify: `pages/tools/etf.vue`
- Modify: `locales/en.json`
- Modify: `locales/zh-TW.json`
- Modify: `locales/zh-CN.json`
- Test: `tests/unit/pages/tools-etf-profile-v2.test.ts`

**Step 1: Write the failing test**
- Render page and assert new sections/titles exist:
  - Risk
  - Valuation
  - Relative Strength

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/unit/pages/tools-etf-profile-v2.test.ts`  
Expected: FAIL

**Step 3: Write minimal implementation**
- Add client state for new API payloads.
- Fetch profile data after symbol analysis fetch.
- Add three UI panels/tabs without removing existing content.
- Display `N/A` for null fields.
- Add tooltip copy keys.

**Step 4: Run test to verify it passes**

Run: `npm run test -- tests/unit/pages/tools-etf-profile-v2.test.ts`  
Expected: PASS

**Step 5: Commit**
```bash
git add pages/tools/etf.vue locales/en.json locales/zh-TW.json locales/zh-CN.json tests/unit/pages/tools-etf-profile-v2.test.ts
git commit -m "feat(etf): add public risk valuation and rs panels"
```

### Task 7: Regression Verification

**Files:**
- No code changes expected

**Step 1: Run focused regression tests**

Run:
```bash
npm run test -- tests/unit/server/etf-ownership-regressions.test.ts tests/unit/server/admin.middleware.test.ts
```
Expected: PASS

**Step 2: Run all newly added tests**

Run:
```bash
npm run test -- tests/unit/lib/etf-profile tests/unit/server/etf-profile-api.test.ts tests/unit/pages/tools-etf-profile-v2.test.ts
```
Expected: PASS

**Step 3: Run type checks for touched code**

Run: `npm run typecheck`  
Expected: PASS (or existing known failures documented separately)

**Step 4: Commit verification notes**
```bash
git add -A
git commit -m "test(etf): verify profile v2 coverage and regressions"
```
