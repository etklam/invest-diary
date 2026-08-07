# Create Independent Refresh Sessions

Status: completed
Implementation: `c0a2ba7`
Type: AFK

## What to build

Ensure every successful login creates a distinct refresh session, even when the same account logs in more than once within the same second. Logging out one browser or device must revoke only that session and must not prevent another active session from refreshing later.

Existing token-version invalidation for password or security changes must continue to revoke all affected sessions when intentionally requested.

## Acceptance criteria

- [x] Consecutive or parallel logins for the same user always receive different refresh credentials.
- [x] Refresh credentials contain or derive from a cryptographically random per-session identifier.
- [x] Stored refresh sessions remain independently addressable and revocable.
- [x] Logging out session A does not invalidate session B.
- [x] Token-version changes still invalidate all earlier access and refresh sessions as designed.
- [x] Authentication tests freeze time and cover parallel login, isolated logout, refresh, expiry, and replay rejection.

## Blocked by

None - can start immediately

## Comments

Refresh tokens now carry a cryptographically random per-session JTI, and refresh-session uniqueness races are no longer handled by overwriting another session.

Verification: authentication regression tests, full `npm test`, typecheck, lint, and build passed.
