# API Reference

This document is the hand-written reference for the core authenticated and agent API surface. It is intentionally selective rather than an exhaustive route inventory. The checked-in OpenAPI artifact is generated at build time; the application does not ship Swagger UI.

Base path: `/api`

Authentication:

- Browser endpoints use auth cookies set by `/api/auth/login` and refreshed by `/api/auth/refresh`.
- Native clients may send `Authorization: Bearer <access JWT>` instead of cookies.
- Native auth is JSON-only and does not set cookies; the rotating refresh token
  is sent only to the native refresh/logout endpoints.
- Native login, refresh, and logout intentionally omit `Authorization`; this
  keeps refresh usable after access expiry and makes logout body-only.
- Agent endpoints use `Authorization: Bearer <api-key>` (or `x-api-key`).
- Credential resolution is fail-closed (ADR-0006): once an explicit credential (Authorization / x-api-key) is supplied, its failure is a `401` and never falls back to cookies; supplying more than one explicit credential is also a `401`.
- Error responses are JSON objects in the H3 wire shape (ADR-0007): machine-readable `data.code` (`MODULE_ACTION_REASON` naming) plus `data.requestId` for log correlation. Common statuses are `400` for validation errors, `401` for authentication failures, `404` for missing resources or ownership mismatches, and `429` for rate limits.

## Auth

### `POST /api/auth/register`

Creates a user account.

Request body:

```json
{
  "email": "user@example.com",
  "password": "password",
  "name": "User"
}
```

Responses:

- `200` account created. Registration does not create a browser session; the client redirects to login.
- `400` invalid input or duplicate account.
- `429` rate limited.

### `POST /api/auth/login`

Creates an authenticated browser session.

Request body:

```json
{
  "email": "user@example.com",
  "password": "password"
}
```

Responses:

- `200` login succeeded and auth cookies set.
- `400` invalid input.
- `401` invalid credentials.
- `429` rate limited.

### `GET /api/auth/me`

Returns the current authenticated user from the browser cookie session.

Responses:

- `200` current user payload.
- `401` unauthenticated.

### `POST /api/auth/refresh`

Refreshes the access-token cookie using the refresh-token cookie.

Responses:

- `200` access token refreshed.
- `401` refresh token missing, invalid, or expired.

### `POST /api/auth/logout`

Clears auth cookies and deletes the stored refresh token when present.

Responses:

- `200` logged out.

### `POST /api/auth/native/login`

Creates an independent native-client session. This endpoint returns tokens in
JSON and does not require or set authentication cookies.

Request body:

```json
{
  "email": "user@example.com",
  "password": "password",
  "deviceName": "Alice's iPhone"
}
```

The `data` response contains `accessToken`, `refreshToken`, their UTC expiry
instants, and the canonical user. Native clients store the refresh token in
platform secure storage and keep the access token in memory.

Responses:

- `200` native token pair issued.
- `400` invalid input.
- `401` invalid credentials.
- `429` IP or identity rate limited.

### `POST /api/auth/native/refresh`

Atomically rotates a native refresh token. Reusing a rotated token revokes that
device family but does not affect other device families.

```json
{ "refreshToken": "<native refresh JWT>" }
```

Responses:

- `200` replacement token pair issued.
- `401` token missing, invalid, expired, revoked, or replayed.
- `429` IP or token-identity rate limited.

### `POST /api/auth/native/logout`

Idempotently revokes the family containing the supplied native refresh token.

```json
{ "refreshToken": "<native refresh JWT>" }
```

Response: `200` even when that session is already absent or revoked.

Native client lifecycle:

1. Keep the access token in memory and the refresh token in iOS Keychain or
   Android Keystore (for example, `expo-secure-store`). Do not persist a
   plaintext refresh token in `AsyncStorage`.
2. On any `401` caused by an expired access token, allow only one native refresh
   request in flight per session. Other failed requests await that same promise.
3. Replace both tokens, retry each original request once, and clear local
   session state after a second `401` or an unrecoverable refresh failure.
4. Attempt native logout before deleting the local refresh token. If the
   network is unavailable, still clear local state.

The backend uses no refresh-token grace window: concurrent refresh calls with
the same old token are not a supported client strategy. A stale-token replay
revokes only its native token family; another device family remains valid.

### `POST /api/auth/logout-all`

Revokes all Web/native refresh sessions and increments `tokenVersion`, causing
existing access JWTs to fail on their next request. Cookie-authenticated callers
must provide the normal `csrf-token` cookie and matching `x-csrf-token` header;
verified Bearer callers are exempt from browser CSRF.

Responses:

- `200` all sessions revoked.
- `401` unauthenticated.
- `403` cookie transport failed CSRF validation.

Session lineage, replay, lost-response, issuer/audience, and the accepted
one-hour logout-one access-token window are frozen in ADR-0008.

## OpenAPI and generated client

The canonical Zod 4 schemas under [`lib/contracts/`](../lib/contracts/) are the
only source for the checked-in [OpenAPI 3.1 artifact](../openapi/openapi.json).
The registry covers the stable v1 auth, diary/review, thesis, trade-plan,
alert, stock, timeline, portfolio, and market paths. Legacy routes outside this
surface remain outside the v1 contract until they are explicitly added.

Run these commands after changing a canonical contract or registry entry:

```bash
npm run openapi:generate   # regenerate the spec and TypeScript transport types
npm run openapi:check      # fail if either checked-in artifact is stale
npm run client:smoke       # compile/runtime smoke for the named facade
```

`z.coerce.number()` query fields are documented as their real wire type
(`string`) with defaults, limits, and `x-wire-coerces-to` metadata. JSON body
schemas retain their canonical input shape. The generated
[`lib/api-client/generated.ts`](../lib/api-client/generated.ts) file is
runtime-free TypeScript; [`lib/api-client/index.ts`](../lib/api-client/index.ts)
adds only named methods (`api.diaries.list/get/review`, `api.stocks.get`, auth,
alerts, portfolio, trade plans, watchlist, and timeline) over `openapi-fetch`.
The facade accepts a normal `fetch` implementation and an optional
`getAccessToken()` provider; it has no Nuxt, Vue, cookie-jar, or DOM runtime
dependency.

All documented failures use the stable `ApiErrorResponse` envelope. Clients
should branch on HTTP status and `data.code`, not on `statusMessage`. New
breaking changes require `/api/v2/**` or a documented deprecation window;
adding optional fields or paths is compatible. Mobile releases may lag backend
deploys, so a breaking v1 change must not be deployed in place. Before merging a breaking change,
regenerate both artifacts, review the generated diff, update this reference,
and run the Forgejo `openapi:check`/client smoke gates. No production Swagger UI
or second DTO layer is introduced.

## Diaries

### `GET /api/diaries`

Lists diaries for the authenticated user.

Query parameters:

- `page` optional page number.
- `limit` optional page size.
- `search` optional text search.
- `dateFrom` and `dateTo` optional inclusive date filters in `YYYY-MM-DD` form.
- `sortBy` optional supported sort mode.
- `reviewStatus` optional review-status filter.

Defaults are `page=1`, `limit=20`, and `sortBy=date-desc`; `limit` is capped at
100. Unknown parameters are rejected. The former undocumented `days` filter is
removed and returns `400` rather than silently changing the result set. Every
sort includes `id` as a deterministic tie-breaker.

Responses:

- `200` `{ data, pagination: { page, limit, total, totalPages } }`.
- `400` invalid or unknown query parameter.
- `401` unauthenticated.

### `POST /api/diaries`

Creates a diary entry.

Request body:

```json
{
  "title": "Trading journal",
  "content": "Markdown content",
  "date": "2026-05-01",
  "tags": ["trade"],
  "transactions": [{
    "symbol": "AAPL",
    "type": "BUY",
    "quantity": "2.5",
    "price": "180.25",
    "tradeDate": "2026-05-01T13:30:00.000Z"
  }]
}
```

Responses:

- `201` diary saved.
- `400` invalid input.
- `401` unauthenticated.

### `GET /api/diaries/by-date?date=YYYY-MM-DD`

Returns the diary for a local date.

Responses:

- `200` diary payload or null-like result.
- `400` missing or invalid date.
- `401` unauthenticated.

### `GET /api/diaries/{id}`

Returns one diary owned by the authenticated user.

Responses:

- `200` diary detail.
- `401` unauthenticated.
- `404` not found.

### `PUT /api/diaries/{id}`

Updates a diary and synchronizes its transaction list.

Request body accepts diary fields such as `title`, `content`, `date`, `tags`, and `transactions`.
The runtime contract is strict and uses `tradeDate`, `triggerAt`, and
`recurringMode`; the former snake-case aliases are not accepted.

Responses:

- `200` diary updated.
- `400` invalid input.
- `401` unauthenticated.
- `404` not found.

Diary `date` is always a calendar date (`YYYY-MM-DD`). `createdAt`, `updatedAt`,
`reviewDueAt`, `reviewedAt`, transaction `tradeDate`, and alert `triggerAt` are
UTC RFC 3339 instants ending in `Z`. All public and nested IDs are decimal
strings, and Decimal values are JSON strings.

### `GET|PATCH /api/diaries/{id}/review`

Returns or updates the Diary's single current decision post-mortem. PATCH
accepts one outcome (`INTACT`, `PARTIAL`, `INVALIDATED`, `UNCLEAR`) plus at least
one non-empty reflection. Saving moves the Diary to `reviewed`; another PATCH
edits the same post-mortem rather than creating history. A legacy reviewed row
may validly have a null outcome. Thesis reviews remain a separate resource and
lifecycle.

Responses: `200`, `400`, `401`, and owner-collapsed `404`.

### `DELETE /api/diaries/{id}`

Deletes one diary owned by the authenticated user.

Responses:

- `200` diary deleted.
- `401` unauthenticated.
- `404` not found.

## Thesis and Company Hub

### `GET /api/stocks/{symbol}/hub`

Returns the owner-scoped Company Hub projection, including the current thesis,
recent thesis reviews, notes, evidence, related Diaries, and position state.
Nested IDs are decimal strings; Diary dates are `YYYY-MM-DD`; event timestamps
are UTC instants. Position values are an explicitly bounded display projection
and therefore use JSON numbers; persisted Decimal resources such as Trade Plan
and Price Alert thresholds remain JSON strings.

Responses: `200`, `401`, `404`.

### `GET|PUT /api/stocks/{symbol}/thesis`

`GET` returns the current thesis and at most 100 recent reviews. `limit` is an
optional query parameter from 1 to 100. `PUT` replaces the current projection;
`ACTIVE` requires both `summary` and `whyIOwnIt`.

Responses: `200`, `400`, `401`, `404`, and `409` where applicable.

### `POST /api/stocks/{symbol}/thesis/reviews`

Appends an immutable Thesis Review snapshot. Public API has no update route for
historical reviews.

Responses: `200`, `400`, `401`, `404`, and `409` where applicable.

## Trade Plans

### `GET|POST /api/trade-plans`

Lists or creates owner-scoped Trade Plans. List queries use the offset envelope
`{ data, pagination }`, default to `page=1`, `limit=20`, cap `limit` at 100,
and add an ID tie-breaker to every supported sort. Decimal fields are JSON
strings and linked Diary dates are calendar dates.

Responses: `200`, `400`, `401`, `404`, and `409` where applicable.

### `GET|PUT /api/trade-plans/{id}`

Reads or updates one owner-scoped Trade Plan. Ownership mismatches are collapsed
to `404` with `TRADE_PLAN_NOT_FOUND`.

## Alerts

### `GET|POST /api/alerts`

Lists active Diary Alerts or creates one. `recurringMode` is `WEEK` or `MONTH`;
the public request uses camelCase fields (`diaryId`, `triggerAt`,
`recurringMode`). Active lists are bounded to 100 items and ordered
deterministically.

### `PUT /api/alerts/{id}/dismiss`

Dismisses an owned Diary Alert. Ownership mismatches use `ALERT_NOT_FOUND`.
For a recurring root, dismissal is series-wide and prevents all materialized
future instances from appearing in active lists or being pushed by the
scheduler. Dismissing a child dismisses only that instance.

### `GET|POST /api/stocks/alerts`

Lists or creates Price Alerts. The bounded list is capped at 100 items; IDs are
strings and `threshold` is a decimal string on responses.

### `PUT|DELETE /api/stocks/alerts/{id}`

Updates or deletes an owned Price Alert. Trigger state must be updated as a
consistent pair: `isTriggered=true` requires a non-null `triggeredAt`, while
clearing a trigger sends both `isTriggered=false` and `triggeredAt=null`.

## Portfolio and Market

### `GET /api/stocks/holdings`

Returns transaction-derived holdings for the authenticated user.

### `GET /api/stocks/portfolio`

Returns the valuation projection, including holdings, quote coverage/errors and
explicit `valuationStatus`. Quote failures do not erase persisted holdings.

### `GET /api/portfolio/attention`

Returns up to 50 deterministic attention items with valuation coverage and
`asOf`; it is owner-scoped and requires authentication.

### Mobile transport note

React Native may use the generated client with ordinary `fetch`. REST is the
source of truth. Socket.IO is optional foreground freshness signaling; a
disconnect or background suspension must be followed by REST refetch rather
than treated as a data-loss signal. Push notifications and background socket
delivery are outside the v1 contract.

### `GET /api/investment-activity`

Returns the merged feed as `{ data, pagination: { nextCursor, hasMore, asOf } }`.
`limit` is 1–50, cursors are opaque, and a malformed or mismatched cursor
returns `400` with `INVALID_CURSOR`. Diary `occurredAt` values are calendar
dates; all other event timestamps are UTC instants.

### `GET /api/market/rotation-monitor`

Returns the persisted Market Rotation projection. `scope` defaults to `sectors`;
no live Yahoo request is made by this endpoint.

### `GET /api/market/state/snapshot` and `/api/market/state/history`

Return the latest or bounded historical Market State projections. History
accepts `days=1..365`; trading dates are `YYYY-MM-DD`.

## API Keys

### `GET /api/api-keys`

Lists API keys for the authenticated user. Secret key material is not returned after creation.

Responses:

- `200` API key metadata list.
- `401` unauthenticated.

### `POST /api/api-keys`

Creates an API key for agent usage.

Request body:

```json
{
  "label": "Local agent",
  "scope": "AGENT_WRITE"
}
```

Responses:

- `200` API key created. The response includes the one-time plaintext key.
- `400` invalid label or scope.
- `401` unauthenticated.

### `DELETE /api/api-keys/{id}`

Revokes an API key owned by the authenticated user.

Responses:

- `200` API key deleted.
- `401` unauthenticated.
- `404` not found.

## Agent

Agent endpoints require `Authorization: Bearer <api-key>`.

### `POST /api/agent/diaries`

Creates a diary through an API key with `DIARY_CREATE` or `AGENT_WRITE` scope. `appendToToday` is rejected for API-key diary creation.

Request body:

```json
{
  "title": "Agent note",
  "content": "Markdown content",
  "date": "2026-05-01",
  "tags": ["agent"]
}
```

Responses:

- `200` diary created or appended.
- `400` invalid input.
- `401` missing, revoked, or insufficient API key.

### `GET /api/agent/stocks/watchlist`

Returns watched stock symbols available to the agent.

Responses:

- `200` watchlist items.
- `401` missing, revoked, or insufficient API key.

### `POST /api/agent/stocks/records`

Writes stock timeline records for watched symbols using an `AGENT_WRITE` key. Repeated records are idempotently upserted by `symbol` and `idempotencyKey`; records for symbols outside the user's watchlist are skipped.

Request body:

```json
{
  "records": [
    {
      "symbol": "AAPL",
      "summary": "Earnings call highlighted margin expansion.",
      "sourceType": "ARTICLE",
      "sourceTitle": "Market note",
      "sourceUrl": "https://example.com/aapl-note",
      "idempotencyKey": "ana:aapl:2026-05-01",
      "occurredAt": "2026-05-01T00:00:00.000Z",
      "confidence": 82
    }
  ]
}
```

Responses:

- `200` records saved.
- `400` invalid input.
- `401` missing, revoked, or insufficient API key.

## Stocks

### `GET /api/stocks/holdings`

Returns holdings derived from diary transactions.

Responses:

- `200` current holdings.
- `401` unauthenticated.

### `POST /api/stocks/prices`

Fetches prices for submitted symbols.

Request body:

```json
{
  "symbols": ["AAPL", "TSLA"]
}
```

Responses:

- `200` symbol-to-price result.
- `400` invalid symbols.
- `401` unauthenticated.

### `GET /api/stocks/timeline`

Lists stock timeline records for the authenticated user.

Query parameters:

- `symbol` optional symbol filter.
- `limit` optional result limit.

Responses:

- `200` timeline records.
- `401` unauthenticated.

### `GET /api/stocks/{symbol}/timeline`

Lists timeline records for one normalized stock symbol.

Responses:

- `200` symbol timeline records.
- `401` unauthenticated.

### `GET|POST /api/stocks/{symbol}/notes`

Lists or creates stock notes. List responses use the v1 offset envelope
`{ data, pagination }` with `page=1`, `limit=20`, a maximum `limit=100`, and
deterministic date/ID ordering.

### `PUT|DELETE /api/stocks/{symbol}/notes/{id}`

Updates or deletes an owned user-created note. The path symbol must match the
note's stored stock; mismatches are `404` with `STOCK_NOTE_NOT_FOUND`.

### `GET /api/stocks/watchlist`

Lists watchlist items.

Responses:

- `200` watchlist items.
- `401` unauthenticated.

### `POST /api/stocks/watchlist`

Adds a stock symbol to the watchlist.

Request body:

```json
{
  "symbol": "AAPL"
}
```

Responses:

- `200` watchlist item created.
- `400` invalid or duplicate symbol.
- `401` unauthenticated.

### `PATCH /api/stocks/watchlist/{id}`

Updates a watchlist item, such as status or sort order.

Responses:

- `200` watchlist item updated.
- `400` invalid input.
- `401` unauthenticated.
- `404` not found.

### `DELETE /api/stocks/watchlist/{id}`

Archives a stock from the watchlist by setting its status to `ARCHIVED`.

Responses:

- `200` watchlist item archived.
- `401` unauthenticated.
- `404` not found.

## Dependency Note

Phase 4 only allowed a low-risk `shiki` upgrade attempt. Recomputing the lockfile for `shiki@^4.0.2` produced broad transitive churn, so the dependency range was left at `^3.23.0` and larger framework/editor upgrades were intentionally left untouched.
