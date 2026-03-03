# Public ETF Profile V2 Design

**Date:** 2026-03-03  
**Scope:** Public ETF page (`/tools/etf`) enhancement only  
**Constraint:** No database schema changes

## Goal
Upgrade the public ETF experience from basic quote/trend display into a research-focused and education-friendly profile with three prioritized data domains:
- Risk/market behavior
- Valuation/fundamentals
- Relative strength (RS) versus benchmark

## Product Direction
- Primary mode: research analysis
- Secondary mode: educational interpretation
- No trade advice output; only metric explanations

## Architecture Decision
Use a pluggable provider architecture with cache-first aggregation and field-level fallback.

Key decisions:
1. Keep existing endpoints and behavior intact.
2. Add new ETF profile endpoints in parallel.
3. Use in-memory/Nitro storage cache (TTL: 15 minutes).
4. Avoid Prisma migration in this phase.

## Data Domains
### 1) Risk Metrics
- 52W high/low and distance-to-extremes
- Annualized volatility: 20D/60D/252D
- 1Y max drawdown
- Volume spike ratio (`volume / avgVolume20d`)

### 2) Valuation/Fund Basics
- AUM
- Expense ratio
- P/E
- P/B
- Dividend yield

### 3) Relative Strength (RS)
- Benchmark selectable: `SPY` or `QQQ`
- Period selectable: `1m | 3m | 6m | 1y`
- Relative return (%) and trend label

## Provider Strategy (Pluggable)
Define a common provider interface and a registry with ordered priority.

Example order:
1. `yahoo` (quote/history baseline)
2. `external-free-source` (valuation/fundamental supplements)

Field-level merge rule:
- First non-null value wins by provider priority.
- Per-field metadata is preserved: source and as-of timestamp.

## Caching Strategy
- Cache target: aggregated profile payload and domain-specific payloads.
- TTL: 15 minutes.
- Mode: cache-first, stale-safe fallback.
- On provider failure: return partial data with `null` fields and availability metadata.

## API Design
New read-only endpoints:
1. `GET /api/etf/:symbol/profile`
2. `GET /api/etf/:symbol/risk`
3. `GET /api/etf/:symbol/valuation`
4. `GET /api/etf/:symbol/rs?benchmark=SPY&period=3m`

Response requirements:
- Include `meta.asOf`, `meta.fetchedAt`, `meta.isStale`, and field-level source map.
- Invalid symbol/params -> 400.
- Partial provider failure -> 200 with partial payload, never hard-fail whole response.

## UI Design (Public ETF Page)
Enhance `pages/tools/etf.vue` incrementally:
1. Add three new panels/tabs: `Risk`, `Valuation`, `RS`.
2. Keep existing tabs and watchlist behavior unchanged.
3. Add educational tooltips for each metric:
- What it is
- How to interpret
- Caveats and data limitations

Display rules:
- Missing field: show `N/A` (never `0` fallback for unknown values)
- Show source and update freshness where possible

## Non-Goals (Current Phase)
- No DB schema/table changes
- No cron/backfill pipeline redesign
- No admin ETF workflow changes
- No replacement of existing `/api/etf/:symbol` and `/api/etf/all` behavior

## Risk Control
1. Keep all additions parallel and additive.
2. Guard new UI with feature flag if needed (`NUXT_PUBLIC_ETF_PROFILE_V2`).
3. Preserve existing public/admin ETF contracts.

## Test Strategy
1. Unit tests:
- Risk metric calculations
- RS calculations
- Aggregator merge/fallback logic
- Cache TTL behavior
2. API tests:
- Param validation
- Partial provider failure behavior
- Stale fallback behavior
3. Regression checks:
- Existing ETF ownership tests
- Existing admin middleware tests

## Rollout Plan
1. Backend profile service + endpoints + tests
2. Frontend public ETF panels + tooltip copy + tests
3. Optional feature flag rollout
