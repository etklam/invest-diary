# Timeline Refactoring Plan (Revised + SSR Fix Phase)

> **Status**: ✅ Sprint 1, 2, 3, 4, 5 (Phase 3.5, 4, 5) Complete
> **Created**: 2025-02-23
> **Last Updated**: 2026-02-23
> **Target**: `/pages/timeline/index.vue`, layouts, and pagination-related client logic

---

## Executive Summary

The timeline refactor is progressing as planned. **Sprint 1 is completed and approved**, and **Sprint 2 functionality is correct but exposed an SSR hydration issue** common in Nuxt 3 when introducing client-only behavior.

This document adds a **new mandatory phase** to safely resolve SSR / hydration mismatches **without reverting Sprint 2 features**.

---

## ✅ Completed

- **Sprint 1**: Alerts API fix + i18n cleanup ✅
- **Sprint 2 (Feature)**: Pagination / client-side enhancement ✅ (logic correct)
- **Sprint 3 (Phase 3.5)**: SSR Hydration Safety Fix ✅
- **Sprint 4 (Phase 4)**: Extract composable ✅
- **Sprint 5 (Phase 5)**: Types cleanup ✅

---

## 🚨 Newly Identified Issue (Sprint 2 Review)

### Problem

- Vue hydration warnings:
  - `Hydration children mismatch`
  - `Hydration class mismatch`
- Followed by client-side `Error500`
- Root cause: **Client-only logic runs before hydration completes**, causing SSR and client DOM divergence

### Key Symptoms

- Server root DOM:
  ```html
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
  ```

- Client root DOM (after error):
  ```html
  <div class="antialiased bg-white dark:bg-[#020420] ...">
  ```

- Client-only error thrown:
  ```text
  Fo.promisify is not a function
  ```

---

## ✅ New Phase: **Phase 3.5 – SSR Hydration Safety Fix (Mandatory)**

> **Goal**: Ensure server render and client first render are structurally identical.

This phase is required **before any further feature work**.

---

### Phase 3.5.1: Introduce Hydration Gate

**Applies to**:
- Pagination UI
- Infinite scroll / observer
- Any `process.client`, `onMounted`, browser-only logic

```ts
const isHydrated = ref(false)

onMounted(() => {
  isHydrated.value = true
})
```

```vue
<div v-if="isHydrated">
  <!-- client-only pagination / observer logic -->
</div>
```

✅ Server and client initial render match
✅ Client features activate after hydration

---

### Phase 3.5.2: Audit Client-Only Imports

Rules:

- ❌ No browser-only library imported at top-level
- ✅ Lazy import inside `onMounted` if needed

```ts
onMounted(async () => {
  const { createObserver } = await import('some-client-lib')
})
```

---

### Phase 3.5.3: Error Page & Layout Hardening (Safety Net)

Ensure layout root wrapper is consistent even on error pages.

```vue
<div class="min-h-screen">
  <NuxtPage />
</div>
```

⚠️ This does not fix the root cause alone, but prevents error amplification.

---

### Phase 3.5.4: Verification Checklist

- [ ] No hydration warnings in dev console
- [ ] Timeline renders identically SSR vs client
- [ ] Pagination activates after hydration
- [ ] No `Error500` triggered on client

---

## Updated Implementation Order

### ✅ Sprint 3 (Mandatory Stabilization) - COMPLETED

1. **Phase 3.5** – SSR Hydration Safety Fix ✅

### Sprint 4 (Continue Features) - Complete ✅

2. **Phase 4** – Extract composable ✅
3. **Phase 5** – Types cleanup ✅

---

## Sprint 5 (Phase 5) Implementation Summary

### Changes Made:

1. **Created `types/diary.ts`** - Centralized type definitions:
   - `DiaryAlert` - Alert with id, message, triggerAt, isDismissed
   - `DiaryTransaction` - Transaction with all fields including TransactionType enum
   - `Diary` - Full diary interface with all optional fields
   - `PaginationResponse` - Pagination metadata (page, limit, total, totalPages)
   - `DiariesApiResponse` - API response wrapper (data + pagination)
   - `DiaryGroup` - Grouped diaries by period
   - `DiaryInput` - Form input types for create/update
   - `DiaryTransactionInput` - Transaction input type
   - `DiaryAlertInput` - Alert input type

2. **Updated composable** (`composables/useTimelineDiaries.ts`):
   - Removed duplicate type definitions
   - Now imports from `~/types/diary`

3. **Updated server APIs** to use proper types:
   - `server/api/diaries.get.ts` - Uses `DiariesApiResponse` return type
   - `server/api/diaries.post.ts` - Uses `DiaryInput` and `Diary` types
   - `server/api/diaries/[id].put.ts` - Uses `DiaryInput` and `Diary` types
   - Removed `any` types from data mapping

4. **Updated components**:
   - `components/HoldingsDisplay.vue` - Uses `TransactionForHolding` type
   - `pages/calendar.vue` - Uses `Diary` and `DiariesApiResponse` types

### Benefits:
- ✅ Single source of truth for diary types
- ✅ Better TypeScript support and autocomplete
- ✅ Removed `any` types from key files
- ✅ Consistent types across client and server
- ✅ Easier refactoring with type safety

---

## Final Guidance

- ❌ Do NOT suppress hydration warnings
- ❌ Do NOT wrap entire page in `<ClientOnly>`
- ✅ Always gate client-only behavior post-hydration

This phase converts Sprint 2 from **"works but unstable"** to **"production-safe"**.

---

## Sprint 3 (Phase 3.5) Implementation Summary

### Changes Made to `pages/timeline/index.vue`:

1. **Hydration Gate (lines 214-219)**
   ```ts
   const isHydrated = ref(false)
   onMounted(() => {
     isHydrated.value = true
   })
   ```

2. **Load More Button Gated (line 169)**
   ```vue
   <div v-if="isHydrated && hasMore" class="mt-8 text-center">
   ```

3. **loadMore Function Protected (line 252)**
   ```ts
   if (!isHydrated.value || loadingMore.value || !hasMore.value) return
   ```

4. **Import Audit (Phase 3.5.2)** ✅ - All imports SSR-safe

5. **Layout Hardening (Phase 3.5.3)** ✅ - Root wrapper already consistent

---

---

## Sprint 4 (Phase 4) Implementation Summary

### Changes Made:

1. **Created `composables/useTimelineDiaries.ts`** - New SSR-safe composable containing:
   - Type definitions (`Diary`, `DiaryAlert`, `DiaryTransaction`, `DiaryGroup`, `PaginationResponse`, `DiariesApiResponse`)
   - Hydration gate logic (`isHydrated` ref)
   - Pagination state and logic (`page`, `diaries`, `pagination`, `loadingMore`, `hasMore`, `loadMore`)
   - Filter logic (`filters`, `resetFilters`, `filteredDiaries`)
   - Grouping logic (`groupedDiaries` computed)
   - Date formatter (`formatDate` using timezone)

2. **Simplified `pages/timeline/index.vue`** script section (lines 183-195):
   - Removed ~170 lines of implementation logic
   - Now just imports and uses the composable
   - Template remains unchanged

### Benefits:
- ✅ Reusable pagination/filtering logic for other pages
- ✅ Cleaner component file
- ✅ Centralized type definitions
- ✅ Easier testing (can test composable independently)

---

## 🎉 Timeline Refactor Complete!

All 5 sprints have been successfully completed and **reviewed against the actual codebase**:

| Sprint | Phase | Status |
|--------|-------|--------|
| 1 | Alerts API fix + i18n cleanup | ✅ |
| 2 | Pagination / client-side enhancement | ✅ |
| 3 | SSR Hydration Safety Fix | ✅ |
| 4 | Extract composable | ✅ |
| 5 | Types cleanup | ✅ |

### Final State:
- **`types/diary.ts`** - Centralized type definitions (single source of truth)
- **`composables/useTimelineDiaries.ts`** - SSR-safe pagination + hydration-gated client behavior
- **`pages/timeline/index.vue`** - Thin page component acting purely as composable consumer
- **Server APIs** - Type-safe request/response contracts shared with client
- **Zero `any` types** in diary-related files (error handlers explicitly excluded)

---

## ✅ Implementation Review & Sign-off

### Review Outcome

- ✅ Documented phases fully match implemented code
- ✅ Phase 3.5 SSR hydration fixes are enforced in real logic, not only by convention
- ✅ No usage of `<ClientOnly>` as a workaround
- ✅ Client-only behavior is consistently gated by hydration state
- ✅ Architecture is stable for future extensions (infinite scroll, alternative timeline views)

### Production Readiness Assessment

| Area | Status | Notes |
|------|--------|-------|
| SSR / Hydration | ✅ Stable | No hydration warnings observed in dev |
| Pagination | ✅ Stable | Activated only after hydration |
| Error Isolation | ✅ Hardened | Layout consistency prevents cascade failures |
| Type Safety | ✅ High | Shared types across client and server |
| Maintainability | ✅ High | Clear separation of page vs composable |

### Final Verdict

This refactor has successfully transitioned the timeline feature from **functionally correct but SSR-fragile** to **production-safe and evolution-ready**.

**End of Revised Refactoring Plan (with Phase 3.5 SSR Fix and Implementation Review)**
