# ADR-0008: Native Session Lifecycle

Status: Accepted

Date: 2026-09-01

## Context

The Web client uses HttpOnly access and refresh cookies. Its refresh token is
intentionally stable so concurrent browser tabs cannot invalidate one another.
A native client cannot depend on a browser cookie jar and needs deterministic
rotation, replay containment, and per-device logout semantics.

## Decision

- Web sessions retain the existing stable `clientType=WEB` refresh behavior.
- Native login returns an access/refresh pair in JSON and persists only the
  SHA-256 refresh-token digest. It does not set authentication cookies.
- Every native login creates a new random family. A device label is display
  metadata only and is never an authentication boundary.
- Native refresh performs A→B rotation in one database transaction: revoke A,
  create B, and link both rows through parent/replacement identifiers.
- Reuse of a rotated token revokes all still-active tokens in that family only.
  Other device families remain valid. There is no grace period.
- Native logout is idempotent and revokes the supplied token's family. Logout
  all increments `User.tokenVersion` and revokes every active refresh row.
- Access JWTs deliberately have no session/family (`sid`) claim in v1. A
  logout-one therefore cannot invalidate an already issued access token; it may
  remain usable for at most the one-hour access lifetime. Logout-all increments
  `tokenVersion`, so all existing access JWTs fail on their next request.
- Lost refresh responses are fail-closed: after the server commits A→B, losing
  B requires login again. Retrying A is treated as replay and revokes the family.
- JWTs use issuer `invest-diary`, audience `invest-diary-api`, and HS256. The
  repository placeholder secret is a startup error.
- Cookie-authenticated state changes use the double-submit CSRF policy. Verified
  Bearer/API-key requests bypass browser CSRF. Public login/register and
  refresh-token bootstrap endpoints are exact-path exemptions; `/logout-all`
  is not exempt when authenticated by cookie.
- Native login reuses the bounded login IP and normalized-email rate limits.
  Native refresh is bounded by IP and a non-reversible token-hash prefix key.

## Consequences

Native clients must serialize refresh attempts (single flight), retry the
original request once after a successful refresh, and return to login after a
second 401. The v1 design accepts the one-hour logout-one access-token window;
adding `sid` plus an access-session lookup is a future breaking/security tradeoff,
not an undocumented behavior change.
