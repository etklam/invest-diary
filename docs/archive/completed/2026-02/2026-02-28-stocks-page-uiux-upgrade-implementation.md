# Stocks Page UI/UX Upgrade Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Upgrade `/stocks` into a clean dashboard + mobile-first experience, and add front-end interaction controls (search, filters, quick sort) without backend changes.

**Architecture:** Keep current data source (`/api/stocks/holdings`) and compute all new interaction behavior in page-local derived state. Extract pure calculation/filter/sort helpers into a testable lib module to keep UI code readable and verifiable. Preserve existing table sort behavior while layering quick-sort chips and mobile-friendly controls.

**Tech Stack:** Nuxt 4, Vue 3 Composition API, TypeScript, TailwindCSS, Vitest, vue-tsc.

---

### Task 1: Add testable stocks view-model helpers

**Files:**
- Create: `lib/stocks-view.ts`
- Create: `tests/lib/stocks-view.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { applyStocksView } from '~/lib/stocks-view'

describe('applyStocksView', () => {
  it('filters by symbol search case-insensitively', () => {
    const result = applyStocksView([{ symbol: 'AAPL', quantity: 1, avgCost: 10, totalCost: 10 }], {
      search: 'aap',
      profitStatus: 'all',
      concentration: 'all',
      sortKey: 'totalCost',
      sortDir: 'desc'
    })

    expect(result).toHaveLength(1)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/lib/stocks-view.test.ts`  
Expected: FAIL (module/function missing)

**Step 3: Write minimal implementation**

- Implement helper types:
  - `HoldingViewInput`
  - `ProfitStatusFilter`
  - `ConcentrationFilter`
  - `QuickSortKey`
  - `SortDirection`
- Implement pure helpers:
  - unrealized amount + unrealized percentage
  - market value
  - concentration percentage
- Implement `applyStocksView()` pipeline:
  - symbol search
  - profit status filter
  - concentration filter
  - sorting

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/lib/stocks-view.test.ts`  
Expected: PASS

**Step 5: Commit**

```bash
git add lib/stocks-view.ts tests/lib/stocks-view.test.ts
git commit -m "feat(stocks): add view-model helpers for search filter and sorting"
```

### Task 2: Integrate search + filters + quick sort into stocks page

**Files:**
- Modify: `pages/stocks/index.vue`
- Test: `tests/lib/stocks-view.test.ts`

**Step 1: Write/extend failing tests for missing interaction cases**

Add test cases for:
- `profitStatus = gain/loss/no-quote`
- concentration thresholds (`>=10`, `>=20`)
- quick sort toggle behavior (asc/desc)
- market value and unrealized % ordering

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/lib/stocks-view.test.ts`  
Expected: FAIL on newly added cases

**Step 3: Implement minimal page integration**

In `pages/stocks/index.vue`:
- Add control state:
  - `searchQuery`
  - `profitStatusFilter`
  - `concentrationFilter`
  - `quickSortKey`
  - `quickSortDir`
- Replace direct `sortedHoldings` input with helper output from `applyStocksView()`
- Keep existing table sort buttons as advanced sort fallback
- Add quick-sort chip controls with active styling + `aria-pressed`

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/lib/stocks-view.test.ts`  
Expected: PASS

**Step 5: Commit**

```bash
git add pages/stocks/index.vue tests/lib/stocks-view.test.ts
git commit -m "feat(stocks): add search filters and quick-sort controls"
```

### Task 3: UI/UX polish for clean dashboard and mobile-first cards

**Files:**
- Modify: `pages/stocks/index.vue`

**Step 1: Add failing assertion-oriented test snapshot (optional lightweight)**

- If page-level test setup is absent, skip snapshot test and proceed with manual QA checklist in Step 4.

**Step 2: Implement minimal visual refactor**

- Improve hierarchy and spacing in header, summary, controls, holdings sections
- Reduce visual weight of analytics donut block
- Make controls usable on mobile:
  - wrap/h-scroll chip row
  - larger tap targets
- In mobile cards, emphasize current quick-sort metric line
- Preserve current theme style consistency with existing system

**Step 3: Verify no behavior regressions**

- Ensure fetch price button/cooldown still works
- Ensure desktop table sort still works
- Ensure empty/error/loading states still render correctly

**Step 4: Run verification**

Run:
- `npm run typecheck`
- `npm test -- tests/lib/stocks-view.test.ts`

Expected:
- Typecheck PASS
- Tests PASS

**Step 5: Commit**

```bash
git add pages/stocks/index.vue
git commit -m "feat(stocks): polish dashboard layout and mobile card ux"
```

### Task 4: Final verification and cleanup

**Files:**
- Review: `pages/stocks/index.vue`
- Review: `lib/stocks-view.ts`
- Review: `tests/lib/stocks-view.test.ts`

**Step 1: Run focused verification**

Run:
- `npm test -- tests/lib/stocks-view.test.ts`
- `npm run typecheck`

Expected: all PASS

**Step 2: Run relevant broader regression check**

Run: `npm test -- tests/lib/utils.test.ts tests/composables/useNavigation.test.ts`  
Expected: PASS

**Step 3: Manual QA checklist**

- Desktop:
  - search/filter/quick sort interactions all work together
  - table header sort remains functional
- Mobile:
  - controls usable without overlap
  - cards readable; key metric emphasis matches selected quick sort
- States:
  - no holdings state
  - filtered no-result state
  - loading/error/retry states

**Step 4: Commit verification-only adjustments (if any)**

```bash
git add <affected-files>
git commit -m "chore(stocks): finalize verification adjustments"
```
