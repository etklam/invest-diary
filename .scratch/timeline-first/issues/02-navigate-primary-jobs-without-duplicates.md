Status: completed
Type: AFK

## What to build

Replace the authenticated feature-catalog navigation with a compact job-based structure. Desktop should expose Timeline directly and group lower-frequency destinations; mobile should expose Timeline, Portfolio, Quick Diary, Review, and More without duplicate destinations. Every supported authenticated surface must remain reachable.

## Acceptance criteria

- [ ] Desktop navigation exposes Timeline as the primary destination and groups Journal, Portfolio, Research, and More destinations clearly.
- [ ] Mobile bottom navigation contains five stable jobs with no duplicate route; Quick Diary and More are actions rather than fake routes.
- [ ] More opens an accessible grouped menu containing all lower-frequency authenticated destinations, including Settings and Partners.
- [ ] Nested routes produce one coherent active primary item or group using `aria-current` where applicable.
- [ ] Navigation tests cover route inventory, grouping, nested active state, and the absence of duplicate mobile destinations.

## Blocked by

- `01-returning-user-lands-on-timeline.md`

## Comments

- Implemented Timeline-first desktop navigation, five-slot mobile jobs, an accessible grouped More dialog, nested active-state selection, and route-inventory tests.
