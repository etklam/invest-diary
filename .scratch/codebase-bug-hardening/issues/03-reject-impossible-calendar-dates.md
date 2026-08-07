# Reject Impossible Calendar Dates

Status: completed
Implementation: `c0a2ba7`
Type: AFK

## What to build

Introduce one strict calendar-date contract for Diary write, lookup, and range filtering. Inputs that have the expected shape but do not exist on the calendar must be rejected rather than silently rolling into another month.

Valid dates continue to normalize to the existing storage representation, so the change tightens validation without changing user-visible date semantics.

## Acceptance criteria

- [x] Date parsing verifies that the normalized year, month, and day exactly match the submitted values.
- [x] Impossible dates such as February 31 and April 31 return a structured HTTP 400 validation response.
- [x] Leap-day input is accepted only in leap years.
- [x] Diary create, update, by-date lookup, and date-range filtering share the same strict contract.
- [x] Invalid input never reads from or writes to a rolled-over date.
- [x] Unit and API tests cover leap years, month boundaries, malformed values, and valid dates.

## Blocked by

None - can start immediately

## Comments

Implemented one strict Gregorian YMD contract for Diary writes, by-date lookups, and range filters while preserving the existing UTC-noon storage representation.

Verification: date normalization and Diary API tests, full `npm test`, typecheck, lint, and build passed.
