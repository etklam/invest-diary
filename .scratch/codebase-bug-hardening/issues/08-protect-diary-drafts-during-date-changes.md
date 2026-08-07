# Protect Diary Drafts During Date Changes

Status: completed
Implementation: `c0a2ba7`
Type: AFK

## Parent

[Diary UX Reliability PRD](../../diary-ux-reliability/PRD.md)

## What to build

Make Diary authoring safe when the initial date already has a Diary, when the author changes dates, and when date lookups return out of order. Existing content or an empty form may replace the current draft only after the user's intent is known, and navigation must follow the same unsaved-change policy.

## Acceptance criteria

- [x] The initial date is checked before the author begins writing into an unresolved date conflict.
- [x] An occupied date offers explicit Edit Existing, Append, and Cancel choices.
- [x] Changing dates cannot replace a dirty form without confirmation.
- [x] Only the latest date lookup may update authoring state; stale responses are ignored or cancelled.
- [x] A failed lookup preserves the current draft and exposes a recoverable error.
- [x] Date change, Cancel, browser navigation, and unload share one dirty-state definition.
- [x] Successful save resets the dirty baseline.
- [ ] Unit, component, and end-to-end tests cover conflict choices, stale responses, failed lookup, and leave protection. Unit/component coverage passed; E2E execution remains a release follow-up.

## Blocked by

None for implementation. Production rollout follows the #02 reconciliation gate; #03 is completed.

## Comments

Added a shared authoring draft guard, initial-date preflight, explicit Edit/Append/Cancel conflict handling, latest-lookup ownership, retry-safe failures, and consistent dirty-state protection across date changes, Cancel, route leave, and unload. Append now persists child Transactions and Alerts atomically.

Verification: authoring unit/component coverage, full `npm test`, typecheck, lint, and build passed. E2E execution was not part of this local verification pass.
