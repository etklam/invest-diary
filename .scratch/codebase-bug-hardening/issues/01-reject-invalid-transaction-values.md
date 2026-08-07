# Reject Invalid Transaction Values

Status: completed
Implementation: `c0a2ba7`
Type: AFK

## What to build

Protect the Transaction ledger from quantities and prices that cannot represent a real trade. Diary authoring must reject zero, negative, non-finite, or otherwise invalid Transaction values consistently in the form and at the authoritative server boundary. A rejected Transaction must not change holdings or persist partial data.

The completed slice includes reliable Transaction editor tests that assert behavior through translated, rendered controls rather than stale literal text assumptions.

## Acceptance criteria

- [x] BUY and SELL quantities must be finite numbers greater than zero.
- [x] Transaction prices must be finite numbers greater than zero.
- [x] Invalid values produce structured field-level validation errors and an HTTP 400 response.
- [x] A rejected request creates or updates neither the Diary nor its Transactions.
- [x] Ledger calculations cannot turn a negative SELL into an increased holding.
- [x] Unit, component, API, and persistence tests cover zero, negative, non-numeric, and valid fractional values.
- [x] The Transaction editor regression tests run successfully with the application's localization and shared-button dependencies.

## Blocked by

None - can start immediately

## Comments

Implemented authoritative validation in the shared Diary write path and client Transaction editor. Invalid values are rejected before persistence, with structured field errors and regression coverage for fractional, zero, negative, and non-finite inputs.

Verification: targeted tests, full `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build` passed.
