# Stocks Page UI/UX Upgrade Design

**Date:** 2026-02-28  
**Scope:** `pages/stocks/index.vue` (UI/UX + front-end interaction enhancements)  
**Status:** Approved by user (direction: clean dashboard + mobile-first cards, with interaction upgrades)

## 1. Goals

- Upgrade Stocks page visual hierarchy to a cleaner dashboard style.
- Improve mobile usability with card-first interaction patterns.
- Add front-end interaction upgrades without backend/API changes:
  - Symbol search
  - Multi-condition filters
  - Quick sort chips

## 2. Non-goals

- No API contract changes.
- No database schema changes.
- No new portfolio analytics engine in this iteration.
- No rewrite of shared app-level design system.

## 3. IA and Layout

Page structure (top to bottom):

1. Summary block (key metrics)
2. Controls block (search + filters + quick sorting)
3. Analytics support block (existing donut + legend, visual de-emphasis)
4. Holdings block
   - Desktop: sortable table
   - Mobile: cards with key values and emphasized current sort dimension

## 4. Interaction Design

### 4.1 Search

- Real-time symbol search (case-insensitive).
- Applies to both desktop and mobile views.

### 4.2 Filters

- Profit status:
  - All
  - Gain
  - Loss
  - No quote
- Cost concentration:
  - All
  - >= 10%
  - >= 20%

Filtering is done purely in front-end derived state.

### 4.3 Quick Sort Chips

- One-tap quick sort targets:
  - Market value (`price * quantity`)
  - Unrealized P/L %
  - Cost concentration %
- Chip toggles asc/desc on repeated tap.
- Existing desktop table header sort remains available.

### 4.4 Mobile Behavior

- Controls become mobile-friendly with larger touch targets.
- Quick-sort chips allow horizontal overflow if needed.
- In card view, the currently active quick-sort metric is visually emphasized.

## 5. Data Flow and State

No API changes. Existing fetch remains source of truth:

- Source: `useLazyFetch('/api/stocks/holdings')`
- Derived state pipeline:
  1. base holdings
  2. apply search filter
  3. apply status/concentration filters
  4. apply active sorting
  5. render to table/cards + summary

All new logic remains in page-local computed state to keep scope contained.

## 6. Visual Language

- Keep current project visual language (blue-slate finance panels).
- Increase contrast and spacing consistency for scanability.
- Improve typography rhythm (headline/subtitle/metric distinction).
- Keep icon system consistent (Heroicons), no emoji icons.

## 7. Error Handling and Empty States

- Keep existing loading/error behavior for holdings fetch.
- Improve empty-state messaging after filtering:
  - Distinguish “no holdings at all” vs “no result under current filters”.
- Keep retry behavior unchanged.

## 8. Accessibility

- Search input and filter controls use explicit labels.
- Sort chips expose active state (`aria-pressed`).
- Maintain keyboard accessibility for all control actions.
- Preserve current table `aria-sort` behavior.

## 9. Testing Strategy

- Add/extend unit tests for derived interaction logic where practical:
  - Search matching behavior
  - Profit status filter behavior
  - Concentration threshold filter behavior
  - Quick sort toggle and ordering behavior
- Run typecheck and relevant test suites after implementation.

## 10. Risks and Mitigations

- Risk: Interaction complexity grows in single page file.
  - Mitigation: keep derived logic grouped and pure; extract helpers only when needed.
- Risk: mobile chips overflow clutter.
  - Mitigation: horizontal scroll with clear spacing and active styling.
- Risk: metric calculations diverge between table and cards.
  - Mitigation: single shared computed source for derived fields.

## 11. Delivery Plan

- Phase A: structural UI cleanup + controls container
- Phase B: implement search + filters + quick sort
- Phase C: mobile card polish + state emphasis
- Phase D: tests, typecheck, and final QA
