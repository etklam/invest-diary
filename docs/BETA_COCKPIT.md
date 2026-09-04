# Beta Cockpit Design

> **Archived:** Beta Cockpit UI 已退役；`decideBetaAllocation` 仍保留於
> `lib/beta-allocation/policy.ts`。本文件保留作設計參考。

> Design reference for the Beta Cockpit upgrade — Market Rotation Monitor evolved
> from "observe market state" into "recommend a Beta allocation" that connects
> market signals to portfolio decisions.
>
> Delivered source plan: [`docs/archive/completed/2026-06/beta-cockpit-plan.md`](archive/completed/2026-06/beta-cockpit-plan.md)

## Purpose

Upgrade the existing Market Rotation Monitor from a state observer into a
Beta allocation advisor. The cockpit ingests market signals (state + breadth +
rotation ranks) and produces a portfolio Beta profile recommendation that the
user can act on inside the diary.

It explicitly does **not** place trades, sync with brokers, or emit push
notifications — see [Limitations](#limitations).

## Data Sources

- **Yahoo Finance** via [`lib/market-data/yahoo-request-queue.ts`](../lib/market-data/yahoo-request-queue.ts) — rate-limited queue, used by the batch job.
- **Market Rotation Snapshots** — Prisma `MarketRotationSnapshot` / `MarketRotationSnapshotRun` models, defined in [`prisma/schema.prisma`](../prisma/schema.prisma).
- **Market Breadth** — Prisma `MarketBreadthDaily` model (`prisma/schema.prisma`).
- **Market Daily Prices** — Prisma `MarketDailyPrice` model.
- **Holdings** — `HoldingView` from [`lib/stocks-view.ts`](../lib/stocks-view.ts).

## Market State Inputs

All inputs are produced by the existing market rotation pipeline under
[`lib/market-rotation/`](../lib/market-rotation/). The cockpit consumes:

| Field | Type | Source |
|---|---|---|
| `marketState` | `risk_on` \| `neutral` \| `defensive` \| `risk_off` \| `unknown` | `lib/market-rotation/state.ts` (`MarketState`) |
| `breadthConfirmation` | `confirming` \| `mixed` \| `warning` \| `unknown` | [`lib/market-rotation/breadth.ts`](../lib/market-rotation/breadth.ts) (`BreadthConfirmation`, derived via `getBreadthConfirmation`) |
| `above50dRatio` | `number \| null` | Sectors above 50d MA ratio, from breadth snapshot |
| `averageRsi` | `number \| null` | Universe RSI average, computed from rotation snapshots |
| `leadership.topImproving` / `bottomWeakening` | rank-delta lists | From `MarketRotationSnapshot` two-week performance and RSI delta |

## Allocation Policy

The Beta allocation decision table is keyed on `(marketState, breadthConfirmation)`
and emits one of the Beta allocation profiles.

- **Decision table**: 20 cells — `marketState` (5) × `breadthConfirmation` (4).
- **Fallback rule**: any combination not explicitly listed in the table
  resolves to the most conservative mode for that `marketState`. This is
  enforced by the policy module (see plan's acceptance criteria for "unknown
  combinations").
- **Policy module**: `lib/beta-allocation/policy.ts` (planned — delivered by
  the Beta allocation engine lane, tracked in the plan).

## Portfolio Exposure Buckets

The cockpit classifies the user's holdings into the following exposure
buckets. Unknown tickers surface a warning that requires manual review rather
than a silent default.

| Bucket | Examples |
|---|---|
| `core_index` | QQQ / QQQM / VOO / SPY |
| `high_beta` | SOXX / SMH / IGV / XLK |
| `mega_cap` | NVDA / MSFT / AAPL / GOOGL / AMZN / META / TSLA |
| `single_stock` | MU / PLTR / CRWV |
| `defensive` | XLP / XLU / TLT |
| `cash_proxy` | BIL / SGOV |
| `unknown` | flagged for manual review |

## Batch Cron Schedule

### Schedule

The Market Rotation snapshot batch runs on US trading days after market close:

- **Schedule**: `30 21 * * 0-5` (21:30 UTC, Sunday–Friday). Covers Monday–Friday
  Eastern close, with the Sunday run capturing the weekend snapshot.
- **Command**: production CronJob uses
  `./node_modules/.bin/tsx --tsconfig scripts/tsconfig.runtime.json` for
  `scripts/market-rotation/run-batch.ts` and then
  `scripts/market-state/update-breadth.ts`. The rotation entrypoint accepts
  `--scope=<sectors|indexes|core|all>`; default scope is `all`.
- **Scope isolation**: a failure in one rank scope does not abort the others;
  the batch reports per-scope errors and exits 0 unless the whole run throws
  (per `run-batch.ts` exit-code contract). This is the [A6] decision — core
  universe staleness is decoupled from sectors/indexes failures.
- **Failure handling**: structured JSON output is written to stdout for log
  aggregation; symbol-level errors are logged as warnings and do not fail the
  job. Infrastructure errors (DB, Yahoo outage) exit 1 and rely on K8s
  `failedJobsHistoryLimit` for retention.

### Current K8s CronJob

Deployed manifest: [`k8s/cron-market-rotation.yaml`](../k8s/cron-market-rotation.yaml).

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: market-rotation-batch
  namespace: diary-vue
spec:
  schedule: "30 21 * * 0-5"
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 5
  jobTemplate:
    spec:
      backoffLimit: 2
      template:
        spec:
          restartPolicy: OnFailure
          containers:
            - name: batch
              image: git.913555.xyz/etklam/invest-diary:latest
              imagePullPolicy: IfNotPresent
              env:
                - name: NODE_ENV
                  value: production
                - name: LOG_FORMAT
                  value: "json"
                - name: MARKET_DATA_CONCURRENCY
                  value: "2"
                - name: DATABASE_URL
                  valueFrom:
                    secretKeyRef:
                      name: diary-vue-db-creds
                      key: DATABASE_URL
              command:
                - sh
                - -ec
                - |
                  ./node_modules/.bin/tsx --tsconfig scripts/tsconfig.runtime.json scripts/market-rotation/run-batch.ts
                  ./node_modules/.bin/tsx --tsconfig scripts/tsconfig.runtime.json scripts/market-state/update-breadth.ts
```

> The production manifest uses a `secretKeyRef` for `DATABASE_URL`. Keep the
> CronJob database credential in the deployment Secret; do not move it into
> the manifest or an HTTP request payload.

### Staleness contract (Phase 0.3 / Phase 8.2)

- `MarketRotationSnapshotRun.status` (prisma: `String @db.VarChar(32)`) tracks
  `started` / `succeeded` / `failed` per rank scope.
- `MarketBreadthDaily.isStale` (`Boolean`) flips when the breadth updater has
  not refreshed within the expected window.
- The cockpit UI's "Last updated" indicator reads these fields to detect
  staleness; if the core universe has not been refreshed after the cron window,
  the UI surfaces a stale-data banner instead of silently showing old advice.

## Limitations

The Beta Cockpit intentionally does **not** ship:

- AI-generated market summaries
- Options flow / gamma exposure data
- Valuation / PE data API
- SEC filings or FRED data integration
- A complete VCP / cup-and-handle scanner
- Broker sync / auto-trading
- Push notifications with allocation advice

Any of the above may live in [Future Extensions](#future-extensions) once a
data source is identified.

## Future Extensions

- AI summary generation over the daily snapshot
- Options flow integration (e.g. Unusual Whales, flow data vendors)
- Valuation API (PE / forward PE)
- Full VCP / cup-and-handle scanner
- Broker sync for real-time holdings rather than manual transaction entry
