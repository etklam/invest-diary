# Current Backend Ready v1

Last reviewed: **2026-09-05**

> **React Native / Expo Backend Readiness: READY**

Current readiness score: **10/10 for the defined Backend Ready v1 scope**.
Phase 2 items below are intentionally non-blocking scope decisions.

No backend blockers remain for starting React Native / Expo development. This
document is current-only; the preceding audit is preserved in
[`archive/backend-readiness-2026-09-01.md`](archive/backend-readiness-2026-09-01.md)
and must not be used as current status.

## Scope and support boundary

The supported production path is **K3s + MariaDB 11.4**. Prisma continues to
use its `mysql` provider name. The stable v1 API is the existing `/api/**`
surface; breaking changes use a deprecation window or a future `/api/v2/**`
surface. Mobile releases may lag backend deploys, so v1 breaking changes must
not be deployed in place. No `/api/v1/**` duplicate route tree is planned.

The backend remains a modular Nuxt/Nitro monolith. The existing process-local
WebSocket broadcaster and market-data cache, one active scheduler/realtime
instance in K3s, and direct batch-domain reuse are intentional. Redis, BullMQ,
distributed locks, microservices, GraphQL, and a new repository layer are not
required for this readiness decision.

## Current readiness matrix

| Area | Status | Evidence / client contract |
| --- | --- | --- |
| Native auth | Ready | JSON login, rotating refresh, native logout, Bearer access JWT |
| Refresh rotation | Ready | Token family, lineage, replay detection, concurrent DB claim |
| Bearer resource auth | Ready | Fail-closed `Authorization: Bearer …` on authenticated APIs |
| CSRF compatibility | Ready | Verified Bearer/API-key mutations bypass browser CSRF; cookies do not |
| Contracts | Ready | Runtime Zod schemas are the source for public wire shapes |
| OpenAPI / generated client | Ready | OpenAPI 3.1 artifact, drift check, generated transport, named facade |
| BigInt / Decimal | Ready | IDs are decimal strings; persisted Decimal values are strings |
| Date / time | Ready | Calendar Date `YYYY-MM-DD`; Instants are UTC RFC 3339 `Z` |
| Errors | Ready | HTTP status + `data.code` + `data.requestId`; no message matching |
| Pagination | Ready | Bounded diary, timeline, notes, trade-plan, review, alert and watchlist lists |
| Realtime | Ready for foreground use | Socket.IO Bearer handshake; REST remains the source of truth |
| Push notifications | Phase 2 | FCM/APNs/Expo Push are not part of backend v1 |
| Offline sync | Client concern / Phase 2 | GET caching is allowed; writes require connectivity |
| File/media upload | Outside RN v1 scope | No upload, avatar, or attachment contract is required to start |

## Native auth contract

Canonical endpoints are present in the registry, checked-in OpenAPI, generated
transport, and named facade:

```text
POST /api/auth/native/login    → JSON access/refresh pair
POST /api/auth/native/refresh  → rotate refresh token A → B
POST /api/auth/native/logout   → idempotent current-family revoke
POST /api/auth/logout-all      → revoke all user sessions
GET  /api/auth/me              → authenticated user
```

Native requests use ordinary `fetch` and `Authorization: Bearer <access JWT>`.
They do not need a browser cookie jar, `document.cookie`, CSRF token, Nuxt
`$fetch`, Vue composables, or DOM runtime APIs. The thin facade in
[`lib/api-client/index.ts`](../lib/api-client/index.ts) exposes both the
canonical nested methods (`auth.native.login/refresh/logout`) and the original
flat aliases, with an optional `getAccessToken()` provider for per-request
Bearer injection. Login, refresh, and native logout intentionally omit that
header; `logout-all` is an authenticated Bearer operation. The facade is not a
React state or storage layer.

The refresh token is rotating and has no grace window. A native client must
enforce one refresh request in flight per session:

```text
request
  ↓ 401 AUTH_TOKEN_EXPIRED
refresh promise exists? ── yes → await it
  │
  no → create one native refresh request
       replace access + refresh tokens
  ↓
retry the original request once
  ↓
second 401 → clear the local session and require login
```

The framework-neutral `createSingleFlightRefresh()` helper and the native
fetch smoke test lock this client-side coordination contract. A stale refresh
token is a replay: the matching family is revoked, while another device family
remains usable. A logout request should be attempted before local token
deletion; if the network is unavailable, the client still clears local state
and the server token expires or is cleaned up later.

## Secure storage and lifecycle

- Keep the access token in memory where practical.
- Keep the refresh token in iOS Keychain / Android Keystore, for example via
  `expo-secure-store`; do not put a refresh token in plaintext `AsyncStorage`.
- On app relaunch, read the secure refresh token, call native refresh, then
  restore the in-memory access token and refetch REST data.
- On foreground/resume, refresh if the access token is expired or near expiry,
  then refetch the relevant REST resources.
- WebSocket disconnects do not imply data loss. Background delivery is not
  guaranteed; foreground REST refetch is the correctness path.

## Representative mobile API matrix

| Feature | API | Auth | Contract | RN status |
| --- | --- | --- | --- | --- |
| Login | `/auth/native/login` | None | Canonical JSON pair | Ready |
| Session restore | `/auth/native/refresh` | Refresh body | Rotation/replay contract | Ready |
| Current user | `/auth/me` | Bearer | Canonical user schema | Ready |
| Diary list/detail | `/diaries`, `/diaries/{id}` | Bearer | Bounded pagination, string IDs | Ready |
| Diary create/edit | `/diaries`, `/diaries/{id}` | Bearer | Canonical write schemas | Ready |
| Quick diary | Diary create | Bearer | Same public Diary contract | Ready |
| Timeline/activity | `/investment-activity`, `/stocks/timeline` | Bearer | Cursor/bounded list | Ready |
| Stocks | `/stocks/{symbol}/hub`, timeline | Bearer | Symbol and wire schemas | Ready |
| Watchlist | `/stocks/watchlist` | Bearer | Bounded list and mutation schema | Ready |
| Alerts | `/alerts`, `/stocks/alerts` | Bearer | Bounded response and machine errors | Ready |
| Portfolio | `/stocks/holdings`, `/stocks/portfolio`, `/portfolio/attention` | Bearer | Bounded projection | Ready |
| Market | `/market/*` | As defined per endpoint | Canonical market contracts | Ready |

## Realtime, media, rate limits, and offline policy

Socket.IO accepts an access token through the handshake `auth.token` or
`Authorization: Bearer …`, authenticates it before room registration, and
emits user-scoped alert events. React Native may use `socket.io-client` while
foregrounded. WebSocket is a freshness hint only; REST is the source of truth.

React Native v1 has no required file/media upload, avatar, attachment, or file
import workflow. Multipart support is therefore intentionally outside scope.

Native login is **existing-user login only** for v1. If a product flow needs
signup, it may call the existing `/auth/register` contract and then perform
native login; no `/auth/native/register` endpoint is needed.

Auth limits are deliberately bounded: login is five attempts per minute per IP
and identity; native refresh is ten per minute per IP and token identity;
registration is three per minute per IP and identity. The server accepts IPv4
or IPv6 socket addresses and only trusts the last `X-Forwarded-For` value when
the deployment explicitly enables `TRUST_X_FORWARDED_FOR` behind an append-mode
trusted proxy. Clients should treat `429` and `data.code ===
AUTH_RATE_LIMITED` as the retry signal. `Retry-After` is not a promised header
in this v1 contract; current retry guidance is carried in the error details.

The server remains canonical. Clients may cache GET responses locally, but
mutations require connectivity and no offline sync engine or global mutation
idempotency layer is part of v1. All mobile-facing list contracts are bounded;
the merged activity feed uses a cursor plus `hasMore` and `asOf` snapshot.

## Verification commands

The executable CI contract is [`.forgejo/workflows/build.yml`](../.forgejo/workflows/build.yml).
The following are the required readiness gates:

```bash
npm run lint
npm run typecheck
npm run typecheck:tests
npm test -- --reporter=dot
npm run openapi:check
npm run openapi:breaking
npm run client:smoke
npm run test:native-client
npm run test:backend-http:mariadb
npm run test:diary-reconciliation:mysql
npm run test:socketio
```

The MariaDB reconciliation harness is safe in both a plain host and a
Docker-outside-of-Docker Forgejo runner: it shares the job container network
namespace when possible, otherwise uses a dynamically mapped loopback port,
and always checks MariaDB 11.4, the disposable database name, readiness, and
trap cleanup.

## Non-blocking Phase 2

- Push notifications through FCM/APNs/Expo Push.
- Deeper client-side offline caching or sync policy.
- Optional file/media upload if a future mobile product scope requires it.
- Mobile-only aggregation or performance optimisations after real device
  profiling demonstrates a need.

No backend architecture rewrite is required before Expo work begins.
