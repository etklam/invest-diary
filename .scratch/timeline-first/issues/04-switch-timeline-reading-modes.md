Status: completed
Type: AFK

## What to build

Make My Timeline and Pair View feel like two reading modes of the same chronological workspace. Preserve the existing `/timeline/compare` route and partner-sharing domain while making the mode switch, partner selection, attribution, and empty or partial states explicit.

## Acceptance criteria

- [ ] Timeline and Pair View share a compact accessible mode switch with correct active state.
- [ ] Pair View remains under `/timeline/compare`, and selected partner query state survives route updates.
- [ ] Loading, error, no-partner, not-sharing, no-entry, owner-only, and partner-only states remain understandable and actionable without invented capabilities.
- [ ] Side-by-side owner and partner Diaries keep source attribution and readable mobile stacking.
- [ ] Existing partner comparison tests plus focused UI/contract tests cover selection and state behavior.

## Blocked by

- `01-returning-user-lands-on-timeline.md`
- `03-capture-quick-diary-globally.md`

## Comments

- Added an exact-active Timeline mode switch, persisted the default/selected Partner in query state, removed duplicate fetch refresh, and retained existing union-date partial comparisons and attribution.
