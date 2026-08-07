# Fix Diary Sorting, Filtering, and Summary Semantics

Status: completed
Implementation: `c0a2ba7`
Type: AFK

## Parent

[Diary UX Reliability PRD](../../diary-ux-reliability/PRD.md)

## What to build

Make Diary Desk controls and derived states match their labels. Date sorting must use the Diary date with a stable tie-breaker, current-week values must exclude future Diaries and respect the user's timezone, and filtered zero results must be distinguished from an account with no Diaries.

Search should commit after a short idle interval while preserving existing results during refresh, so correctness improvements do not introduce a flashing or request-heavy interface.

## Acceptance criteria

- [x] Date ascending and descending sorts use Diary date rather than creation timestamp.
- [x] A stable secondary sort prevents duplicate or missing rows across pagination boundaries.
- [x] Current-week Summary values use timezone-aware week boundaries and exclude future Diaries.
- [x] An account with no Diaries sees the first-entry state.
- [x] Active filters with zero matches show the no-results state and a Clear Filters action.
- [x] Search commits after 300 ms of inactivity and filter changes reset pagination.
- [x] Existing results remain visible with local busy feedback while replacement results load.
- [x] API and UI tests cover backfilled Diaries, equal dates, future dates, empty accounts, no results, debounce, and pagination reset.

## Blocked by

- [04 — Deliver Complete Diary History and Calendar Activity](./04-deliver-complete-diary-history-and-activity.md)

## Comments

Stabilized Diary ordering with date/title/id tie-breakers, moved Summary aggregation to an independent server read model, added timezone-aware current-week semantics, and added 300 ms search debounce with result preservation and explicit empty-state classification.

Verification: Diary query/read/Summary and UI tests, full `npm test`, typecheck, lint, and build passed.
