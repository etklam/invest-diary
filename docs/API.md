# API Reference

This document is the hand-written API contract for the Phase 4 priority surface. It intentionally does not use Swagger/OpenAPI runtime dependencies.

Base path: `/api`

Authentication:

- Browser endpoints use auth cookies set by `/api/auth/login` and refreshed by `/api/auth/refresh`.
- Agent endpoints use `Authorization: Bearer <api-key>`.
- Error responses are JSON objects. Common statuses are `400` for validation errors, `401` for authentication failures, `404` for missing resources, and `429` for rate limits.

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

- `200` account created and auth cookies set.
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

## Diaries

### `GET /api/diaries`

Lists diaries for the authenticated user.

Query parameters:

- `page` optional page number.
- `limit` optional page size.
- `search` optional text search.
- `tag` optional tag filter.

Responses:

- `200` paginated diary list.
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
  "transactions": []
}
```

Responses:

- `200` diary saved.
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

Responses:

- `200` diary updated.
- `400` invalid input.
- `401` unauthenticated.
- `404` not found.

### `DELETE /api/diaries/{id}`

Deletes one diary owned by the authenticated user.

Responses:

- `200` diary deleted.
- `401` unauthenticated.
- `404` not found.

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
