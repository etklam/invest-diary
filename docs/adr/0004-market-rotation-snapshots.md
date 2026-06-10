# ADR-0004: Persist Market Rotation Snapshots

Market Rotation Monitor needs to compare the latest ETF/sector rotation state with the state from 10 trading days ago. We will persist a daily **Market Rotation Snapshot** per ETF/sector symbol and compute 2-week deltas from stored snapshots, instead of recalculating full 1y history, RSI, ranks, percentiles, and 2-week deltas on every page load.

This keeps the dashboard fast and stable, makes rank changes reproducible, and avoids coupling the user-facing page to repeated Yahoo Finance history fetches. The trade-off is a new persistence and batch-update path, but that cost is acceptable because the 2-week comparison layer is now a core feature rather than a cosmetic table enhancement.

Snapshots are generated only for the canonical **Market Rotation Universe**: US sector ETFs, benchmark index ETFs, and the app-defined core ETF list. Arbitrary custom symbols, one-off user inputs, cold tickers, and unknown or invalid tickers are not automatically persisted; custom rows may still be shown with live data when available, but without guaranteed 2-week snapshot comparison.

Snapshot calculation reads from persisted `market_daily_price` data. The batch job may fetch missing OHLCV data from Yahoo or another provider, but fetched prices must first be written into `market_daily_price`; snapshot calculation must then read from persisted prices rather than live provider responses.

Qualified snapshot dates are evaluated per rank scope. A date is qualified for a rank scope when at least 90% of that scope's active canonical symbols have successfully generated Market Rotation Snapshots.

The 2-week comparison date is the latest qualified Market Rotation Snapshot date for the same rank scope counted back by 10 qualified snapshot dates. It is not 14 calendar days ago, and it is not selected independently per symbol; rank deltas and performance comparisons use a shared comparison date within the rank scope.

The first version supports only three rank scopes: `sectors`, `indexes`, and `core`. `sectors` contains US sector ETFs and drives the main Sector Rotation Matrix. `indexes` contains benchmark index ETFs and supports market snapshot, Market State, and benchmark comparison. `core` contains the app-defined core ETF list and is reserved for broader ETF monitoring and future All Core ETFs views.

The first version deliberately does not implement an `all`, `global`, or mixed rank scope. Rank is only meaningful within a comparable universe; mixing sector exposure, broad market beta, industry ETFs, bond proxies, and commodity ETFs into one ranking creates attractive-looking but semantically weak numbers.

All percentile calculations and rotation ranks are scoped by `rank_scope`. The system does not expose cross-scope percentiles, global percentiles, or mixed ranking.

The v1 MA score is `20 * above_10d + 30 * above_20d + 50 * above_50d`, where `above_10d` means close is above the 10d EMA, `above_20d` means close is above the 20d EMA, and `above_50d` means close is above the 50d SMA. The score ranges from 0 to 100. The 50d SMA carries the highest weight because it better reflects short-to-medium term trend structure; the 10d EMA is tactical and noisier, while the 20d EMA captures short-term momentum.

Snapshots may store `sma_200` and `above_200d` for future Market State analysis, but 200d is not included in the v1 MA score.

The canonical MA Status values are `bullish_stack`, `healthy_pullback`, `short_term_weakness`, `recovering`, `breakdown`, and `unknown`. They map to the v1 MA score inputs while preserving useful state transitions for the signal engine, especially `recovering` for early rotation turns where a symbol is still below the 50d SMA but has regained the 10d EMA or 20d EMA.

Distance from high is calculated against the rolling 252 trading day high: `percent_from_high = (close / rolling_252d_high - 1) * 100`. The raw score is `clamp(100 + percent_from_high * 5, 0, 100)`, so 0% from high scores 100, -5% scores 75, -10% scores 50, and -20% or worse scores 0. The raw score is stored for display and debugging, while rotation score uses a percentile of `distance_from_high_score` within the same `rank_scope`. If 252 trading days are unavailable, the maximum high from available history may be used only when at least 60 trading days exist; otherwise distance-from-high fields are unknown.

The v1 rotation score is composed entirely from scope-local percentile components: `0.30 * rsi_percentile + 0.30 * two_week_performance_percentile + 0.20 * ma_score_percentile + 0.20 * distance_from_high_score_percentile`. `ma_score` and `distance_from_high_score` are calculated as raw scores first, then converted into scope-local percentiles. If any component is unknown, `rotation_score` is unknown; unknown components are never filled with 0. `rotation_rank` is generated only among symbols with complete `rotation_score` values.

The v1 rotation signal labels are `turning_strong`, `strong_but_extended`, `losing_momentum`, `breaking_down`, `early_recovery`, and `neutral`. Signals are evaluated in this priority order: `breaking_down > strong_but_extended > turning_strong > early_recovery > losing_momentum > neutral`.

`breaking_down` applies when `ma_status` is `breakdown` and rank, RSI, or 2-week performance is weakening. `strong_but_extended` applies when `ma_status` is `bullish_stack`, RSI is at least 70, and close is within 3% of the 52-week high. `turning_strong` applies when `ma_status` is `bullish_stack` or `healthy_pullback`, rank improves by at least 2 places, RSI improves by at least 5 points, and 2-week performance is positive. `early_recovery` applies when `ma_status` is `recovering`, RSI is at least 40, and rank, RSI, or 2-week performance is improving. `losing_momentum` applies when `ma_status` is `short_term_weakness` or `healthy_pullback`, rank drops by at least 2 places, and RSI or 2-week performance is weakening. `neutral` applies only when complete data exists and none of the other rules trigger.

If required signal data is missing, signal is `null` with `signal_status = insufficient_data`; missing data is not classified as `neutral`.

V1 summary breadth cards are aggregated from the `sectors` rank scope only. Above 20d EMA breadth, Above 50d SMA breadth, and Average RSI use the active canonical symbols in the sectors universe. Index ETFs are used for benchmark trend and Market State confirmation, not as breadth constituents. Core ETFs may get their own breadth metrics in a future core-specific view, but they are not mixed into the main Market Rotation Monitor breadth cards.

The Market Rotation Monitor page reads its primary dashboard payload from `/api/market/rotation-monitor`. That endpoint should return all dashboard data needed for rendering and basic export: snapshot-backed rows, comparison deltas, summary cards, chart data, Market State fields, current market summary, and data-quality metadata. CSV, Copy Table, and PNG export are generated from the same payload used by the page. The existing `/api/market/sector-board` API remains available, but it is not the primary data source for the Market Rotation Monitor page.

V1 filters are client-side view filters over the `/api/market/rotation-monitor` payload. The API returns complete rows for the selected scope, and filters such as Turning Strong, Losing Momentum, Rank Up, Rank Down, Above 50d, Below 50d, Near High, and Extended are derived from row fields like `signal`, `rankDelta`, `above50d`, `percentFromHigh`, and `rsi`.

2-week trend sparklines are normalized performance charts with the comparison snapshot date set to 100: `normalized_value = price_on_date / price_on_comparison_date * 100`. All symbols in the same `rank_scope` use the same qualified snapshot date sequence. The first point is the comparison snapshot date and equals 100; the last point is the latest qualified snapshot date. `twoWeekPerformancePct` equals `latestNormalizedValue - 100`. Performance calculations use `adjusted_close` when available and fall back to `close`. If the comparison date is missing for a symbol, its sparkline and 2-week performance are unavailable. Intermediate missing dates are returned as `null`; the system does not interpolate or use min-max, z-score, or per-symbol first-available-date normalization.

Top 3 improving and bottom 3 weakening charts are sorted by `rankDelta2W`, where `rankDelta2W = comparisonRank - currentRank`. Positive values indicate leadership improvement; negative values indicate weakening. Only rows with complete latest and comparison rank data are eligible. Top improvers are the rows with the highest positive `rankDelta2W`; bottom weakening symbols are the rows with the lowest negative `rankDelta2W`. Tie-breakers are `rankDelta2W`, `rotationScoreDelta2W`, `twoWeekPerformancePct`, `rsiDelta2W`, and `currentRotationRank`. The chart does not use 2-week performance as the primary sort because it is about rotation leadership changes, not pure return ranking.

The v1 Current Market Summary is generated from deterministic templates, not an LLM. It uses the same dashboard payload as the page and export: `marketState`, `breadthCondition`, `breadthConfirmation`, top improving symbols, bottom weakening symbols, Above 50d breadth ratio, and Average RSI.

The v1 snapshot schema stores daily scalar fields only: `date`, `symbol`, `rank_scope`, `group_type`, `sector_name`, `last_price`, `adjusted_close`, daily/weekly/2-week performance, RSI 14 and percentile, 2-week RSI delta, 10d/20d EMAs, 50d/200d SMAs, above-MA booleans, MA score and percentile, MA status, rolling 252d high, percent from high, distance-from-high score and percentile, rotation score, 2-week rotation score delta, rotation rank, 2-week rank delta, signal, signal status, and timestamps. The table should enforce uniqueness on `(rank_scope, symbol, date)` and index `(rank_scope, date, rotation_rank)` plus `(rank_scope, date)`.

2-week sparkline series are not stored in individual snapshot rows. They are API view aggregates built from the shared qualified date sequence and persisted price/snapshot data.
