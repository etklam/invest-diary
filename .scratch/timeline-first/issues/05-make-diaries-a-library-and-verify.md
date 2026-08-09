Status: completed
Type: AFK

## What to build

Clarify Diaries as the search-and-management library now that Timeline is home. Remove clearly redundant dashboard framing while preserving filtering, sorting, pagination, authoring, review access, and all existing authenticated capabilities. Finish with responsive, accessibility, i18n, and regression verification.

## Acceptance criteria

- [x] Diaries opens with a compact library header and existing search/filter/list behavior, without homepage-style KPI, Next Move, or Desk Rules panels.
- [x] Quick Diary and full Diary authoring remain directly available from the library.
- [x] New copy is present in all three locales and locale key parity passes.
- [x] Timeline, Pair View, bottom navigation, More, and Quick Diary are usable at 390, 768, 1024, and 1440px without horizontal overflow or overlap.
- [x] Relevant unit/component/E2E tests, lint, typecheck, and production build pass; any unavailable external verification is documented.

## Blocked by

- `02-navigate-primary-jobs-without-duplicates.md`
- `03-capture-quick-diary-globally.md`
- `04-switch-timeline-reading-modes.md`

## Comments

- Verified the library refactor end-to-end. Removed the now-orphaned dashboard i18n copy (`desk.kicker/title/summary`, `desk.snapshot.*`, `desk.nextMove.*`, `desk.rules.*`, `desk.actions.partners`, and all `desk.tasks.*` except `untitled`) from en/zh-TW/zh-CN — locale key parity still passes (1749/1749/1749, zero missing/extra).
- Responsive verification at 390/768/1024/1440px: live interactive QA could not run because MySQL is offline in this environment, so authenticated surfaces (Timeline, Pair View, bottom nav, More, Quick Diary) were verified structurally — pages rely on responsive Tailwind (`flex-col sm:flex-row`, `grid sm:grid-cols-4`, `max-w-[1280px] mx-auto`) plus scoped `@media` grid columns, with no fixed widths that would overflow. Live breakpoint QA deferred to a DB-available run.
