# Deliver Complete Diary History and Calendar Activity

Status: completed
Implementation: `c0a2ba7`
Type: AFK

## Parent

[Diary UX Reliability PRD](../../diary-ux-reliability/PRD.md)

## What to build

Provide complete Diary history without bypassing list-page resource limits. Diary Desk must expose incremental access beyond the first page, global Summary values must come from server-side aggregates, and Calendar must use a lightweight date-range Activity contract for its month grid and rolling heatmap.

The user must never see a partial page presented as a complete history or a Calendar day marked empty merely because its Diary fell outside the first list page.

## Acceptance criteria

- [x] Diary Desk retains pagination metadata and exposes a usable Load More or equivalent continuation action.
- [x] The twenty-first and older Diaries remain reachable while active filters are preserved.
- [x] A failed later-page request preserves already loaded Diaries and offers retry.
- [x] Diary Desk Summary values are calculated independently of the current list page and have documented scopes.
- [x] Calendar month indicators and the rolling 371-day heatmap use a compact authenticated Activity response bounded by date range.
- [x] Calendar no longer requests a list limit outside the Diary-list contract.
- [x] Ownership and the user's timezone are respected by list, Summary, and Activity responses.
- [ ] API, component, and end-to-end tests prove the 20/21-entry boundary and complete Calendar activity. API/component coverage passed; E2E execution remains a release follow-up.

## Blocked by

None - can start immediately

## Comments

Added server-side Summary and date-range Activity read models, preserved paginated Diary rows during refresh, and added Load More/retry plus correct first-entry/no-results states. Calendar now uses bounded month and 371-day Activity requests.

Verification: API/component/unit coverage, full `npm test`, typecheck, lint, and build passed. E2E execution was not part of this local verification pass.
