# Market Rotation Monitor Contract

## 狀態

Accepted for implementation.

本計畫取代先前的 ETF market-state integration concept。頁面 URL 暫時保留 `/tools/etf`，但產品名稱與可見 UI 應改為 **Market Rotation Monitor**。

## 產品定義

**Market Rotation Monitor** 是 ETF 研究視圖，用來辨識目前 Market State、Sector Breadth、sector leadership changes，以及 2 週市場輪動趨勢。

它不是新的限界上下文，仍屬於 ETF research tool surface。Stock 與 ETF 的分離邊界仍遵循 ADR-0002。

## Canonical Terminology

- **Market Rotation Monitor**：`/tools/etf` 的使用者可見頁面名稱。
- **Market Rotation Snapshot**：某個交易日、某個 symbol 的持久化 ETF/sector rotation state。
- **Market Rotation Universe**：可產生持久化 snapshot 的 canonical symbols。
- **Rank Scope**：用於 percentile、rank、qualified date、2 週比較的可比較 symbol universe。
- **Market State**：使用者可見的主市場狀態標籤。
- **Sector Breadth**：只由 `sectors` rank scope 聚合出的 breadth metrics。
- **Breadth Condition**：絕對 sector breadth condition。
- **Breadth Confirmation**：sector breadth 是否支持目前 Market State。
- **Rotation Score**：同一 scope 內的 relative strength percentile score。
- **Rotation Signal**：由 rotation state 和 2 週變化衍生出的 canonical signal label。

## 命名規則

產品文案、code、API paths、response fields、schema fields、tests、scripts、documentation 都使用 **Market State**。

不得提供公開 legacy alias，也不得把外部產品式命名暴露為 public concept。

Canonical API paths:

```text
GET /api/market/state/snapshot
GET /api/market/state/history
GET /api/market/rotation-monitor
```

現有 `/api/market/sector-board` endpoint 保留，但它不是 Market Rotation Monitor 的主資料來源。

## Rank Scopes

V1 只支援三個 rank scopes：

- `sectors`：US sector ETFs。用於主要 Sector Rotation Matrix。
- `indexes`：benchmark index ETFs。用於 Market State、benchmark trend、benchmark comparison。
- `core`：app-defined core ETF list。保留給更廣的 ETF monitoring 和未來視圖。

V1 不實作 `all`、`global` 或 mixed ranking scope。

所有 percentile calculation 與 rotation rank 都 scoped by `rank_scope`。

## Snapshot Universe

只為 canonical symbols 持久化 snapshots：

- US sector ETFs
- benchmark index ETFs
- app-defined core ETF list

不得自動持久化：

- arbitrary custom symbols
- one-off user inputs
- cold tickers
- unknown or invalid tickers

Custom symbols 仍可在有 live data 時顯示，但不保證有 2 週 snapshot comparison。

## Data Flow

Snapshot calculation 必須讀取持久化的 `market_daily_price`。

Batch job 可以從 Yahoo 或其他 provider 補抓缺失 OHLCV，但抓回來的價格必須先寫入 `market_daily_price`。

Canonical flow:

```text
provider -> market_daily_price -> market_rotation_snapshot -> /api/market/rotation-monitor
```

頁面 request 不得直接從 live provider response 計算 snapshots。

## Qualified Dates

**Qualified Snapshot Date** 按 `rank_scope` 分別判定。

某日期在該 rank scope 中至少 90% active canonical symbols 成功產生 Market Rotation Snapshot，才算 qualified。

**2W Comparison Date** 定義為：

```text
latest qualified snapshot date - 10 qualified snapshot dates
```

這不是 14 個 calendar days 前，也不是每個 symbol 各自往前找比較日。

## Market State

Canonical `marketState` values:

- `risk_on`
- `neutral`
- `defensive`
- `risk_off`
- `unknown`

Existing internal state values map into user-facing `marketState`:

```text
BULLISH_THRUST -> risk_on
RISK_ON -> risk_on
NEUTRAL -> neutral
RISK_OFF -> defensive
CAPITULATION_WATCH -> risk_off
unknown / missing -> unknown
```

Internal state values 不得直接暴露為 dashboard 主 label。Thrust detail 只能出現在 summary text 或 supporting evidence。

## Breadth

V1 summary breadth cards 只從 `sectors` rank scope 聚合。

Cards:

- Above 20d EMA breadth
- Above 50d SMA breadth
- Average RSI
- Market State

`breadthCondition` 描述 sectors above 50d ratio 的絕對廣度：

- `broad_participation`：`>= 70%`
- `constructive`：`>= 50% and < 70%`
- `narrowing`：`>= 35% and < 50%`
- `weak_breadth`：`< 35%`
- `unknown`：insufficient data

`breadthConfirmation` 描述 sector breadth 是否支持 `marketState`：

- `confirming`
- `mixed`
- `warning`
- `unknown`

Rules:

- `risk_on`：`>= 50%` 為 `confirming`，`35%-50%` 為 `mixed`，低於 `35%` 為 `warning`。
- `neutral`：中間區間為 `confirming`，異常強或異常弱為 `mixed`。
- `defensive`：低於 `50%` 為 `confirming`，`50%-70%` 為 `mixed`，`>= 70%` 為 `warning`。
- `risk_off`：低於 `35%` 為 `confirming`，`35%-50%` 為 `mixed`，`>= 50%` 為 `warning`。
- unknown Market State 或 unknown breadth data 回 `unknown`。

## Moving Averages

V1 MA score:

```text
ma_score = 20 * above_10d + 30 * above_20d + 50 * above_50d
```

Where:

```text
above_10d = close > ema_10 ? 1 : 0
above_20d = close > ema_20 ? 1 : 0
above_50d = close > sma_50 ? 1 : 0
```

儲存 `sma_200` 和 `above_200d` 供未來 Market State analysis 使用，但 v1 `ma_score` 不包含 200d。

Canonical `ma_status` values:

- `bullish_stack`
- `healthy_pullback`
- `short_term_weakness`
- `recovering`
- `breakdown`
- `unknown`

## Distance From High

使用 rolling 252 trading day high。

```text
percent_from_high = (close / rolling_252d_high - 1) * 100
distance_from_high_score = clamp(100 + percent_from_high * 5, 0, 100)
```

Examples:

- `0%` from high = `100`
- `-5%` from high = `75`
- `-10%` from high = `50`
- `-20%` or worse = `0`

Raw score 要儲存，供 display 和 debugging 使用。`rotation_score` 使用同一 `rank_scope` 內的 `distance_from_high_score` percentile。

Fallback:

- 有 252 trading days 時使用 252 trading days。
- 少於 252 trading days 時，只有在至少 60 trading days 可用時才使用可用歷史最高點。
- 少於 60 trading days 時，distance-from-high fields 標為 unknown。

## Rotation Score

V1 `rotation_score` 完全由 scope-local percentile components 組成：

```text
rotation_score =
  0.30 * rsi_percentile
+ 0.30 * two_week_performance_percentile
+ 0.20 * ma_score_percentile
+ 0.20 * distance_from_high_score_percentile
```

Rules:

- 所有 percentiles 都在同一 `rank_scope` 內計算。
- `ma_score` 先計算 raw score，再轉 scope-local percentile。
- `distance_from_high_score` 先計算 raw score，再轉 scope-local percentile。
- 任一 component unknown 時，`rotation_score` 為 unknown。
- Unknown components 不補 0。
- `rotation_rank` 只在有完整 `rotation_score` 的 symbols 之間產生。

## Rotation Signals

Canonical `signal` values:

- `turning_strong`
- `strong_but_extended`
- `losing_momentum`
- `breaking_down`
- `early_recovery`
- `neutral`

Priority:

```text
breaking_down > strong_but_extended > turning_strong > early_recovery > losing_momentum > neutral
```

Rules:

- `breaking_down`：`ma_status` is `breakdown` and rank, RSI, or 2W performance is weakening.
- `strong_but_extended`：`bullish_stack`, RSI `>= 70`, and close is within 3% of the 52-week high.
- `turning_strong`：`bullish_stack` or `healthy_pullback`, rank improves by at least 2 places, RSI improves by at least 5 points, and 2W performance is positive.
- `early_recovery`：`recovering`, RSI `>= 40`, and rank, RSI, or 2W performance is improving.
- `losing_momentum`：`short_term_weakness` or `healthy_pullback`, rank drops by at least 2 places, and RSI or 2W performance is weakening.
- `neutral`：complete data exists but none of the above rules are triggered.

必要資料缺失時：

```text
signal = null
signal_status = insufficient_data
```

Missing data 不得分類為 `neutral`。

## Snapshot Schema

V1 snapshot rows 只存 scalar daily values：

- `date`
- `symbol`
- `rank_scope`
- `group_type`
- `sector_name`
- `last_price`
- `adjusted_close`
- `daily_change_pct`
- `weekly_change_pct`
- `two_week_performance_pct`
- `rsi_14`
- `rsi_percentile`
- `rsi_delta_2w`
- `ema_10`
- `ema_20`
- `sma_50`
- `sma_200`
- `above_10d`
- `above_20d`
- `above_50d`
- `above_200d`
- `ma_score`
- `ma_score_percentile`
- `ma_status`
- `rolling_252d_high`
- `percent_from_high`
- `distance_from_high_score`
- `distance_from_high_score_percentile`
- `rotation_score`
- `rotation_score_delta_2w`
- `rotation_rank`
- `rank_delta_2w`
- `signal`
- `signal_status`
- `created_at`
- `updated_at`

Constraints and indexes:

```text
unique(rank_scope, symbol, date)
index(rank_scope, date, rotation_rank)
index(rank_scope, date)
```

不要把 2W sparkline series 存進 snapshot rows。Sparkline series 是 API view aggregates。

## API Payload

`GET /api/market/rotation-monitor` 回傳 render 和 basic export 所需的全部 dashboard data。

Top-level shape:

```ts
{
  asOfDate: string
  comparisonDate: string | null
  rankScope: 'sectors' | 'indexes' | 'core'
  marketState: 'risk_on' | 'neutral' | 'defensive' | 'risk_off' | 'unknown'
  breadthCondition: 'broad_participation' | 'constructive' | 'narrowing' | 'weak_breadth' | 'unknown'
  breadthConfirmation: 'confirming' | 'mixed' | 'warning' | 'unknown'
  currentMarketSummary: string
  summaryCards: unknown
  charts: unknown
  rows: unknown[]
  dataQuality: unknown
}
```

CSV、Copy Table、PNG export 都從同一份 page payload 產生。

## Table Columns

Sector Rotation Matrix columns:

- Ticker
- Sector
- Last
- RSI
- RSI Delta 2W
- Rank
- Rank Delta 2W
- 2W %
- 2W Trend sparkline
- Percent From High
- MA Status
- Signal

## Sparklines

2W Trend sparklines 使用 comparison-date-normalized performance：

```text
normalized_value = price_on_date / price_on_comparison_date * 100
```

Rules:

- 同一 `rank_scope` 內所有 symbols 使用同一 qualified snapshot date sequence。
- 第一點是 comparison snapshot date，值為 `100`。
- 最後一點是 latest qualified snapshot date。
- `twoWeekPerformancePct = latestNormalizedValue - 100`。
- 有 `adjusted_close` 時使用它，否則 fallback `close`。
- 缺 comparison date 時，sparkline 和 2W performance unavailable。
- 中間缺日期時回 `null`。
- 不使用 min-max normalization、z-score normalization 或 per-symbol first-available-date normalization。

## Improving vs Weakening Chart

使用：

```text
rankDelta2W = comparisonRank - currentRank
```

Rules:

- Top 3 improving symbols 是最高正值 `rankDelta2W`。
- Bottom 3 weakening symbols 是最低負值 `rankDelta2W`。
- 只有 latest rank 和 comparison rank 都完整的 rows 可參與。
- 不使用 2W performance 作為 primary sort。

Tie-breakers:

1. `rankDelta2W`
2. `rotationScoreDelta2W`
3. `twoWeekPerformancePct`
4. `rsiDelta2W`
5. `currentRotationRank`

## Filters

V1 filters 是 `/api/market/rotation-monitor` payload 上的 client-side filters。

Filters:

- Turning Strong：`signal === 'turning_strong'`
- Losing Momentum：`signal === 'losing_momentum'`
- Rank Up：`rankDelta2W > 0`
- Rank Down：`rankDelta2W < 0`
- Above 50d：`above50d === true`
- Below 50d：`above50d === false`
- Near High：`percentFromHigh >= -3`
- Extended：`signal === 'strong_but_extended'` or `rsi >= 70 && percentFromHigh >= -3`

## Current Market Summary

V1 使用 deterministic templates，不使用 LLM generation。

Inputs:

- `marketState`
- `breadthCondition`
- `breadthConfirmation`
- top 3 improving symbols
- bottom 3 weakening symbols
- Above 50d breadth ratio
- Average RSI

Summary 應提到：

- strongest improving sectors
- weakening sectors
- breadth condition
- Market State

## UI Direction

頁面應該像 market intelligence dashboard，而不是簡單 ETF table。

Visible labels 使用 **Market Rotation** terminology。URL 暫時保留 `/tools/etf`。

## Implementation Order

建議實作順序：

1. Schema、calculation utils、unit tests。
2. Batch job / backfill：`market_daily_price -> market_rotation_snapshot`。
3. Market State hard migration：API、code、schema、tests 命名改乾淨。
4. `/api/market/rotation-monitor` dashboard payload。
5. `/tools/etf` UI 改成 Market Rotation Monitor。
6. CSV、Copy Table、PNG export 全部使用同一 dashboard payload。
7. 最後清理舊命名與舊元件。

資料層與公式必須先於 UI 完成。不要先做漂亮畫面再回頭補資料管線。
