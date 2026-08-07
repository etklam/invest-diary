# Unify the Market Rotation 2W Comparison Date

Status: completed
Implementation: `c0a2ba7`
Type: AFK

## What to build

Make Market Rotation Snapshot generation and the Market Rotation Monitor use one canonical 2W Comparison Date for each Rank Scope. Persisted deltas, trend series, displayed metadata, and exports must all be derived from the same qualified snapshot sequence and comparison boundary.

The implementation must preserve the accepted rule that the comparison point is counted back by ten qualified snapshot dates within the same Rank Scope.

## Acceptance criteria

- [x] Snapshot generation resolves the comparison date against a sequence that includes the new snapshot date at the correct position.
- [x] Persisted rank, score, RSI, and performance deltas use the same comparison date returned by the monitor response.
- [x] The 2W trend series begins at that comparison date and normalizes its first available point to 100.
- [x] Comparison dates remain scoped independently to sectors, indexes, and core.
- [x] A seeded sequence of at least eleven qualified dates proves there is no off-by-one difference before and after persistence.
- [x] Dashboard rows, metadata, chart data, and exports remain internally reproducible from the same response.

## Blocked by

None - can start immediately

## Comments

Introduced one canonical qualified-date comparison window shared by snapshot persistence, monitor rows, metadata, trend data, and exports, eliminating the pre-persistence off-by-one boundary.

Verification: market-rotation regression suite, full `npm test`, typecheck, lint, and build passed.
