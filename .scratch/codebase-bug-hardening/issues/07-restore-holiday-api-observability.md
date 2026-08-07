# Restore Holiday API Observability and Type Safety

Status: completed
Implementation: `c0a2ba7`
Type: AFK

## What to build

Restore the Holiday API's logger contract so an unexpected upstream payload produces a meaningful structured warning and the repository typecheck gate succeeds. The existing graceful external-service failure behavior must remain unchanged for users.

## Acceptance criteria

- [x] The warning message is emitted as the logger message and year/country information is emitted as structured context.
- [x] Non-array upstream payloads still return the established external-service error response.
- [x] Successful Holiday responses are unaffected.
- [x] A focused handler test asserts both the response behavior and structured warning arguments.
- [x] The repository typecheck command and its test-suite guard exit successfully.

## Blocked by

None - can start immediately

## Comments

Restored structured logger usage for unexpected upstream Holiday payloads without changing the public error behavior.

Verification: focused Holiday API tests, full `npm test`, typecheck, lint, and build passed.
