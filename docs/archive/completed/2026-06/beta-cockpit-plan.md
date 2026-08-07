# Beta Cockpit Upgrade Plan

## 狀態

**已實作（2026-06-21）。** 9 個 commit 已落地（見 `git log --grep=beta-cockpit` 與相關 feat/refactor commits），原 plan 8 個 phase + Eng Review 14 個 findings 全數吸收。

唯一待收尾的 critical gap（NaN quantity 無測試無處理）於 2026-06-21 修復：
- `lib/portfolio-exposure/exposure.ts` 的 `resolveMarketValue` 加 `Number.isFinite` guard，並在 `PortfolioExposure` 加 `skippedCount: number` 暴露異常持股數
- `tests/unit/lib/portfolio-exposure/exposure.test.ts` 加 6 個 regression case
- `components/PortfolioExposurePanel.vue` 顯示 `portfolioExposure.skippedWarning`，使用者不再「看到錯誤 % 而不知」

本計畫是 `market-rotation-monitor-design.md` 的延伸：把 Market Rotation Monitor 從「觀測市場狀態」升級成「給出 Beta 配置建議」的 Beta Cockpit，並串接既有 Portfolio 資料做 Exposure Analysis。

## Context

`invest-diary` 目前已具備 market rotation、breadth、ETF monitor、portfolio tracking、diary、trade plans、performance stats 等基礎。下一步的產品跳躍是：**把 market signals 連到 portfolio 決策**，讓使用者能回答：

> Should I increase beta, reduce beta, stay in core index exposure, or raise cash?

本 phase 不做 AI、options flow、valuation API 或完整 VCP pattern detection。

## Related Docs

- `docs/plans/active/market-rotation-monitor-design.md` — Market Rotation Monitor 的基礎設計，本計畫直接延伸
- `DESIGN.md` — UI 視覺與 design token 規範，Phase 4/6 的 UI 改動必須遵循
- `CLAUDE.md` — API handler、BigInt 序列化、Query Layer 架構規範

---

## Goal

Upgrade `invest-diary` from an investment diary + market rotation monitor into a **Beta Cockpit** that helps the user decide:

> Should I increase beta, reduce beta, stay in core index exposure, or raise cash?

The project already has market rotation, breadth, ETF monitor, portfolio tracking, diary, trade plans, and performance stats. The next step is to connect market signals to portfolio decision-making.

---

## Scope

This plan focuses on 4 deliverables:

1. Fix incomplete / inconsistent market rotation scope logic
2. Implement a real `core` universe based on ETF + M7 + user watchlist
3. Add a Beta Allocation Engine
4. Add Portfolio Exposure Analysis

Do not add AI, options flow, valuation API, or complex VCP pattern detection in this phase.

---

# Phase 0 — Cleanup and Consistency Fixes

## 0.1 Fix `--scope` behavior in market rotation batch

### Problem

Current CLI accepts `--scope`, but execution still runs full batch first and only filters the result afterward.

### Required Change

Update batch execution logic:

```ts
if (scope === 'all') {
  return runFullBatch(prisma)
}

return runScopeBatch(prisma, scope)
```

### Acceptance Criteria

* `npm run market-rotation:batch -- --scope=sectors` only runs sector universe
* `--scope=indexes` only runs index universe
* `--scope=core` only runs core universe
* `--scope=all` runs all scopes
* Unit tests cover all scope cases

---

## 0.2 Decide and normalize supported scopes

### Problem

`core` exists in types and batch, but API rejects it because it is not a real universe yet.

### Required Change

Make `core` a real supported scope.

Valid scopes should be:

```ts
sectors
indexes
core
watchlist
```

For this phase, `watchlist` can be added as a planned extension if implementation is too large, but `core` must be real.

### Acceptance Criteria

* `/api/market/rotation-monitor?scope=core` works
* `/tools/etf` shows Core tab
* Core scope is no longer identical to indexes
* No dead or reserved scope remains in production code

---

# Phase 1 — Real Core Universe

## 1.1 Redefine Core Universe

### Goal

Create a core universe that reflects the user's actual trading/investment framework.

### Suggested Core Universe

```ts
const CORE_UNIVERSE = [
  // Core Index
  'SPY',
  'VOO',
  'QQQ',
  'QQQM',

  // High Beta ETF
  'SOXX',
  'SMH',
  'XLK',
  'IGV',

  // Mega Cap / AI Leaders
  'NVDA',
  'MSFT',
  'AAPL',
  'GOOGL',
  'AMZN',
  'META',
  'TSLA',

  // Optional user focus names
  'MU',
  'PLTR',
  'CRWV'
]
```

### Required Fields

Each universe entry should have:

```ts
symbol
name
rankScope
groupType
sectorName
theme
betaBucket
```

Example:

```ts
{
  symbol: 'SOXX',
  name: 'iShares Semiconductor ETF',
  rankScope: 'core',
  groupType: 'etf',
  sectorName: 'Semiconductor',
  theme: 'AI / Semi',
  betaBucket: 'high_beta'
}
```

### Beta Bucket Values

```ts
core_index
high_beta
mega_cap
single_stock
defensive
cash_proxy
```

### Acceptance Criteria

* Core universe can be ranked using the existing rotation pipeline
* Core rows include `theme` and `betaBucket`
* Core tab appears in ETF tool
* Existing sectors/indexes behavior remains unchanged

---

# Phase 2 — Beta Allocation Engine

## 2.1 Add Beta Policy Model

### Goal

Convert market state and rotation data into suggested exposure.

Create new module:

```text
lib/beta-allocation/policy.ts
```

### Input

```ts
interface BetaAllocationInput {
  marketState: 'risk_on' | 'neutral' | 'defensive' | 'risk_off' | 'unknown'
  breadthConfirmation: 'confirming' | 'mixed' | 'warning' | 'unknown'
  above50dRatio: number | null
  averageRsi: number | null
  leadership: {
    topImproving: string[]
    bottomWeakening: string[]
  }
}
```

### Output

```ts
interface BetaAllocationResult {
  suggestedMode: 'aggressive' | 'balanced' | 'defensive' | 'capital_preservation' | 'unknown'
  suggestedBetaLevel: number | null
  highBetaTargetPct: number
  coreIndexTargetPct: number
  cashTargetPct: number
  explanation: string
  warnings: string[]
}
```

---

## 2.2 Allocation Rules

### Suggested Initial Rules

| Market State |          Breadth | Suggested Mode       | High Beta | Core Index | Cash |
| ------------ | ---------------: | -------------------- | --------: | ---------: | ---: |
| risk_on      |       confirming | aggressive           |       60% |        30% |  10% |
| risk_on      |            mixed | balanced             |       45% |        45% |  10% |
| neutral      | confirming/mixed | balanced             |       30% |        60% |  10% |
| defensive    |    mixed/warning | defensive            |       10% |        60% |  30% |
| risk_off     |              any | capital_preservation |        0% |        40% |  60% |
| unknown      |              any | unknown              |        0% |        50% |  50% |

### Additional Warning Rules

Add warnings when:

* above50dRatio < 0.35
* averageRsi > 70
* marketState is risk_on but breadthConfirmation is warning
* top improving list is empty
* bottom weakening contains major leadership ETF such as QQQ, SOXX, SMH, XLK, IGV

### Acceptance Criteria

* Pure function with unit tests
* No database dependency
* No UI dependency
* Deterministic output for same input
* Easy to tune later

---

# Phase 3 — API Integration

## 3.1 Extend Market Rotation Monitor Payload

### Current API

```text
GET /api/market/rotation-monitor?scope=sectors
```

### Required Change

Add `betaAllocation` to response payload.

```ts
{
  summary,
  rows,
  topImproving,
  bottomWeakening,
  dataQuality,
  currentMarketSummary,
  betaAllocation
}
```

### Acceptance Criteria

* Existing UI does not break
* API works for `sectors`, `indexes`, and `core`
* `betaAllocation` is generated server-side
* Unit tests cover payload generation

---

## 3.2 Add Current Market Summary Enhancement

Current summary should include beta suggestion.

Example:

```text
Market is risk-on with confirming breadth. Semiconductor and technology leadership remain strong. Suggested posture is aggressive: maintain high beta exposure, but avoid chasing extended names.
```

### Acceptance Criteria

* Summary mentions market state
* Summary mentions breadth condition
* Summary mentions leadership
* Summary mentions suggested beta mode
* No AI dependency

---

# Phase 4 — UI: Beta Cockpit Card

## 4.1 Add Beta Cockpit Card to `/tools/etf`

Add a new top-level dashboard card above the rotation table.

### Required Display

```text
Beta Cockpit

Market State: Risk On
Suggested Mode: Aggressive
Suggested Beta Level: 1.35x

Suggested Allocation:
High Beta: 60%
Core Index: 30%
Cash: 10%
```

### Required Visual Elements

* Mode badge
* Allocation bars
* Warning list
* Short explanation
* Last updated date

### Acceptance Criteria

* Works on desktop and mobile
* Does not overcrowd existing table
* Clear enough to screenshot/share
* Included in PNG export if feasible

---

# Phase 5 — Portfolio Exposure Analysis

## 5.1 Add Beta Bucket Mapping

Create a mapping layer:

```text
lib/portfolio-exposure/beta-buckets.ts
```

Example:

```ts
{
  QQQ: 'core_index',
  QQQM: 'core_index',
  VOO: 'core_index',
  SPY: 'core_index',
  SOXX: 'high_beta',
  SMH: 'high_beta',
  IGV: 'high_beta',
  XLK: 'high_beta',
  NVDA: 'mega_cap',
  MSFT: 'mega_cap',
  META: 'mega_cap',
  AMZN: 'mega_cap',
  GOOGL: 'mega_cap',
  AAPL: 'mega_cap',
  TSLA: 'mega_cap',
  MU: 'single_stock',
  PLTR: 'single_stock',
  CRWV: 'single_stock'
}
```

---

## 5.2 Compute Current Portfolio Exposure

Add a function:

```ts
computePortfolioExposure(holdings)
```

### Output

```ts
interface PortfolioExposure {
  highBetaPct: number
  coreIndexPct: number
  megaCapPct: number
  singleStockPct: number
  unknownPct: number
  largestTheme: string | null
  concentrationWarning: boolean
}
```

### Acceptance Criteria

* Uses current market value if price exists
* Falls back to cost if price missing
* Handles unknown tickers
* Unit tests cover edge cases

---

## 5.3 Compare Actual vs Suggested Allocation

Add comparison:

```ts
interface ExposureGap {
  bucket: string
  currentPct: number
  targetPct: number
  gapPct: number
  status: 'underweight' | 'balanced' | 'overweight'
}
```

### Example Output

```text
High Beta: current 72%, target 45%, overweight by 27%
Core Index: current 20%, target 45%, underweight by 25%
Cash: current 8%, target 10%, balanced
```

### Acceptance Criteria

* Shown on portfolio dashboard
* Does not require brokerage integration
* Works from existing holdings data

---

# Phase 6 — Portfolio Dashboard UI

## 6.1 Add Exposure Panel to `/stocks`

Add a new panel under existing Risk Summary.

### Required Display

```text
Portfolio Exposure vs Suggested Allocation

Current:
High Beta 72%
Core Index 20%
Cash 8%

Suggested:
High Beta 45%
Core Index 45%
Cash 10%

Status:
You are overweight high beta relative to current market regime.
```

### Acceptance Criteria

* Uses same design language as existing stock dashboard
* Shows clear warning when overweight high beta during defensive/risk_off market
* Does not block page if market rotation data is missing
* Falls back gracefully to “No market regime data”

---

# Phase 7 — Tests

## Required Unit Tests

Add tests for:

```text
lib/beta-allocation/policy.ts
lib/portfolio-exposure/beta-buckets.ts
lib/portfolio-exposure/exposure.ts
server/api/market/rotation-monitor.get.ts
scripts/market-rotation/run-batch.ts
```

### Test Cases

* risk_on + confirming breadth => aggressive allocation
* risk_on + warning breadth => balanced / warning
* defensive => defensive allocation
* risk_off => capital preservation
* unknown => safe fallback
* core universe returns expected symbols
* scope batch only runs requested scope
* portfolio exposure handles missing prices
* unknown tickers go into unknown bucket

---

# Phase 8 — Documentation

## 8.1 Update README

Add section:

```md
## Beta Cockpit

The Beta Cockpit converts market regime, breadth, and rotation leadership into a suggested portfolio beta posture.
```

Include:

* what it does
* what it does not do
* how to run batch
* how to interpret suggested allocation

---

## 8.2 Add Internal Design Doc

Create:

```text
docs/BETA_COCKPIT.md
```

Content:

```md
# Beta Cockpit Design

## Purpose
## Data Sources
## Market State Inputs
## Allocation Policy
## Portfolio Exposure Buckets
## Limitations
## Future Extensions
```

---

# Out of Scope

Do not implement in this phase:

* AI-generated market summaries
* Options flow
* Gamma exposure
* Valuation / PE data API
* SEC / FRED data integration
* Full VCP / cup-and-handle scanner
* Broker sync
* Auto trading
* Push notification recommendations

These can be future phases.

---

# Final Acceptance Criteria

The goal is complete when:

* `/tools/etf` shows market state, rotation table, and beta allocation suggestion
* `/tools/etf?scope=core` works with real core universe
* Batch scope works correctly and does not run unnecessary scopes
* `/stocks` shows current portfolio exposure vs suggested allocation
* User can clearly answer:

  * Is the market risk-on or risk-off?
  * Which group is leading?
  * Am I too exposed to high beta?
  * Should I add beta, reduce beta, or stay balanced?
* Unit tests pass
* Typecheck passes
* Existing sector/index rotation monitor still works

---

# Recommended Implementation Order

1. Fix batch `--scope`
2. Implement real `core` universe
3. Enable `core` scope in API and UI
4. Add beta allocation pure function
5. Extend rotation monitor API payload
6. Add Beta Cockpit card to `/tools/etf`
7. Add portfolio exposure calculation
8. Add exposure comparison to `/stocks`
9. Add tests
10. Update docs

---

# Suggested Commit Breakdown

## Commit 1

```text
fix: make market rotation batch respect scope argument
```

## Commit 2

```text
feat: define real core market rotation universe
```

## Commit 3

```text
feat: add beta allocation policy engine
```

## Commit 4

```text
feat: expose beta allocation in rotation monitor API
```

## Commit 5

```text
feat: add beta cockpit card to ETF tool
```

## Commit 6

```text
feat: add portfolio exposure analysis
```

## Commit 7

```text
feat: compare portfolio exposure against suggested allocation
```

## Commit 8

```text
test: cover beta cockpit and portfolio exposure logic
```

## Commit 9

```text
docs: document beta cockpit design and usage
```

---

# Engineering Review Findings (2026-06-18, /plan-eng-review)

本 plan 經過 Step 0 Scope Challenge + Architecture / Code Quality / Tests / Performance 四段 review，產生以下決議。每個 finding 標註 confidence（1-10）與使用者已確認的方向。

## Scope 決議

Step 0 complexity check 觸發（plan 觸及 >8 檔案 + 2 個新 service），但**保留原 4 deliverables**：plan 的產品價值是連貫的，拆開交付會破壞整體價值。前提是修正下方 6 個 architecture findings + 4 個 code quality findings + test 清單擴展。

## Architecture Findings

### A1 (P1, confidence: 9/10) — Phase 0.1 fix 點描述不準確【必修】

**Plan 原本說：**
> Update batch execution logic:
> ```ts
> if (scope === 'all') return runFullBatch(prisma)
> return runScopeBatch(prisma, scope)
> ```

**Codebase 現狀：** `runScopeBatch` 早就實作於 `server/utils/market-rotation-batch.ts:176-282`。真正「先跑全部再過濾」的毒點是 `scripts/market-rotation/run-batch.ts:88-129` 的 `executeBatch()`：

```ts
// scripts/market-rotation/run-batch.ts:93-98
const fullResult = await runFullBatch(prisma as Parameters<typeof runFullBatch>[0])
const filteredResults = scope === 'all'
  ? fullResult.results
  : fullResult.results.filter(r => r.rankScope === scope)  // ← 後置 filter
```

**修正後 Phase 0.1：**
- 真正要改的是 `executeBatch(options)`，不是新增 `runScopeBatch`
- `scope === 'all'` 走 `runFullBatch(prisma)`，其他 scope 直接 `runScopeBatch(prisma, scope)`
- Acceptance Criteria 補一條：「`executeBatch({ scope: 'sectors' })` 不會 fetch indexes/core 的 canonical prices」
- 既有測試 `tests/unit/scripts/market-rotation/run-batch.test.ts` 只測 `runFullBatch` 路徑，必須加 `runScopeBatch` 路徑的 regression test

### A2 (P1, confidence: 9/10) — Core universe 混 ETF + single stock 在 percentile pipeline 統計無意義【必修】

**問題：** `lib/market-rotation/scope-enrichment.ts:38-53` 的 percentile 跨整個 scope 計算。若把 NVDA/TSLA（高波動）跟 SPY/QQQ（低波動）放同一個 rank pool，rotationRank 會被 single stock 主導，top improving / bottom weakening 訊號失真。

**決議：拆為兩個 pool**

- **Core ETF pool**：SPY / VOO / QQQ / QQQM / SOXX / SMH / XLK / IGV
- **Mega Cap / Single Stock pool**：NVDA / MSFT / AAPL / GOOGL / AMZN / META / TSLA / MU / PLTR / CRWV

rotationRank、percentile 在各自 pool 內計算。UI 在 Core tab 顯示兩個子 section（或兩個 tab）。

**Plan 修正：** Phase 1.1 的 `CORE_UNIVERSE` 拆為 `CORE_ETF_UNIVERSE` 與 `MEGA_CAP_UNIVERSE` 兩個常數，`getCoreUniverse()` 回傳合併视图但 pipeline 處理時區分 pool。

### A3 (P0, confidence: 10/10) — `groupType` 型別 breaking change【必修】

**問題：** `lib/market-rotation/monitor.ts:14` 寫死：

```ts
groupType: 'sector' | 'index' | 'core'
```

Plan Phase 1.1 範例用 `groupType: 'etf'`，TypeScript 會報錯。

**決議：擴展 groupType 與 betaBucket 對應**

新 groupType 聯集：`'sector' | 'index' | 'core_etf' | 'mega_cap' | 'single_stock'`

每個 universe entry 的 groupType 直接反映 betaBucket：
- `core_index` → `core_etf`（修正命名，因為 `index` 已被既有 indexes scope 用走）
- `high_beta` → `core_etf`（同上，因為 SOXX/SMH/XLK/IGV 都在 core ETF pool）
- `mega_cap` → `mega_cap`
- `single_stock` → `single_stock`
- `defensive` / `cash_proxy` → 新增 groupType 或保留為 `core_etf` 子分類

monitor.ts、universe.ts 同步更新。若 prisma schema 的 `groupType` 欄位是 enum，需加 migration。

### A4 (P1, confidence: 9/10) — `Holding` 沒 market value，但 plan 假設有【必修】

**問題：** `lib/utils.ts:16-21` 的 `Holding` 只有 `quantity / avgCost / totalCost`，沒 price 或 marketValue。Plan Phase 5.2 要求「Uses current market value if price exists / Falls back to cost」— Holding 根本沒 price 欄位。

**決議：用 `HoldingView[]`，不用 `Holding[]`**

`lib/stocks-view.ts:11-17` 的 `HoldingView` 有 `price?`、`marketValue`、`concentrationPct`。Phase 5.2 的 `computePortfolioExposure(holdings: HoldingView[])` 直接復用現有 pipeline（`server/api/stocks/holdings.get.ts` → `calculateHoldings` → `buildHoldingsView`）。

**A5（Decimal 處理）自動解決：** `HoldingView` 已是 `number` 型別（lib/utils.ts:40 用 `Number(tx.quantity)` 處理過 Decimal），`computePortfolioExposure` 不需再處理 Decimal。

### A6 (P2, confidence: 8/10) — Batch cron schedule 未定義【必修】

**問題：** Plan Phase 4.1 要顯示「Last updated date」，但 cron 頻率與 scope 規劃沒寫進 plan。core scope 變真實後若 cron 沒跑，core 永遠 stale。

**決議：加 Phase 0.3「Batch cron 設定」**

- 預設 cron：美東收盤後 17:00 ET（21:00 UTC）跑 `tsx scripts/market-rotation/run-batch.ts --scope=all`
- K8s CronJob YAML 範例（schedule、successfulJobsHistoryLimit、failedJobsHistoryLimit）
- 失敗 alerting：釘到既有的 logger / 通知 pipeline
- 各 scope 的 batch 失敗獨立處理（core fail 不影響 sectors）

## Code Quality Findings

### C1 + C4 (P2, confidence: 9/10) — Allocation Rule 表覆蓋度【必修】

**問題：**
- Phase 2.2 表格 6 行沒覆蓋全部 20 格（marketState × breadth = 5 × 4）
- `unknown + any` 沒 explicit fallback rule
- Phase 1.1 列了 `defensive` / `cash_proxy` 兩個 beta bucket，但 universe 沒對應 ticker

**決議：補齊**

- 完整 20 格 decision table（包含 neutral × {confirming, mixed, warning}、defensive × confirming、unknown × {confirming, mixed, warning}）
- Fallback rule：「未列出的組合走最保守的 mode」
- Universe 補上 defensive ticker（XLP / XLU / TLT）與 cash_proxy ticker（BIL / SGOV）

### C2 (P2, confidence: 9/10) — Beta bucket mapping 維護策略【必修】

**決議：Hardcoded + Unknown 可見**

- mapping 寫在 `lib/portfolio-exposure/beta-buckets.ts`（hardcoded）
- 提供 config-driven 擴充點註解（未來如需動態可改）
- Unknown bucket 在 UI 顯示「Unclassified — manual review」警告（不靜默）

### C3 (P2, confidence: 8/10) — Phase 6「Risk Summary」插入點不明【必修】

**問題：** Plan Phase 6.1 寫「Add a new panel under existing Risk Summary」，但 `pages/stocks/index.vue` 沒有名為 "Risk Summary" 的 element。

**決議：** Plan 補上具體插入點（例如：在 portfolio 區塊下方、position-sizing link 旁），並附 page 結構示意圖。

### C5 (P3, confidence: 8/10) — Phase 3.2 summary 缺 i18n 策略【必修】

**問題：** CLAUDE.md 要求三語 i18n（en/zh-TW/zh-CN），但 plan 的 summary 模板跟 explanation 字串都純英文。

**決議：** Plan 補上 i18n key 路徑：
- `i18n/locales/{en,zh-TW,zh-CN}.json` 新增 `betaCockpit.*` 區塊
- 鍵路徑範例：`betaCockpit.allocation.highBeta`、`betaCockpit.summary.betaSuggestion`、`betaCockpit.warnings.*`

## Test Plan (擴展後)

### 必備測試清單

**Beta Allocation Engine (`lib/beta-allocation/policy.ts`)**
- 20 格 marketState × breadth 全覆蓋（每格 1 個 test case）
- 5 個 warning rule 各自獨立測試（above50dRatio < 0.35、averageRsi > 70、risk_on + warning breadth、topImproving empty、bottomWeakening 含 QQQ/SOXX/SMH/XLK/IGV）
- `suggestedBetaLevel` 公式 + 邊界值
- 純函數 deterministic：相同 input 必產生相同 output

**Portfolio Exposure (`lib/portfolio-exposure/exposure.ts` + `beta-buckets.ts`)**
- empty holdings → all zeros
- 全部 known tickers
- 全部 unknown tickers → `unknownPct = 100`
- mixed known/unknown
- case sensitivity：`nVdA` vs `NVDA` 應同一 bucket
- concentrationWarning 邊界
- compareExposureToTarget：underweight / balanced / overweight 三種 status 邊界
- defensive / cash_proxy bucket lookup

**[CRITICAL REGRESSION] `executeBatch` scope filter 移除**
- `scope='sectors'` 只跑 `runScopeBatch(prisma, 'sectors')`，不呼叫 indexes/core 的 canonical fetch
- `scope='indexes'` 同上
- `scope='core'` 同上
- `scope='all'` 走 `runFullBatch`，三個 scope 都跑
- 這組測試是 A1 fix 的唯一證明

**API payload (`server/api/market/rotation-monitor.get.ts`)**
- `scope=core` 回傳真 core universe 而非 404
- `betaAllocation` 在 response payload
- `currentMarketSummary` 含 beta suggestion 文字
- 既有 sectors/indexes scope 行為不變

**Universe (`lib/market-rotation/universe.ts`)**
- `getCoreUniverse()` 回傳拆分後的 core_etf + mega_cap
- theme、betaBucket fields populated

**[→E2E] UI**
- `/tools/etf` 開頁看到 Beta Cockpit card
- `/stocks` 開頁看到 Portfolio Exposure panel
- overweight high beta 時警告顯示

## Performance Plan

- **P1 — Batch fetch backoff：** `lib/market-data/yahoo-request-queue.ts` 已存在，core universe 從 8 增加到 17 個 ticker，每 batch 多 ~10 秒可接受。Plan 必須明說「復用既有 queue，不重新寫 fetch 邏輯」
- **P2 — Portfolio exposure price 快取：** `computePortfolioExposure` 接 `HoldingView[]`，price 來自既有 quote pipeline（`market_daily_price` + 即時快取）。Plan 必須明說「不另外開新 quote API」

## NOT in scope

- AI 市場摘要生成
- Options flow / gamma exposure
- Valuation / PE data API
- SEC / FRED 資料整合
- 完整 VCP / cup-and-handle scanner
- Broker sync
- 自動交易
- 推播建議
- **Beta bucket 動態設定 UI**（V1 hardcoded 即可，C2 決議）
- **新 quote API**（復用既有 yahoo-request-queue，P2 決議）

## What already exists (復用)

| 現有代碼 | 用途 | 復用方式 |
|---------|------|---------|
| `server/utils/market-rotation-batch.ts:176` `runScopeBatch` | 單 scope batch | A1 fix 後 `executeBatch` 直接呼叫 |
| `lib/market-rotation/scope-enrichment.ts:38-53` | percentile pipeline | A2 pool 拆分後仍復用，scope 維度增加 |
| `lib/market-rotation/summary.ts:67` `generateMarketSummary` | 純函數 summary | Phase 3.2 擴展輸入參數 |
| `server/api/market/rotation-monitor.get.ts` | API endpoint | Phase 3.1 加 `betaAllocation` 欄位 |
| `server/api/stocks/holdings.get.ts` + `lib/utils.ts:36` `calculateHoldings` | Holdings 計算 | Phase 5 直接消費 |
| `lib/stocks-view.ts:11` `HoldingView` | 含 marketValue 的 holdings view | A4 決議：用此不用 `Holding` |
| `lib/market-data/yahoo-request-queue.ts` | Yahoo fetch rate-limit queue | P1 決議：復用，core universe fetch 走此 queue |
| `server/plugins/bigint.ts` + `server/utils/serialize.ts` | BigInt 序列化 | API response 自動處理 |
| `i18n/locales/{en,zh-TW,zh-CN}.json` | 三語翻譯 | C5：新增 `betaCockpit.*` 區塊 |
| `tests/unit/scripts/market-rotation/run-batch.test.ts` | 既有 batch 測試 | Phase 0.1 regression test 直接擴展 |

## Failure modes

| 失效情境 | 程式路徑 | 是否有測試 | 是否有 error handling | 使用者看到 |
|---------|---------|-----------|---------------------|------------|
| Yahoo rate-limit 時 core batch 掛掉 | `ensureCanonicalPrices` | 無 | warn log + throw | batch 靜默失敗，UI 顯示 stale |
| Core universe 的 single stock split（如 TSLA 2022 split） | pipeline snapshot-builder | 無 | 無 | rotationRank 突變，使用者困惑 |
| Beta allocation 收到 `marketState='unknown'` + `breadth='confirming'`（plan 未定義組合） | policy.ts | 將被 C1 新測試覆蓋 | fallback to `unknown` mode | 看到「unknown」配置建議 |
| Holdings 出現 NaN quantity（Decimal parse 邊界） | `lib/utils.ts:40` `Number(tx.quantity)` | ✅ 已修（2026-06-21） | ✅ `exposure.ts` `Number.isFinite` guard + `skippedCount` + UI 警告 | `skippedCount` 顯示於 Portfolio Exposure Panel |
| `betaAllocation` payload 在 prisma serialize 時 BigInt crash | API handler | 無 | 既有 `serialize()` 處理 | 應自動處理，需加測試驗證 |

**Critical gap：** ~~第 4 項（NaN quantity）目前無測試無處理，使用者會看到錯誤 % 而不知。~~ **已修復（2026-06-21）** — 見上方狀態欄與 `tests/unit/lib/portfolio-exposure/exposure.test.ts` 的 `invalid holdings (NaN / Infinity guard)` 區塊。

## Worktree parallelization strategy

### 依賴表

| Step | Modules touched | Depends on |
|------|----------------|------------|
| Phase 0.1（executeBatch fix） | scripts/market-rotation/, server/utils/market-rotation-batch.ts | — |
| Phase 0.3（cron 新增） | docs/, k8s yaml | — |
| Phase 1（universe 重寫） | lib/market-rotation/ | — |
| Phase 2（beta policy） | lib/beta-allocation/（新） | — |
| Phase 3（API payload） | server/api/market/, lib/market-rotation/summary.ts | Phase 1, 2 |
| Phase 4（Cockpit UI） | pages/tools/etf.vue, components/ | Phase 3 |
| Phase 5（exposure） | lib/portfolio-exposure/（新）, server/api/stocks/ | — |
| Phase 6（Portfolio UI） | pages/stocks/, components/ | Phase 5, 3（取 betaAllocation） |
| Phase 7（tests） | tests/ | Phase 1-6 |

### 平行 lanes

- **Lane A（market rotation pipeline）**：Phase 0.1 → Phase 1 → Phase 3 → Phase 4 → Phase 7（rotation 部分）
- **Lane B（beta allocation engine）**：Phase 2 → 等待 Lane A 的 Phase 3 完成 → Phase 7（policy 部分）
- **Lane C（portfolio exposure）**：Phase 5 → Phase 6 → Phase 7（exposure 部分）
- **Lane D（ops）**：Phase 0.3 獨立可平行

### 執行順序

1. 啟動 Lane A + Lane C + Lane D 三個 worktree 平行
2. Lane B 在 Lane A 的 Phase 3 完成後啟動
3. Phase 7（整合測試）等所有 lane 收斂後再跑

### 衝突旗標

- Lane A 與 Lane B 都動 `lib/market-rotation/` — 合併時需注意 Phase 3 API 處與 Phase 2 policy 引用
- Lane A 與 Lane C 都動 `server/api/` — 但不同子目錄，低衝突

## Implementation Tasks

依本 review findings 衍生，每項 task 對應一個 finding。Implementation 時可用 Claude Code 或 Codex 跑。

- [ ] **T1 (P1, human: ~30min / CC: ~5min)** — Phase 0.1 — 修 `executeBatch` scope filter
  - Surfaced by: Architecture A1 — runScopeBatch 已存在，真正 fix 點是 executeBatch
  - Files: `scripts/market-rotation/run-batch.ts:88-129`, `tests/unit/scripts/market-rotation/run-batch.test.ts`
  - Verify: `npm test -- run-batch` 通過 + `npm run market-rotation:batch -- --scope=sectors` 不 fetch indexes/core

- [ ] **T2 (P1, human: ~3h / CC: ~20min)** — Phase 1 — Core universe 拆 pool + groupType 擴展
  - Surfaced by: Architecture A2 + A3 — 拆 pool 確保 percentile 有意義；groupType 擴展避免 TS error
  - Files: `lib/market-rotation/universe.ts`, `lib/market-rotation/monitor.ts:14`, `lib/market-rotation/types.ts`, `prisma/schema.prisma`（如 groupType 是 enum）
  - Verify: `npm run typecheck` 通過 + core universe test 通過

- [ ] **T3 (P1, human: ~2h / CC: ~10min)** — Phase 2 — Beta Allocation Engine 含 20 格 rule
  - Surfaced by: Code Quality C1 — 補齊 20 格 decision table + fallback rule
  - Files: `lib/beta-allocation/policy.ts`（新）, `tests/unit/lib/beta-allocation/policy.test.ts`（新）
  - Verify: 25 個 test case 全綠

- [ ] **T4 (P1, human: ~1h / CC: ~10min)** — Phase 0.3 — Batch cron schedule 文件化
  - Surfaced by: Architecture A6 — Last updated 必須可靠
  - Files: `docs/BETA_COCKPIT.md`, k8s CronJob YAML（如適用）, `docs/DEPLOYMENT.md`
  - Verify: cron 條目可被 ops 直接複製貼上

- [ ] **T5 (P2, human: ~2h / CC: ~15min)** — Phase 5 — Portfolio Exposure 用 HoldingView
  - Surfaced by: Architecture A4 + Code Quality C2 — 用對型別、unknown 可見
  - Files: `lib/portfolio-exposure/beta-buckets.ts`（新）, `lib/portfolio-exposure/exposure.ts`（新）, `tests/unit/lib/portfolio-exposure/`（新）
  - Verify: empty / all-known / all-unknown / mixed 四種 holdings 測試全綠

- [ ] **T6 (P2, human: ~2h / CC: ~15min)** — Phase 3+4 — API payload + UI card
  - Surfaced by: Architecture A1（API 不再 reject core）+ Code Quality C5（i18n）
  - Files: `server/api/market/rotation-monitor.get.ts`, `lib/market-rotation/summary.ts`, `pages/tools/etf.vue`, `i18n/locales/{en,zh-TW,zh-CN}.json`, `components/BetaCockpitCard.vue`（新）
  - Verify: `curl /api/market/rotation-monitor?scope=core` 回 200 + UI 三語顯示

- [ ] **T7 (P2, human: ~2h / CC: ~15min)** — Phase 6 — Portfolio Exposure UI panel
  - Surfaced by: Code Quality C3 — 插入點不明 + UI 位置示意
  - Files: `pages/stocks/index.vue`, `i18n/locales/*.json`, `components/PortfolioExposurePanel.vue`（新）
  - Verify: UI 顯示 current vs suggested + overweight high beta 時警告

- [ ] **T8 (P1, human: ~30min / CC: ~5min)** — Phase 7 — Regression test：executeBatch filter-after 移除
  - Surfaced by: Test Review — A1 fix 的唯一證明
  - Files: `tests/unit/scripts/market-rotation/run-batch.test.ts`
  - Verify: 4 個 scope 都測「只跑該 scope 的 runScopeBatch」

- [ ] **T9 (P2, human: ~1h / CC: ~10min)** — Phase 8 — Documentation
  - Surfaced by: 完整性 — 設計文件 + README + 部署文件
  - Files: `docs/BETA_COCKPIT.md`（新）, `README.md`
  - Verify: 文件 cross-link 正確

## Unresolved decisions

無。所有 14 個 AskUserQuestion（D1-D15 扣除 D15 略過）都有明確使用者決議。

## Retrospective check

git log 顯示最近五個 commit 與本 plan 範圍無重疊（皆為 nav grouping、docs 重整、test 重整、blog cache、UI tokens），不影響本 plan。

---

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 0 | — | not run |
| Codex Review | `/codex review` | Independent 2nd opinion | 0 | — | skipped by user (D15) |
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 1 | CLEAR | 14 issues found, 14 resolved (A1-A6, C1-C5, T-Reg, P1-P2); 1 critical gap (NaN quantity) flagged |
| Design Review | `/plan-design-review` | UI/UX gaps | 0 | — | not run (recommended for Phase 4+6 UI commits) |
| DX Review | `/plan-devex-review` | Developer experience gaps | 0 | — | not run |

- **UNRESOLVED:** 0 (所有 14 個 AskUserQuestion 已獲使用者明確回答)
- **CRITICAL GAPS:** 0 (NaN quantity 已於 2026-06-21 修復 — `exposure.ts` guard + `skippedCount` + UI warning + 6 個 regression test)
- **VERDICT:** ENG CLEARED & IMPLEMENTED — plan 已吸收全部 review findings 並實作落地。建議下階段（如有 UI 視覺強化需求）跑 `/plan-design-review`，並在每次改動 `lib/portfolio-exposure/*` 後跑 `npx vitest run tests/unit/lib/portfolio-exposure/`。
