# Project Workflows

A grounded summary of how the Diary Vue project currently works — what each
feature does, the main files involved, related tests, and known gotchas.
Companion to [`../CLAUDE.md`](../CLAUDE.md) (architecture rules) and
[`../CONTEXT.md`](../CONTEXT.md) (domain language). For test details see
[`TESTING.md`](TESTING.md).

> Conventions: file paths are repo-relative. References like `path:LINE` point
> at function definitions or key blocks. Anything marked
> **Needs verification** could not be fully confirmed from source at the time
> of writing.

---

## 1. Product Scope

Diary Vue is a single-tenant personal investment diary platform. End-user
surface area today:

- **Investment diary** with markdown content, tags, structured review fields,
  optional `Transaction` rows, and related `Alert`s
- **Stock watchlist & research** — watchlist CRUD, per-symbol
  `StockNote` (mutable thesis) and `StockTimelineRecord` (immutable events),
  price quotes via Yahoo Finance, price alerts
- **ETF watchlist & research** — pure research side; completely separated from
  stocks (ADR-0002). ETF profile aggregator pulls quote, risk, relative
  strength, valuation
- **Market Rotation Monitor** — persisted daily OHLCV → rotation snapshots
  (rank scopes: sectors, indexes, core), with deterministic summary text and
  2W comparison enrichment
- **Market state** — breadth/risk-on dashboard backed by `MarketBreadthDaily`
  and `MarketDailyPrice`
- **Blog / articles** — admin-only `Post` (DRAFT/PUBLISHED/ARCHIVED), public
  list + SSR article pages with markdown rendering
- **Alerts & reminders** — diary-linked recurring reminders (WEEK / MONTH
  modes) and price-condition alerts pushed via WebSocket
- **Partner compare** — bidirectional sharing with another user (human or AI
  agent), diary content shared, transactions/holdings private
- **Agent API** — API key-scoped ingestion endpoints for diary creation and
  stock timeline/notes
- **Tools** — standalone calculators (position sizing, FIRE, relative value,
  seasonality) under `pages/tools/`
- **Admin** — admin-only API for blog, ETF seed, market rotation batch
  trigger, users

Brand and design direction live in [`../PRODUCT.md`](../PRODUCT.md) and
[`../DESIGN.md`](../DESIGN.md).

### Main files

- [`prisma/schema.prisma`](../prisma/schema.prisma) — data model source of
  truth (currently ~650 lines)
- [`nuxt.config.ts`](../nuxt.config.ts) — Nuxt + PWA + i18n + mdx wiring
- [`package.json`](../package.json) — runtime + dev dependencies (Nuxt 4.3,
  Prisma 7.4, yahoo-finance2 3.14, jose 6, zod 4)

---

## 2. Authentication Workflow

Email + password login issues a JWT access token (1h) and a DB-backed refresh
token (30d), both as `httpOnly`, `sameSite=strict`, secure-in-production
cookies. The global auth middleware on `/api/**` validates the access token
and silently refreshes via the refresh token if needed. Refresh tokens are
SHA-256 hashed at rest; legacy plaintext rows are migrated on read. Password
change increments `User.tokenVersion`, invalidating all outstanding tokens.

CSRF-routed API-key mutations are explicitly exempted from the CSRF check.
Admin routes additionally require `role === 'ADMIN'` via
`server/middleware/admin.ts`.

### Main files

- [`server/api/auth/login.post.ts`](../server/api/auth/login.post.ts):20 —
  `loginSchema`, rate-limited login (IP + identity), bcrypt compare, token
  persistence
- [`server/api/auth/refresh.post.ts`](../server/api/auth/refresh.post.ts) —
  explicit refresh endpoint (rotation, legacy-token migration)
- [`server/api/auth/logout.post.ts`](../server/api/auth/logout.post.ts) —
  deletes stored refresh token + clears cookies
- [`server/api/auth/register.post.ts`](../server/api/auth/register.post.ts) —
  signup, returns same cookie shape as login
- [`server/api/auth/me.get.ts`](../server/api/auth/me.get.ts) — current user
  payload for the SPA
- [`server/middleware/auth.ts`](../server/middleware/auth.ts):11 — global
  `/api/**` auth and refresh-token recovery
- [`server/middleware/admin.ts`](../server/middleware/admin.ts):10 —
  `role === 'ADMIN'` gate for `/api/admin/**` and blog write routes
- [`server/utils/auth.ts`](../server/utils/auth.ts):11 — cookie helpers
  (`setAuthCookies`, `clearAuthCookies`) and `requireUser()`
- [`server/utils/auth-session.ts`](../server/utils/auth-session.ts):95 —
  `authenticateAccessToken`, `authenticateRefreshToken`, `hashToken`
- [`lib/jwt.ts`](../lib/jwt.ts) — token signing/verification via `jose`
- [`composables/useAuth.ts`](../composables/useAuth.ts),
  [`composables/useAuthRecovery.ts`](../composables/useAuthRecovery.ts),
  [`plugins/auth.ts`](../plugins/auth.ts) — client bootstrap

### Related tests

- [`tests/api/auth.test.ts`](../tests/api/auth.test.ts)
- [`tests/unit/server/auth.middleware.test.ts`](../tests/unit/server/auth.middleware.test.ts)
- [`tests/unit/server/admin.middleware.test.ts`](../tests/unit/server/admin.middleware.test.ts)
- [`tests/unit/server/auth.cookies.test.ts`](../tests/unit/server/auth.cookies.test.ts)
- [`tests/unit/server/phase2-auth-contracts.test.ts`](../tests/unit/server/phase2-auth-contracts.test.ts)
- [`tests/unit/lib/jwt.test.ts`](../tests/unit/lib/jwt.test.ts)
- [`tests/unit/composables/useAuth.test.ts`](../tests/unit/composables/useAuth.test.ts)
- [`tests/integration/auth-flow.test.ts`](../tests/integration/auth-flow.test.ts)

### Known gotchas

- Refresh token rows can be either SHA-256 hashed or legacy plaintext; reads
  check hash first, then plaintext, then upgrade in place. New logins always
  store the hash.
- `clearAuthCookies` also deletes the legacy `auth-token` cookie on two paths
  for backwards compatibility (`server/utils/auth.ts`:51).
- Access-token expiry during an active session is recovered transparently by
  the middleware, not by an explicit client call.

---

## 3. Diary Workflow

The core surface. A `Diary` has title + markdown `content` + `tagsString`, a
`date` (normalised to UTC noon), optional original-decision and structured-review
fields (`thesis`, `risk`, `execution`, `reviewDueAt`, `reviewStatus`,
`reviewedAt`, `reviewOutcome`, `reviewSummary`, `reviewLearning`,
`reviewAdjustment`),
nested `Transaction[]` (BUY/SELL, each linked back via `diaryId`), and
nested `Alert[]`. Create/update paths run through `diary-write.ts`, which
validates title + transactions, maps transactions via
`mapTransactionWriteData`, and persists alerts via `alert-persistence.ts`
(supports recurring parent + children). Reads go through `diary-read.ts`
(ownership-checked). List endpoints (`server/api/diaries.get.ts`,
`by-date.get.ts`) feed the timeline, calendar and quick-note UIs. Review
completion is owned by the focused `[id]/review` GET/PATCH contract. PATCH
requires a canonical outcome plus at least one meaningful reflection, and the
server writes `reviewStatus` and `reviewedAt`; generic Diary updates cannot mark
a review complete. Review text is owner-only and is excluded from Timeline and
Partner payloads (Timeline receives only the compact outcome).

### Main files

- [`server/api/diaries.get.ts`](../server/api/diaries.get.ts),
  [`server/api/diaries.post.ts`](../server/api/diaries.post.ts) — list +
  create
- [`server/api/diaries/[id].get.ts`](../server/api/diaries/[id].get.ts),
  [`server/api/diaries/[id].put.ts`](../server/api/diaries/[id].put.ts):9,
  [`server/api/diaries/[id].delete.ts`](../server/api/diaries/[id].delete.ts)
- [`server/api/diaries/by-date.get.ts`](../server/api/diaries/by-date.get.ts)
- [`server/api/diaries/[id]/review.get.ts`](../server/api/diaries/[id]/review.get.ts),
  [`server/api/diaries/[id]/review.patch.ts`](../server/api/diaries/[id]/review.patch.ts)
- [`server/utils/diary-review.ts`](../server/utils/diary-review.ts) — owner-only
  Review read model, validation, normalization and completion write
- [`server/api/reviews.get.ts`](../server/api/reviews.get.ts) — review queue
  using `lib/dates/user-tz.ts` half-open day range
- [`server/utils/diary-write.ts`](../server/utils/diary-write.ts):25 —
  `validateDiaryInput`, `mapTransactionWriteData`:65, `diffTransactions`:84,
  `createDiaryForUser`, `updateDiaryForUser`; transaction-changing updates and
  deletes validate the projected complete chronological user ledger first
- [`server/utils/diary-read.ts`](../server/utils/diary-read.ts):37 —
  `findDiaryForUser` (ownership-checked), `findDiaryByDate`:71
- [`server/utils/diary-response.ts`](../server/utils/diary-response.ts) —
  `attachDiaryTags` (parses `tagsString` into structured tags)
- [`server/utils/alert-persistence.ts`](../server/utils/alert-persistence.ts):5
  — `persistAlert`, `replaceAlerts`:59, `persistAlerts`:68
- [`lib/diary-tags.ts`](../lib/diary-tags.ts) — tag parse/stringify/normalise
- [`composables/useQuickNoteComposer.ts`](../composables/useQuickNoteComposer.ts),
  [`composables/useQuickNoteTemplates.ts`](../composables/useQuickNoteTemplates.ts),
  [`composables/useTimelineDiaries.ts`](../composables/useTimelineDiaries.ts),
  [`composables/useCalendar.ts`](../composables/useCalendar.ts)
- UI: [`pages/diaries/`](../pages/diaries), [`pages/timeline/`](../pages/timeline),
  [`pages/calendar.vue`](../pages/calendar.vue), [`pages/reviews/`](../pages/reviews)

### Related tests

- [`tests/api/diaries.test.ts`](../tests/api/diaries.test.ts)
- [`tests/api/diary-update-transactions.test.ts`](../tests/api/diary-update-transactions.test.ts)
- [`tests/api/reviews.test.ts`](../tests/api/reviews.test.ts)
- [`tests/unit/server/diary-write.test.ts`](../tests/unit/server/diary-write.test.ts)
- [`tests/unit/server/diary-read.test.ts`](../tests/unit/server/diary-read.test.ts)
- [`tests/unit/server/diaries-query.test.ts`](../tests/unit/server/diaries-query.test.ts)
- [`tests/unit/server/alert-persistence.test.ts`](../tests/unit/server/alert-persistence.test.ts)
- [`tests/integration/diary-workflow.test.ts`](../tests/integration/diary-workflow.test.ts)
- [`tests/e2e/diary-crud.spec.ts`](../tests/e2e/diary-crud.spec.ts)
- [`tests/e2e/quick-diary.spec.ts`](../tests/e2e/quick-diary.spec.ts)

### Known gotchas

- `createDiaryForUser` does **not** use `diffTransactions`; the diff path is
  update-only. Passing transactions with `id` on the create path would
  misclassify them. See CONTEXT.md (2026-05 §7).
- `findDiaryByDate` uses inclusive `gte`/`lte` on UTC day bounds, while
  `reviews.get.ts` uses `lib/dates/user-tz.ts` half-open `[start, end)`
  semantics in the user's timezone. These are different windows by design.
- BigInt diary ids are surfaced as strings only after `serialize()`. Internal
  logging must use `String(id)` (CLAUDE.md §2, §12).

---

## 4. Stock Workflow

Per-user stock watchlist → per-stock research surface. A watchlist entry
points to a canonical `Stock` row (auto-created via `ensureStockBySymbol`).
Each stock has `StockNote[]` (mutable thesis, created via WEB or AGENT) and
`StockTimelineRecord[]` (immutable events tagged with `sourceType` and
`idempotencyKey`). Transactions on diaries reference stock symbols but are
not FK-linked to `Stock`. Live quotes are fetched from Yahoo Finance via
`fetchQuote`, memoised by a shared cache (`lib/market-data/cache.ts`) with
TTL tiers for market hours / closed / max. The price-post endpoint batches
up to 25 symbols with bounded concurrency (3) and goes through a Yahoo
request queue that caps upstream concurrency at 2. Price alerts are polled
by the scheduler (see §7).

### Main files

- Watchlist:
  [`server/api/stocks/watchlist/index.get.ts`](../server/api/stocks/watchlist/index.get.ts),
  [`server/api/stocks/watchlist/index.post.ts`](../server/api/stocks/watchlist/index.post.ts),
  [`server/api/stocks/watchlist/[id].patch.ts`](../server/api/stocks/watchlist/[id].patch.ts),
  [`server/api/stocks/watchlist/[id].delete.ts`](../server/api/stocks/watchlist/[id].delete.ts)
- Notes:
  [`server/api/stocks/[symbol]/notes/index.get.ts`](../server/api/stocks/[symbol]/notes/index.get.ts),
  `index.post.ts`, `[id].put.ts`, `[id].delete.ts`
- Timeline:
  [`server/api/stocks/timeline.get.ts`](../server/api/stocks/timeline.get.ts),
  [`server/api/stocks/[symbol]/timeline.get.ts`](../server/api/stocks/[symbol]/timeline.get.ts)
- Prices: [`server/api/stocks/prices.post.ts`](../server/api/stocks/prices.post.ts):22
- Holdings: [`server/api/stocks/holdings.get.ts`](../server/api/stocks/holdings.get.ts)
- Price alerts:
  [`server/api/stocks/alerts/index.get.ts`](../server/api/stocks/alerts/index.get.ts),
  `index.post.ts`, `[id].delete.ts`
- Query layer:
  [`server/utils/stock-watchlist-queries.ts`](../server/utils/stock-watchlist-queries.ts):6
  (`ensureStockBySymbol`, `upsertStockWatchlistItem`:15, `listUserWatchlist`:49),
  [`server/utils/stock-timeline-queries.ts`](../server/utils/stock-timeline-queries.ts)
  (`createRecordsFromAgent`, `listTimeline`, `listTimelineBySymbol`),
  [`server/utils/price-alert-queries.ts`](../server/utils/price-alert-queries.ts)
  (`CreatePriceAlertSchema`, CRUD with ownership checks),
  [`server/utils/price-alert-condition.ts`](../server/utils/price-alert-condition.ts),
  [`server/utils/transaction-read.ts`](../server/utils/transaction-read.ts)
- Library:
  [`lib/yahoo-finance.ts`](../lib/yahoo-finance.ts) (`fetchQuote`,
  `fetchHistorical`),
  [`lib/market-data/cache.ts`](../lib/market-data/cache.ts)
  (`getOrSetCached`, `getMarketDataCacheTtlSeconds`,
  `buildMarketQuoteCacheKey`, `shouldBypassCache`),
  [`lib/market-data/yahoo-request-queue.ts`](../lib/market-data/yahoo-request-queue.ts)
  (`runYahooRequest`, concurrency cap = 2),
  [`lib/stocks/symbols.ts`](../lib/stocks/symbols.ts) (`normalizeStockSymbol`),
  [`lib/stocks-analytics.ts`](../lib/stocks-analytics.ts),
  [`lib/recurring-alerts.ts`](../lib/recurring-alerts.ts)
- UI: [`pages/stocks/`](../pages/stocks)

### Related tests

- [`tests/api/stocks-watchlist.test.ts`](../tests/api/stocks-watchlist.test.ts)
- [`tests/api/stocks-prices.test.ts`](../tests/api/stocks-prices.test.ts)
- [`tests/api/stocks-timeline.test.ts`](../tests/api/stocks-timeline.test.ts)
- [`tests/api/stock-notes.test.ts`](../tests/api/stock-notes.test.ts)
- [`tests/api/stock-tracking.test.ts`](../tests/api/stock-tracking.test.ts)
- [`tests/api/stocks-alerts.test.ts`](../tests/api/stocks-alerts.test.ts)
- [`tests/unit/stock-watchlist-queries.test.ts`](../tests/unit/stock-watchlist-queries.test.ts)
- [`tests/unit/stock-timeline-queries.test.ts`](../tests/unit/stock-timeline-queries.test.ts)
- [`tests/unit/server/price-alert-queries.test.ts`](../tests/unit/server/price-alert-queries.test.ts)
- [`tests/unit/server/transaction-read.test.ts`](../tests/unit/server/transaction-read.test.ts)
- [`tests/unit/server/market-quote-api.test.ts`](../tests/unit/server/market-quote-api.test.ts)
- [`tests/unit/lib/yahoo-request-queue.test.ts`](../tests/unit/lib/yahoo-request-queue.test.ts)
- [`tests/unit/lib/market-data-cache.test.ts`](../tests/unit/lib/market-data-cache.test.ts)
- [`tests/unit/lib/symbol-normalization.test.ts`](../tests/unit/lib/symbol-normalization.test.ts)
- [`tests/unit/lib/stocks-symbols.test.ts`](../tests/unit/lib/stocks-symbols.test.ts)
- [`tests/e2e/stock-tracking.spec.ts`](../tests/e2e/stock-tracking.spec.ts)

### Known gotchas

- Yahoo Finance has undocumented per-IP rate limits. The Yahoo request queue
  caps concurrency at 2 and the prices endpoint caps handler-level
  concurrency at 3 — exceeding these consistently triggers Yahoo 429s
  (`server/api/stocks/prices.post.ts`:20).
- Quote cache TTLs are tier-based (`TTL_QUOTE_MARKET_HOURS`,
  `TTL_MARKET_DATA_MAX`); batch jobs that need fresh data should call
  `shouldBypassCache` or skip cache explicitly.
- Transactions are not FK-linked to `Stock`; they only carry a `symbol`
  string. Cross-referencing relies on case-insensitive match after
  `normalizeStockSymbol`.

---

## 5. ETF / Market Rotation Workflow

ETF side is pure research — no personal transactions. `Etf` rows are managed
through the admin surface, while each user can maintain an ETF watchlist. The
current user-facing research surface is the Market Rotation Monitor; the old
per-symbol ETF profile aggregator has been removed.

**Market Rotation Monitor** is the more complex subsystem. Canonical ETF
universe is defined in `lib/market-rotation/universe.ts` (sectors, indexes,
core rank scopes). A batch pipeline (`server/utils/market-rotation-batch.ts`)
fetches OHLCV (filling gaps from Yahoo), runs the pure-function snapshot
pipeline (`lib/market-rotation/pipeline.ts`), and upserts rows into
`market_rotation_snapshot` (unique on `rankScope + symbol + date`). The batch
is invokable via `POST /api/admin/market/rotation-batch` (admin only) or via
the K8s CronJob (see §11). Reads are handled by
`server/utils/market-rotation-monitor-queries.ts` and assembled into the
dashboard payload by `lib/market-rotation/monitor.ts`, with deterministic
summary text from `lib/market-rotation/summary.ts`.

Market state / breadth is a parallel subsystem driven by
`MarketBreadthDaily` and `MarketDailyPrice`. Breadth is computed by
`scripts/market-state/update-breadth.ts` and surfaced via
`/api/market/state/snapshot` and `/api/market/state/history`. CONTEXT.md
documents canonical labels and the deterministic mapping
(`risk_on`, `neutral`, `defensive`, `risk_off`, `unknown`).

### Main files

- ETF watchlist:
  [`server/api/etf/watchlist/index.get.ts`](../server/api/etf/watchlist/index.get.ts),
  `index.post.ts`, `[id].delete.ts`
- ETF admin:
  [`server/api/admin/etf/index.get.ts`](../server/api/admin/etf/index.get.ts),
  `index.post.ts`, `[id].delete.ts`, `[id]/initialize.post.ts`, `seed.post.ts`
- Market rotation public:
  [`server/api/market/rotation-monitor.get.ts`](../server/api/market/rotation-monitor.get.ts):39
- Market state public:
  [`server/api/market/state/snapshot.get.ts`](../server/api/market/state/snapshot.get.ts),
  [`server/api/market/state/history.get.ts`](../server/api/market/state/history.get.ts),
  [`server/api/market/historical.get.ts`](../server/api/market/historical.get.ts),
  [`server/api/market/spx-session.get.ts`](../server/api/market/spx-session.get.ts),
  [`server/api/market/quote/[symbol].get.ts`](../server/api/market/quote/[symbol].get.ts)
- Batch / queries:
  [`server/utils/market-rotation-batch.ts`](../server/utils/market-rotation-batch.ts)
  (`runFullBatch`, `BatchJobResult`),
  [`server/utils/market-rotation-queries.ts`](../server/utils/market-rotation-queries.ts)
  (`getHistoricalPrices`, `getComparisonDate`, `getComparisonSnapshots`,
  `upsertSnapshots`),
  [`server/utils/market-rotation-monitor-queries.ts`](../server/utils/market-rotation-monitor-queries.ts),
  [`server/utils/market-state-queries.ts`](../server/utils/market-state-queries.ts),
  [`server/utils/etf-watchlist-queries.ts`](../server/utils/etf-watchlist-queries.ts)
- Pure calculations:
  [`lib/market-rotation/pipeline.ts`](../lib/market-rotation/pipeline.ts)
  (`runSnapshotPipeline`, `SymbolPrices`),
  [`lib/market-rotation/calculations.ts`](../lib/market-rotation/calculations.ts),
  [`lib/market-rotation/snapshot-builder.ts`](../lib/market-rotation/snapshot-builder.ts),
  [`lib/market-rotation/indicators.ts`](../lib/market-rotation/indicators.ts),
  [`lib/market-rotation/signal.ts`](../lib/market-rotation/signal.ts),
  [`lib/market-rotation/state.ts`](../lib/market-rotation/state.ts),
  [`lib/market-rotation/breadth.ts`](../lib/market-rotation/breadth.ts),
  [`lib/market-rotation/monitor.ts`](../lib/market-rotation/monitor.ts),
  [`lib/market-rotation/summary.ts`](../lib/market-rotation/summary.ts),
  [`lib/market-rotation/trend-series.ts`](../lib/market-rotation/trend-series.ts)
  (`buildNormalizedTrendSeries`, no interpolation),
  [`lib/market-rotation/qualified-date.ts`](../lib/market-rotation/qualified-date.ts)
  (`filterQualifiedDates`, `pickComparisonDate`,
  `QUALIFICATION_THRESHOLD_RATIO = 0.9`, `COMPARISON_OFFSET = 10`),
  [`lib/market-rotation/round.ts`](../lib/market-rotation/round.ts)
  (`roundMetric`),
  [`lib/market-rotation/universe.ts`](../lib/market-rotation/universe.ts)
  (`getUniverseForScope`)
- CLI: [`scripts/market-rotation/run-batch.ts`](../scripts/market-rotation/run-batch.ts)
  (CronJob target),
  [`scripts/market-state/seed-universe.ts`](../scripts/market-state/seed-universe.ts),
  [`scripts/market-state/update-breadth.ts`](../scripts/market-state/update-breadth.ts)
- UI: [`pages/tools/`](../pages/tools) (Market Rotation Monitor view)

### Related tests

- [`tests/api/etf-watchlist.test.ts`](../tests/api/etf-watchlist.test.ts)
- [`tests/api/rotation-monitor.test.ts`](../tests/api/rotation-monitor.test.ts)
- [`tests/api/market-state.test.ts`](../tests/api/market-state.test.ts)
- [`tests/unit/server/etf-ownership-regressions.test.ts`](../tests/unit/server/etf-ownership-regressions.test.ts)
- [`tests/unit/server/etf-watchlist-queries.test.ts`](../tests/unit/server/etf-watchlist-queries.test.ts)
- [`tests/unit/server/market-rotation-batch.test.ts`](../tests/unit/server/market-rotation-batch.test.ts)
- [`tests/unit/server/market-rotation-queries.test.ts`](../tests/unit/server/market-rotation-queries.test.ts)
- [`tests/unit/server/market-rotation-monitor-queries.test.ts`](../tests/unit/server/market-rotation-monitor-queries.test.ts)
- [`tests/unit/server/spx-session-api.test.ts`](../tests/unit/server/spx-session-api.test.ts)
- [`tests/unit/lib/market-rotation/`](../tests/unit/lib/market-rotation)
  (breadth, calculations, comparison-enrichment, indicators, monitor,
  pipeline, qualified-date, round, scope-enrichment, signal, snapshot-builder,
  state, summary)
- [`tests/unit/lib/market-state/`](../tests/unit/lib/market-state) (breadth,
  regime)

### Known gotchas

- Rotation snapshots are **scoped** by `rankScope`. Cross-scope percentile or
  global ranking is intentionally not supported (ADR-0004,
  CONTEXT.md §"Rank Scope").
- The `monitor.ts` groupBy historically did not filter by canonical symbols;
  the 2026-07 tech-debt pass added `symbol: { in: universeSymbols }` so stale
  DB rows cannot inflate coverage ratio (CONTEXT.md 2026-07 §2).
- 2W trend sparkline returns `null` for missing intermediate points — no
  interpolation (CONTEXT.md §"2W Trend Sparkline").

---

## 6. Blog / Article Workflow

Admin-authored `Post` rows power the public blog. Drafts are written in
admin UI; once `status = PUBLISHED` and `publishedAt` is set, the post is
visible on the public list and SSR article page. Public list and detail
share a query layer (`post-queries.ts`) that branches behaviour via a
`PostQueryConfig`: public defaults to `PUBLISHED` + `search` mode +
title/excerpt fields + category aliases, admin defaults to all statuses +
`contains` mode + title only + author email included. Public responses strip
the author email to prevent enumeration. Slug resolution on the detail
endpoint is a triple fallback (`params → router → path`) because PWA shell
history can leave params empty (CLAUDE.md §8).

Markdown is rendered via `@nuxtjs/mdc` with rehype-pretty-code, rehype-slug,
remark-gfm. SSR + hydration of article content has been a recurring source
of regressions (see test files).

### Main files

- Public API:
  [`server/api/blog/index.get.ts`](../server/api/blog/index.get.ts),
  [`server/api/blog/[slug].get.ts`](../server/api/blog/[slug].get.ts):8
  (`resolveSlug` triple fallback),
  [`server/api/blog/admin/index.get.ts`](../server/api/blog/admin/index.get.ts),
  [`server/api/blog/admin/[id].get.ts`](../server/api/blog/admin/[id].get.ts),
  [`server/api/blog/admin/bulk-delete.post.ts`](../server/api/blog/admin/bulk-delete.post.ts),
  [`server/api/blog/admin/bulk-publish.post.ts`](../server/api/blog/admin/bulk-publish.post.ts),
  [`server/api/blog/admin/[id]/archive.post.ts`](../server/api/blog/admin/[id]/archive.post.ts),
  [`server/api/blog/admin/[id]/publish.post.ts`](../server/api/blog/admin/[id]/publish.post.ts)
- Admin write: [`server/api/blog/index.post.ts`](../server/api/blog/index.post.ts),
  [`server/api/blog/[id].put.ts`](../server/api/blog/[id].put.ts),
  [`server/api/blog/[id].delete.ts`](../server/api/blog/[id].delete.ts)
- Query layer: [`server/utils/post-queries.ts`](../server/utils/post-queries.ts):28
  (`PostQueryConfig`, `queryPosts`, `parsePostQueryConfig`)
- Validation: [`server/utils/blog-schemas.ts`](../server/utils/blog-schemas.ts)
- Markdown and response helpers: [`lib/blog.ts`](../lib/blog.ts)
- UI: [`pages/blog/`](../pages/blog), [`pages/articles/`](../pages/articles)
  ( Needs verification: legacy alias route for older slugs)

### Related tests

- [`tests/api/blog.test.ts`](../tests/api/blog.test.ts)
- [`tests/integration/article-markdown-ssr.test.ts`](../tests/integration/article-markdown-ssr.test.ts)
  — regression coverage for SSR markdown rendering

### Known gotchas

- All blog API responses set `Cache-Control: no-store`. Public CDN caching
  is intentionally disabled (CLAUDE.md §8, 2026-06 commit
  `a4b913c` "enforce no-store on blog API cache, drop PWA
  navigateFallback").
- `publishedAt` is treated as UTC; the labelling fix in commit `0f9162b`
  prevents timezone drift on the public display.
- `searchMode: 'search'` uses Prisma's MariaDB/MySQL full-text search over
  `title` and `excerpt`. The required `posts_title_excerpt_fulltext_idx` is
  declared in `prisma/schema.prisma` and installed by Prisma migration
  `20260904090000_add_posts_fulltext_index`. There is deliberately no
  substring fallback: matching is tokenized by the database full-text
  parser, so very short/stop words may not match. The real MariaDB contract
  test covers the user-facing unique-phrase behavior.

---

## 7. Alert / Reminder Workflow

Two distinct subsystems share the `Alert` namespace:

1. **Diary-linked reminders** — created via `persistAlert` when a diary is
   written/updated. Non-recurring alerts fire once at `triggerAt`. Recurring
   alerts (WEEK = until this Friday, MONTH = until end of month, skipping
   weekends) expand into a parent row (`parentId = self`) plus child rows
   via `generateRecurringAlertsData` in `lib/recurring-alerts.ts`.
2. **Price alerts** — standalone `PriceAlert` rows with conditions
   (`PRICE_ABOVE`, `PRICE_BELOW`, `CHANGE_PERCENT`, `MOVING_AVG`), polled by
   `server/schedulers/price-alert-checker.ts`.

Both are pushed to clients over WebSocket when triggered. The scheduler
plugin (`server/plugins/alert-scheduler.ts`) is opt-in via
`SCHEDULER_ENABLED=true` (multi-instance safety). Alert pusher runs every
60s, price alert checker every 5min (per plugin comment).

### Main files

- Diary alerts API: [`server/api/alerts/index.get.ts`](../server/api/alerts/index.get.ts),
  [`server/api/alerts/[id]/dismiss.put.ts`](../server/api/alerts/[id]/dismiss.put.ts)
- Price alerts API: [`server/api/stocks/alerts/index.get.ts`](../server/api/stocks/alerts/index.get.ts),
  `index.post.ts`, `[id].delete.ts`
- Persistence: [`server/utils/alert-persistence.ts`](../server/utils/alert-persistence.ts):5
- Recurring expansion: [`lib/recurring-alerts.ts`](../lib/recurring-alerts.ts):14
  (`calculateRecurringAlertDates`, `generateRecurringAlertsData`)
- Price alert queries:
  [`server/utils/price-alert-queries.ts`](../server/utils/price-alert-queries.ts),
  [`server/utils/price-alert-condition.ts`](../server/utils/price-alert-condition.ts)
- Schedulers:
  [`server/plugins/alert-scheduler.ts`](../server/plugins/alert-scheduler.ts):22,
  [`server/schedulers/alert-pusher.ts`](../server/schedulers/alert-pusher.ts),
  [`server/schedulers/price-alert-checker.ts`](../server/schedulers/price-alert-checker.ts)
- WebSocket: [`server/websocket/connectionManager.ts`](../server/websocket/connectionManager.ts),
  [`plugins/websocket.client.ts`](../plugins/websocket.client.ts),
  [`composables/useAlerts.ts`](../composables/useAlerts.ts)
- UI: [`pages/alerts/`](../pages/alerts)

### Related tests

- [`tests/api/alerts.test.ts`](../tests/api/alerts.test.ts)
- [`tests/api/stocks-alerts.test.ts`](../tests/api/stocks-alerts.test.ts)
- [`tests/unit/server/alert-persistence.test.ts`](../tests/unit/server/alert-persistence.test.ts)
- [`tests/unit/server/alert-scheduler.test.ts`](../tests/unit/server/alert-scheduler.test.ts)
- [`tests/unit/server/price-alert-queries.test.ts`](../tests/unit/server/price-alert-queries.test.ts)
- [`tests/unit/websocket/`](../tests/unit/websocket) — WebSocket regression
  tests
- [`tests/unit/websocket-client-regressions.test.ts`](../tests/unit/websocket-client-regressions.test.ts),
  [`tests/unit/websocket-plugin-regression.test.ts`](../tests/unit/websocket-plugin-regression.test.ts)

### Known gotchas

- `SCHEDULER_ENABLED=true` must be set on exactly one active
  realtime/scheduler instance; otherwise alerts fire N times. The current
  topology assumes one active realtime instance because the WebSocket
  broadcaster and market-data cache are process-local.
- Recurring alerts starting on Saturday/Sunday are shifted forward to Monday
  (`lib/recurring-alerts.ts`).
- Dismissing a recurring parent is series-wide: the root and all materialized
  children are marked dismissed atomically. Pending children are excluded by
  both the active-alert query and scheduler parent gate. Dismissing a child
  only dismisses that instance.

---

## 8. Partner Compare / Agent Diary Workflow

A `PartnerLink` connects two users bidirectionally. Each side controls their
own sharing flags (`userASharesDiaries`, `userASharesStockNotes`, mirror for
B). The link is pending until `accept.post.ts` runs. Once accepted and both
sides share diaries, the compare endpoint (`compare.get.ts`) loads owner and
partner diaries, strips `transactions` and `alerts` from each, then aligns
them by user-timezone day via `buildCompareDays` (pure function in
`partner-compare.ts`). Diary content is shared; holdings/transactions are
not.

**Agent API** reuses the same primitives. An `ApiKeyCredential` (SHA-256
hashed at rest, `dva_` prefix) has a scope (`DIARY_CREATE` or `AGENT_WRITE`)
and is owned by a regular `User`. The agent user can be added as a partner
just like any other user, so an AI agent sharing `StockNote`s and
`StockTimelineRecord`s flows through the same compare surface. Agent
endpoints:

- `POST /api/agent/diaries` — create a diary on behalf of the API key's user
  (disables `appendToToday` shortcut)
- `POST /api/agent/stocks/records` — bulk upsert timeline records
  (`idempotencyKey` per record, max 100 per request)
- `POST /api/agent/stocks/[symbol]/notes` — upsert stock note
- `GET /api/agent/stocks/watchlist` — read agent's watchlist

### Main files

- Partner API:
  [`server/api/partners.post.ts`](../server/api/partners.post.ts),
  [`server/api/partners.get.ts`](../server/api/partners.get.ts),
  [`server/api/partners/[id].delete.ts`](../server/api/partners/[id].delete.ts),
  [`server/api/partners/[id]/accept.post.ts`](../server/api/partners/[id]/accept.post.ts),
  [`server/api/partners/[id]/sharing.put.ts`](../server/api/partners/[id]/sharing.put.ts),
  [`server/api/partners/compare.get.ts`](../server/api/partners/compare.get.ts):10
- Agent API:
  [`server/api/agent/diaries.post.ts`](../server/api/agent/diaries.post.ts):9,
  [`server/api/agent/stocks/records.post.ts`](../server/api/agent/stocks/records.post.ts):28,
  [`server/api/agent/stocks/[symbol]/notes.post.ts`](../server/api/agent/stocks/[symbol]/notes.post.ts),
  [`server/api/agent/stocks/watchlist.get.ts`](../server/api/agent/stocks/watchlist.get.ts)
- API key management:
  [`server/api/api-keys.get.ts`](../server/api/api-keys.get.ts),
  [`server/api/api-keys.post.ts`](../server/api/api-keys.post.ts),
  [`server/api/api-keys/[id].delete.ts`](../server/api/api-keys/[id].delete.ts),
  [`server/utils/api-key.ts`](../server/utils/api-key.ts):43 (`requireApiKey`,
  `generateApiKey`:32, `hashApiKey`:28)
- Query layer:
  [`server/utils/partner-queries.ts`](../server/utils/partner-queries.ts):33
  (`findUserPartnerLinks`, `findPartnerLinkById`:49,
  `findPartnerLinkByUserPair`:63, `findPartnerLinkBetweenUsers`:72,
  `loadCompareContext`),
  [`server/utils/partner-compare.ts`](../server/utils/partner-compare.ts)
  (`buildCompareDays` pure function),
  [`server/utils/partner.ts`](../server/utils/partner.ts) (`getPartnerSide`),
  [`server/utils/partner-response.ts`](../server/utils/partner-response.ts)
  (`serializePartnerLink`),
  [`server/utils/stock-timeline-queries.ts`](../server/utils/stock-timeline-queries.ts)
  (`createStockTimelineRecordsFromAgent`)
- UI: [`pages/partners/`](../pages/partners)

### Related tests

- [`tests/api/partners.test.ts`](../tests/api/partners.test.ts)
- [`tests/api/partner-stock-notes.test.ts`](../tests/api/partner-stock-notes.test.ts)
- [`tests/api/agent-diaries.test.ts`](../tests/api/agent-diaries.test.ts)
- [`tests/api/agent-stocks-records.test.ts`](../tests/api/agent-stocks-records.test.ts)
- [`tests/api/agent-stocks-watchlist.test.ts`](../tests/api/agent-stocks-watchlist.test.ts)
- [`tests/api/api-keys.test.ts`](../tests/api/api-keys.test.ts)
- [`tests/unit/server/partner-compare.test.ts`](../tests/unit/server/partner-compare.test.ts)
- [`tests/unit/server/partner-queries.test.ts`](../tests/unit/server/partner-queries.test.ts)
- [`tests/integration/agent-stock-timeline.test.ts`](../tests/integration/agent-stock-timeline.test.ts)

### Known gotchas

- Partner compare exposes diary fields through an explicit allowlist, so
  transactions and alerts never leak through the partner view.
- Agent endpoints accept both `x-api-key` and `Authorization: Bearer …`
  headers (`api-key.ts`:47). Don't rely on header name for identification.
- API key IDs logged for audit use the credential's BigInt `id` — apply
  `String()` before logging (CLAUDE.md §3).

---

## 9. Legacy channel removal

The retired chat channel is no longer part of the application surface. Historical
`Diary.createdVia` provenance remains readable, while new diary writes use only
the web and API-key paths.

---

## 10. SEC Filings Downloader Workflow

`/tools/sec-filings` is a public, read-only SEC EDGAR research tool. Browser code never calls SEC directly. Company search, submissions history, filing indexes, individual documents, and ZIP packages flow through `/api/tools/sec-filings/**` and the isolated modules in `server/utils/sec-edgar/`.

The client constructs URLs only from validated CIKs, accession numbers, historical segment names, and document basenames. It allows only `www.sec.gov` and `data.sec.gov`, applies a process-local queue below the SEC fair-access ceiling, retries bounded transient failures, and can serve explicitly marked stale metadata. Document bodies are streamed; ZIP creation stages bounded files in a request-scoped temporary directory that is always removed.

Required deployment setting: `SEC_USER_AGENT`, containing an application name and monitored contact email. Tests use `tests/fixtures/sec/` and mocked fetch only; live SEC calls are forbidden.

### Main files

- UI: `pages/tools/sec-filings/`, `components/sec-filings/`, `composables/useSecFilingsTool.ts`
- API: `server/api/tools/sec-filings/`
- Server modules: `server/utils/sec-edgar/`
- Shared types: `types/sec-filings.ts`
- Contract: `docs/contracts/SEC_FILINGS.md`

### Related tests

- `tests/unit/server/sec-edgar-*.test.ts`
- `tests/api/sec-filings.test.ts`
- `tests/e2e/sec-filings.spec.ts`

---

## 11. Testing Workflow

Vitest is the primary runner with `happy-dom` environment and setup file
[`tests/vi-setup.ts`](../tests/vi-setup.ts). Tests live in three buckets:

- **Unit** (`tests/unit/`) — pure functions, query layers, serializers,
  regression suites for specific subsystems (Prisma import safety, CSP,
  WebSocket plugin, PWA, Dockerfile Prisma config). Most query-layer files
  have a sibling test in `tests/unit/server/`.
- **API** (`tests/api/`) — handler-level tests using the mock helpers from
  `vi-setup.ts` (`mockReadBody`, `mockGetQuery`, etc.). Each resource has
  its own file.
- **Integration** (`tests/integration/`) — multi-component workflows
  (auth-flow, diary-workflow, agent-stock-timeline, article-markdown-ssr).

Playwright E2E (`tests/e2e/`) is configured via
[`playwright.config.ts`](../playwright.config.ts) and covers auth, diary
CRUD, quick diary, stock tracking, relative-value tools, tools responsive
layout and text containment. `tests/e2e/global-setup.ts` starts a disposable
MariaDB 11.4 database, applies migrations, and owns teardown. The auth helper
registers per-test users and isolates process-local rate-limit identities. Run
via `npm run test:e2e`; do not seed or reuse a production-like database.

The strict `npm run typecheck:tests` gate deliberately targets new and
critical contract tests (including E2E helpers, real DB contracts, runtime
config, serialization, Socket.IO, and batch seams). The full historical test
tree remains a documented legacy typing baseline; it is not mass-rewritten
with non-null assertions just to manufacture a green signal.

Coverage uses `@vitest/coverage-v8` with thresholds (lines/functions/
statements 55%, branches 45%) gated to specific server/utils/lib/composable
paths (see [`vitest.config.ts`](../vitest.config.ts):14). Presentational
`components/**`/`pages/**`/`layouts/**` are excluded from the gate.

### Main files

- Config: [`vitest.config.ts`](../vitest.config.ts), [`playwright.config.ts`](../playwright.config.ts)
- Setup: [`tests/vi-setup.ts`](../tests/vi-setup.ts), [`tests/setup.ts`](../tests/setup.ts)
- Mocks: [`tests/mocks/`](../tests/mocks)
- Helpers: [`tests/helpers/`](../tests/helpers) (api, auth, database, mock)
- E2E helpers: [`tests/e2e/helpers/auth.ts`](../tests/e2e/helpers/auth.ts),
  [`tests/e2e/global-setup.ts`](../tests/e2e/global-setup.ts),
  [`tests/e2e/global-teardown.ts`](../tests/e2e/global-teardown.ts)
- Critical test typecheck: [`tsconfig.tests.json`](../tsconfig.tests.json),
  `npm run typecheck:tests`
- Scripts: `npm test`, `npm run test:watch`, `npm run test:ui`,
  `npm run test:coverage`, `npm run test:unit`, `npm run test:integration`,
  `npm run test:socketio`, `npm run test:diary-reconciliation:mysql`,
  `npm run test:backend-http:mariadb`, `npm run test:market-rotation:mysql`,
  `npm run test:e2e`, `npm run test:ci`, `npm run coverage:gate`

### Known gotchas / weak areas

- Coverage thresholds are intentionally pragmatic (55/45). Adding new
  untested code in `server/utils/` will drop coverage fast — see
  [`docs/TESTING.md`](TESTING.md) for the full strategy and gaps.
- Unit/API tests mock Prisma per test file via `vi.mock('~/lib/prisma')`.
  High-risk database behavior is covered separately by the disposable MariaDB
  commands: `npm run test:diary-reconciliation:mysql`,
  `npm run test:backend-http:mariadb`, and
  `npm run test:market-rotation:mysql` (the HTTP gate includes blog FULLTEXT,
  recurring-alert dismissal, and real Nitro HTTP contracts).
- The Socket.IO gate uses the production `server/websocket/socket-server.ts`
  construction with a real Node listener and `socket.io-client`; only the
  auth-session and alert-query seams are mocked. Generic `npm test` skips the
  listener when `SOCKET_IO_INTEGRATION` is not set, while CI runs
  `npm run test:socketio` as a required contract gate.
- A few historically flaky regression suites (CSP, websocket-plugin) have
  dedicated files to lock the contract — review them before changing
  related runtime code.
- E2E starts its own dev server and disposable DB; the setup teardown callback
  owns container cleanup. E2E remains separate from the required PR gate until
  the full browser matrix is stable on the target Forgejo runner.

---

## 12. Deployment / Operations Workflow

Container deploy is Docker-first. The image (`Dockerfile`,
multi-stage) runs `docker-entrypoint.sh`, which waits for MySQL, optionally
runs `prisma migrate deploy` (controlled by `RUN_MIGRATIONS=true`), validates
that critical tables exist (mariadb probe), then execs the Nuxt server. K8s
manifests in [`k8s/`](../k8s) define namespace, MariaDB deployment, app
deployment, service and ingress.

The **Market Rotation batch** runs as a K8s CronJob at `30 21 * * 0-5`
(21:30 UTC, Sun–Fri) — see [`k8s/cron-market-rotation.yaml`](../k8s/cron-market-rotation.yaml).
The container invokes `npx tsx scripts/market-rotation/run-batch.ts`
in-process; no HTTP, no JWT, no CSRF (CONTEXT.md 2026-07 §6). Env is just
`DATABASE_URL` for the batch domain path; the companion market-state breadth
script also reads the typed `MARKET_DATA_CONCURRENCY` setting. No user auth
secret is needed for this deployment-layer invocation.

The same batch seam is available to an admin through
`POST /api/admin/market/rotation-batch`. The API test covers validated scope
and full-batch dispatch; the CronJob test verifies direct `tsx` invocation and
direct `DATABASE_URL` usage, so neither path silently regresses to HTTP or
auth dependencies. Yahoo requests are injected behind the existing provider
seam and tested with deterministic fixture responses; these contract tests do
not call Yahoo over the network.

**Current deployment assumptions:**

- Web app topology: single active realtime/scheduler instance.
- Scheduler must run on exactly one instance (`SCHEDULER_ENABLED=true`).
- WebSocket broadcaster is process-local.
- Market-data cache is process-local.
- Horizontal web scaling requires additional distributed coordination before
  it is safe for realtime delivery, scheduler execution, or cache coherence.

Alert schedulers run inside the app process when `SCHEDULER_ENABLED=true`
(see §7).

### Required environment variables

- `DATABASE_URL` — MySQL connection string
- `JWT_SECRET` — 32+ chars, `openssl rand -base64 32`
- `NUXT_PUBLIC_SITE_URL` — SEO / sitemap base URL
- `SCHEDULER_ENABLED` — `'true'` to enable in-process alert + price alert
  schedulers (one replica only)
- `RUN_MIGRATIONS` — `'true'` to run `prisma migrate deploy` at container
  start (defaults to false; CapRover uses `preDeployFunction`)
- `LOG_FORMAT` — `json` for structured JSON lines, otherwise `text`
- `TRUST_X_FORWARDED_FOR` — `true` only behind a trusted append-mode proxy
- `MARKET_DATA_CONCURRENCY` — bounded batch fetch concurrency (default `2`)
See [`.env.example`](../.env.example) for the full list.

### Main files

- Docker: [`Dockerfile`](../Dockerfile),
  [`docker-entrypoint.sh`](../docker-entrypoint.sh):38 (`run_migrations`),
  [`docker-entrypoint.sh`](../docker-entrypoint.sh):54 (`validate_schema`),
  [`captain-definition`](../captain-definition), [`deploy.sh`](../deploy.sh)
- K8s: [`k8s/`](../k8s) (namespace, secrets, MariaDB, app, ingress,
  market-rotation CronJob)
- Health: [`scripts/health-check.ts`](../scripts/health-check.ts) —
  TypeScript + tests + DB connection + Prisma validate + build verification
- Server health endpoint: [`server/api/health.get.ts`](../server/api/health.get.ts)
- Batch CLIs: [`scripts/market-rotation/run-batch.ts`](../scripts/market-rotation/run-batch.ts),
  [`scripts/market-state/seed-universe.ts`](../scripts/market-state/seed-universe.ts),
  [`scripts/market-state/update-breadth.ts`](../scripts/market-state/update-breadth.ts)
- Migrations: [`prisma/`](../prisma) — `npx prisma migrate dev` (local),
  `npx prisma migrate deploy` (CI / container)
- Backup/restore runbook: [`operations/BACKUP_RESTORE.md`](operations/BACKUP_RESTORE.md)
- Full deploy guide: [`operations/DEPLOYMENT.md`](operations/DEPLOYMENT.md)
- Forgejo CI: [`operations/FORGEJO_CI.md`](operations/FORGEJO_CI.md)

### Related tests

- [`tests/unit/server/health.get.test.ts`](../tests/unit/server/health.get.test.ts)
- [`tests/unit/dockerfile-prisma-config.test.ts`](../tests/unit/dockerfile-prisma-config.test.ts)
- [`tests/unit/lib/prisma-import.test.ts`](../tests/unit/lib/prisma-import.test.ts),
  [`tests/unit/lib/prisma-runtime-contract.test.ts`](../tests/unit/lib/prisma-runtime-contract.test.ts),
  [`tests/unit/lib/prisma-version-gate.test.ts`](../tests/unit/lib/prisma-version-gate.test.ts)
- [`tests/unit/prisma-market-rotation-run-schema.test.ts`](../tests/unit/prisma-market-rotation-run-schema.test.ts)

### Known gotchas

- `docker-entrypoint.sh` uses `HOME=/tmp` for the Prisma migrate step so
  Prisma's cache directory is writable in restricted containers.
- `validate_schema` only probes a fixed list of critical tables
  (`price_alerts stock_timeline_records stock_watchlists stocks etf_prices
  etf_watchlists etfs`). Schema drift on other tables is not caught at
  startup.
- Pre-deploy checklist (`CLAUDE.md §14`): generate `JWT_SECRET`, point
  `DATABASE_URL` at prod MySQL, set `NUXT_PUBLIC_SITE_URL`, run
  `npm run health:full`, run `npx prisma migrate deploy`.
