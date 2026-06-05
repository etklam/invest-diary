# Marketbee x ETF Tool Integration Design

## 1. 背景與目標

目前 `trade-basic.com/tools/etf` 的定位是 **ETF Sector Trend Board**，主要幫助用戶觀察不同 ETF / sector 的相對強弱、短中期趨勢、均線位置、RSI、YTD 表現及距離高位的幅度。

本設計目標是將 Stockbee Market Monitor 類型的 **market breadth / market regime** 功能整合入 ETF 工具頁，建立一個屬於 Trade Basic 的 Marketbee 模組。

核心理念：

```text
ETF Board = 判斷資金流向哪個 sector
Marketbee = 判斷現在是否值得承擔 beta
```

整合後，ETF 工具不只是顯示 sector 強弱，而是升級為：

```text
先判斷市場能否承擔 beta，再選擇最強 ETF / sector 表達 beta。
```

---

## 2. 產品定位

### 2.1 模組名稱建議

可選名稱：

```text
Marketbee Regime Monitor
Marketbee Breadth Monitor
Market Regime Dashboard
Beta Timing Dashboard
Market Thrust Monitor
```

建議使用：

```text
Marketbee Regime Monitor
```

原因：

- 不直接複製 Stockbee 名稱
- 與 Trade Basic 品牌更自然
- 功能重點清晰：市場狀態、breadth、beta exposure

---

## 3. 使用者需求

目標使用者是偏 momentum / ETF / sector rotation 的交易者。

他們需要回答幾個問題：

```text
1. 現在市場是 Risk-On、Neutral、Risk-Off，還是 Capitulation？
2. 現在是否適合加大 beta exposure？
3. 如果適合進攻，應該集中在哪些 ETF / sector？
4. 如果市場轉弱，應該減倉、防守，還是等 pullback？
5. 市場是否出現 bullish thrust 或 panic selling？
```

---

## 4. 核心功能總覽

### 4.1 MVP 功能

第一版只需要以下功能：

```text
1. Market Regime Card
2. 4% Up Daily count
3. 4% Down Daily count
4. 10 Day Ratio
5. % Above 40D MA
6. Beta Exposure Guide
7. 與 ETF Board 聯動的排序 / 解讀
```

### 4.2 完整版功能

後續可加入：

```text
1. 25% Up Quarter
2. 25% Down Quarter
3. 25% Up Month
4. 25% Down Month
5. 50% Up Month
6. 50% Down Month
7. Breadth Timeline Chart
8. Sector Breadth
9. ETF Internal Breadth
10. Historical Regime View
```

---

## 5. 頁面結構設計

現有 ETF 工具頁可由：

```text
Daily Market Snapshot
ETF Sector Trend Board
Control Panel
Sector Matrix Table
```

改成：

```text
Daily Market Snapshot

Marketbee Regime Monitor
- Market Regime Card
- Breadth Snapshot Cards
- Beta Exposure Guide
- Breadth Timeline Chart

ETF Sector Trend Board
- Control Panel
- Regime-aware ETF Matrix Table
```

---

## 6. UI Layout 建議

### 6.1 Market Regime Card

位置：ETF table 上方，作為整個頁面的主判斷。

內容：

```text
Market Regime: Risk-On
Signal: Bullish Thrust Confirmed
Beta Exposure: 80% - 100%
Last Updated: 2026-06-05 16:05 ET
```

### 6.2 Breadth Snapshot Cards

顯示核心 breadth 指標：

```text
4% Up Daily        512
4% Down Daily       83
10D Ratio          2.8
Above 40D MA       63%
25% Up Quarter     780
25% Down Quarter   210
```

MVP 可只顯示：

```text
4% Up Daily
4% Down Daily
10D Ratio
Above 40D MA
```

### 6.3 Beta Exposure Guide

根據 regime 顯示操作建議：

```text
Suggested Action:
Increase beta exposure.
Focus on leading ETFs above 10D / 20D EMA.
Avoid lagging sectors.
```

### 6.4 Breadth Timeline Chart

圖表建議：

```text
Bar Chart:
- 4% Up Daily
- 4% Down Daily

Line Chart:
- 10D Ratio
```

前端圖表庫建議：

```text
vue-chartjs (基於 Chart.js)
ECharts
```

建議 MVP 使用 vue-chartjs，因為專案已有 Chart.js 依賴。

---

## 7. Market Regime 定義

### 7.1 Regime 類型

```text
Bullish Thrust
Risk-On
Neutral
Risk-Off
Capitulation Watch
```

### 7.2 判斷規則 MVP（附優先順序）

#### Capitulation Watch（最高優先級）
```text
down4Pct >= 15%
or above40dPct < 20%
```

#### Risk-Off
```text
ratio10d <= 0.7
or down4Pct >= up4Pct * 2
or above40dPct < 35%
```

#### Bullish Thrust
```text
ratio10d >= 2.0
and up4Pct > down4Pct
and above40dPct >= 50%
```

#### Risk-On
```text
ratio10d >= 1.2
and above40dPct >= 55%
```

#### Neutral（最低優先級）
```text
ratio10d between 0.7 and 1.8
and above40dPct between 35% and 60%
```

> **重要**：檢查時需按上述順序評估，第一個匹配的 regime 為準。

---

## 8. Beta Exposure Mapping

| Regime | Suggested Exposure | ETF Board Mode | Action |
|---|---:|---|---|
| Bullish Thrust | 80% - 100% | Momentum / Growth / Semi | Buy leaders on breakout or pullback |
| Risk-On | 70% - 100% | Strong sector ranking | Hold leading ETFs |
| Neutral | 40% - 70% | Quality + relative strength | Only buy strongest ETFs |
| Risk-Off | 0% - 40% | Defensive / low drawdown | Reduce beta, avoid breakout chasing |
| Capitulation Watch | 20% - 60% staged | Oversold reclaim | Prepare staged buying, wait for confirmation |

---

## 9. Breadth 指標計算

### 9.1 4% Up Daily

```ts
const dailyReturn = close / previousClose - 1;
const isUp4 = dailyReturn >= 0.04;
```

代表今日升超過 4% 的股票數量。

### 9.2 4% Down Daily

```ts
const dailyReturn = close / previousClose - 1;
const isDown4 = dailyReturn <= -0.04;
```

代表今日跌超過 4% 的股票數量。

### 9.3 10 Day Ratio

```ts
const ratio10d =
  sum(up4CountLast10Days) /
  Math.max(sum(down4CountLast10Days), 1);
```

用途：判斷 bullish / bearish thrust。

簡化解讀：

```text
10D Ratio >= 2.0    = Bullish Thrust
10D Ratio 0.7-1.8   = Neutral
10D Ratio <= 0.7    = Risk-Off
```

### 9.4 % Above 40D MA

```ts
const above40dPct = count(close > sma40) / universeCount;
```

用途：類似 T2108，用來衡量市場內部健康度。

簡化解讀：

```text
> 60% = 市場健康
40% - 60% = 中性
20% - 40% = 偏弱
< 20% = 極端恐慌 / Capitulation Watch
```

### 9.5 25% Up Quarter

```ts
const quarterReturn = close / close65TradingDaysAgo - 1;
const isUp25Quarter = quarterReturn >= 0.25;
```

代表近約一季升超過 25% 的股票數量。

### 9.6 25% Down Quarter

```ts
const quarterReturn = close / close65TradingDaysAgo - 1;
const isDown25Quarter = quarterReturn <= -0.25;
```

代表近約一季跌超過 25% 的股票數量。

---

## 10. 數據 Universe 設計

### 10.1 MVP Universe

第一版建議只用：

```text
S&P 500
Nasdaq 100
```

原因：

- 數據量適中 (~500 檔)
- 計算快
- 較貼合 ETF / M7 / beta timing 用戶
- 避免全市場小型股噪音

### 10.2 正式版 Universe

正式版可以擴展到：

```text
US common stocks
NYSE
Nasdaq
AMEX
Excluding OTC
Excluding preferred shares
Excluding warrants
Excluding units
Excluding ETFs from breadth calculation
```

### 10.3 股票過濾條件

```text
price > 5
average dollar volume > threshold
is_active = true
asset_type = common_stock
exchange in NYSE / NASDAQ / AMEX
```

---

## 11. 數據來源方案

### 11.1 開發期方案：yahoo-finance2 (Node.js)

適合：

```text
個人使用
Prototype
MVP demo
低成本測試
```

優點：

```text
專案已有依賴
免費
容易實作
TypeScript 原生支持
```

缺點：

```text
不適合正式商業產品
Yahoo data terms 需要注意
大量 ticker 容易遇到 rate limit
穩定性不如付費 data vendor
```

### 11.2 正式版方案：Polygon / Tiingo / Nasdaq Data Link

適合：

```text
正式公開產品
SaaS
每日自動更新
全市場 breadth calculation
```

優點：

```text
穩定
API 正規
商業用途較安全
有完整 daily bars / aggregates
```

缺點：

```text
需要付費
需要處理 API limit
```

### 11.3 建議路線

```text
Phase 1: yahoo-finance2 + S&P 500 / Nasdaq 100
Phase 2: paid API + full US common stocks
Phase 3: sector breadth + ETF internal breadth
```

---

## 12. Database Schema (Prisma)

### 12.1 market_universe

```prisma
model MarketUniverse {
  id          BigInt   @id @default(autoincrement())
  symbol      String   @unique @db.VarChar(20)
  name        String   @db.VarChar(255)
  exchange    String   @db.VarChar(32)
  assetType   String   @db.VarChar(32)
  isEtf       Boolean  @default(false)
  isCommonStock Boolean @default(true)
  isActive    Boolean  @default(true)
  marketCap   BigInt?  @db.BigInt
  avgDollarVolume BigInt? @db.BigInt
  sector      String?  @db.VarChar(100)
  industry    String?  @db.VarChar(100)
  updatedAt   DateTime @default(now()) @map("updated_at")

  @@index([symbol])
  @@index([isActive, assetType])
  @@map("market_universe")
}
```

### 12.2 market_daily_prices

```prisma
model MarketDailyPrice {
  id          BigInt   @id @default(autoincrement())
  symbol      String   @db.VarChar(20)
  date        DateTime @db.Date
  open        Decimal  @db.Decimal(18, 6)
  high        Decimal  @db.Decimal(18, 6)
  low         Decimal  @db.Decimal(18, 6)
  close       Decimal  @db.Decimal(18, 6)
  adjustedClose Decimal @db.Decimal(18, 6)
  volume      BigInt   @db.BigInt
  createdAt   DateTime @default(now()) @map("created_at")

  @@index([symbol, date])
  @@index([date])
  @@unique([symbol, date])
  @@map("market_daily_price")
}
```

### 12.3 market_breadth_daily

```prisma
model MarketBreadthDaily {
  id            BigInt   @id @default(autoincrement())
  universeKey   String   @db.VarChar(32) // e.g., "SP500_NDX"
  date          DateTime @db.Date
  universeCount Int      @db.Integer

  up4Count      Int?     @db.Integer
  down4Count    Int?     @db.Integer
  up4Pct        Decimal? @db.Decimal(8, 4) // percentage
  down4Pct      Decimal? @db.Decimal(8, 4) // percentage

  above40dCount Int?     @db.Integer
  above40dPct   Decimal? @db.Decimal(8, 4) // percentage

  ratio5d       Decimal? @db.Decimal(12, 4)
  ratio10d      Decimal? @db.Decimal(12, 4)

  regime        String?  @db.VarChar(32)
  score         Int?     @db.Integer
  coveragePct   Decimal? @db.Decimal(5, 2) // data coverage percentage
  isStale       Boolean  @default(false)
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  @@unique([universeKey, date], map: "market_breadth_daily_universe_date_key")
  @@index([universeKey, date(sort: Desc)], map: "market_breadth_daily_universe_date_idx")
  @@map("market_breadth_daily")
}
```

### 12.4 etf_metrics_daily

```prisma
model EtfMetricsDaily {
  id                  BigInt   @id @default(autoincrement())
  symbol              String   @db.VarChar(20)
  date                DateTime @db.Date
  name                String?  @db.VarChar(255)
  category            String?  @db.VarChar(100)

  close               Decimal  @db.Decimal(18, 6)
  dailyChangePct      Decimal? @db.Decimal(8, 4)
  weeklyChangePct     Decimal? @db.Decimal(8, 4)
  ytdChangePct        Decimal? @db.Decimal(8, 4)

  rsi14               Decimal? @db.Decimal(6, 2)
  ema10               Decimal? @db.Decimal(18, 6)
  ema20               Decimal? @db.Decimal(18, 6)
  sma50               Decimal? @db.Decimal(18, 6)
  sma200              Decimal? @db.Decimal(18, 6)

  above10d            Boolean? @db.Boolean
  above20d            Boolean? @db.Boolean
  above50d            Boolean? @db.Boolean
  above200d           Boolean? @db.Boolean

  distanceFrom52wHighPct Decimal? @db.Decimal(8, 4)
  regimeFit           String?  @db.VarChar(64)

  createdAt           DateTime @default(now()) @map("created_at")
  updatedAt           DateTime @updatedAt @map("updated_at")

  @@index([symbol, date])
  @@unique([symbol, date])
  @@map("etf_metrics_daily")
}
```

---

## 13. API Design

### 13.1 GET /api/market/marketbee/snapshot

用途：取得最新 market regime snapshot。

Response：

```json
{
  "universeKey": "SP500_NDX",
  "date": "2026-06-05",
  "latestPriceDate": "2026-06-05",
  "coveragePct": 98.7,
  "isStale": false,
  "regime": "RISK_ON",
  "signal": "Bullish Thrust Confirmed",
  "score": 78,
  "up4": 512,
  "down4": 83,
  "up4Pct": 63.5,
  "down4Pct": 10.3,
  "ratio10d": 2.8,
  "above40dPct": 63.2,
  "suggestedExposure": "80-100%",
  "message": "Bullish thrust confirmed. Favor leading ETFs."
}
```

### 13.2 GET /api/market/marketbee/history?days=120

用途：取得 breadth 歷史數據，用於 chart。

Response：

```json
[
  {
    "date": "2026-06-05",
    "up4": 512,
    "down4": 83,
    "up4Pct": 63.5,
    "down4Pct": 10.3,
    "ratio10d": 2.8,
    "above40dPct": 63.2,
    "regime": "RISK_ON"
  }
]
```

### 13.3 GET /api/market/sector-board?preset=sectors&regimeAware=1

用途：取得 ETF board 數據，並加入 regime-aware 解讀。

Response（原有結構新增 regimeFit 欄位）：

```json
[
  {
    "ticker": "SOXX",
    "sector": "Semiconductor",
    "rsi": 68,
    "above10d": true,
    "above20d": true,
    "above50d": true,
    "weeklyChangePct": 4.2,
    "distanceFromHighPct": -3.1,
    "regimeFit": "Leader in Risk-On"
  }
]
```

---

## 14. Batch Job Flow

每日美股收市後執行：

```text
1. 更新 universe (如有變動)
2. 拉取 universe 內所有股票 daily OHLCV (含 adjusted_close)
3. 計算每隻股票：
   - daily return (adjusted_close based)
   - 1M return
   - 65D return
   - 10D / 20D / 40D / 50D / 200D moving averages
4. Aggregate 成 market breadth metrics
5. 計算 5D Ratio / 10D Ratio
6. 判斷 market regime (按優先順序)
7. 寫入 market_breadth_daily
8. 更新 ETF metrics
9. Revalidate ETF tool page cache
```

### 14.1 Cron 建議

若使用 Next.js / Vercel：

```text
Vercel Cron
or GitHub Actions
or VPS cron
```

建議執行時間：

```text
美股收市後 60-90 分鐘
例如 18:00 ET 或 19:00 ET
```

---

## 15. Regime-aware ETF Board 行為

Marketbee 不應只顯示市場狀態，還應該影響 ETF board 的排序與解讀。

### 15.1 Risk-On

排序偏向：

```text
weekly change
RSI strength
above 10D / 20D EMA
distance from 52W high
```

顯示提示：

```text
Focus on leading ETFs with strong trend confirmation.
```

### 15.2 Bullish Thrust

排序偏向：

```text
highest relative strength
reclaim 20D / 50D
strong weekly momentum
```

顯示提示：

```text
Bullish thrust detected. Look for leaders breaking out from consolidation.
```

### 15.3 Neutral

排序偏向：

```text
quality trend
low drawdown
above 50D
stable RSI
```

顯示提示：

```text
Market is mixed. Only focus on the strongest ETFs and avoid chasing extended moves.
```

### 15.4 Risk-Off

排序偏向：

```text
defensive ETFs
lowest drawdown
above 200D
relative strength vs SPY
```

顯示提示：

```text
Risk-off environment. Reduce beta and avoid breakout chasing.
```

### 15.5 Capitulation Watch

排序偏向：

```text
oversold but reclaiming 10D / 20D
large drawdown but improving breadth
high-quality ETFs near support
```

顯示提示：

```text
Capitulation watch. Prepare staged buying only after confirmation.
```

---

## 16. Frontend Component Structure

建議 components（Vue 3 SFC）：

```text
/components/marketbee/MarketbeeSection.vue
/components/marketbee/MarketRegimeCard.vue
/components/marketbee/BreadthSnapshotGrid.vue
/components/marketbee/BetaExposureGuide.vue
/components/marketbee/BreadthTimelineChart.vue
/components/etf/EtfRegimeBadge.vue
```

### 16.1 MarketbeeSection

負責組合：

```text
MarketRegimeCard
BreadthSnapshotGrid
BetaExposureGuide
BreadthTimelineChart
```

### 16.2 EtfRegimeBadge

每隻 ETF 顯示 regime fit：

```text
Leader in Risk-On
Defensive Relative Strength
Lagging Sector
Oversold Reclaim Watch
Extended / Avoid Chasing
```

---

## 17. UI Copy 建議

### 17.1 Risk-On

```text
Market is risk-on. Breadth supports higher beta exposure. Focus on leading ETFs and sectors with strong relative strength.
```

### 17.2 Bullish Thrust

```text
Bullish thrust detected. A broad-based buying wave may be confirming a new market upswing.
```

### 17.3 Neutral

```text
Market breadth is mixed. Stay selective and avoid overtrading weak setups.
```

### 17.4 Risk-Off

```text
Market is risk-off. Reduce beta exposure and avoid chasing breakouts until breadth improves.
```

### 17.5 Capitulation Watch

```text
Extreme selling pressure detected. This may create a tactical rebound setup, but confirmation is required before increasing exposure.
```

---

## 18. MVP Implementation Plan

### Phase 1: Marketbee MVP

Scope：

```text
Universe: S&P 500 + Nasdaq 100
Metrics: 4% Up, 4% Down, 10D Ratio, Above 40D MA
UI: Market Regime Card + Breadth Cards + Beta Exposure Guide
API: snapshot + history
```

Deliverables：

```text
1. Prisma schema models
2. daily data fetch script (TypeScript)
3. breadth calculation script (TypeScript)
4. API endpoints
5. Marketbee Vue UI section
6. ETF board integration (regimeAware prop)
```

### Phase 1.5: Data Quality Enhancements

Scope：

```text
Add coveragePct, isStale flags
Batch run logging
Failed ticker tracking
```

Deliverables：

```text
1. Enhanced API responses with data quality indicators
2. Batch job logging and alerting
3. Data freshness checks
```

### Phase 2: Full Breadth Monitor

Scope：

```text
Universe: full US common stocks
Metrics: 25% Month, 25% Quarter, 50% Month
Chart: 120-day breadth history
Regime scoring model
```

Deliverables：

```text
1. Improved universe management
2. Paid data source integration
3. Additional breadth metrics
4. Historical chart
5. Better regime model
```

### Phase 3: Sector Breadth + ETF Internal Breadth

Scope：

```text
Sector breadth
ETF holding-level breadth
ETF internal above 20D / 50D / 200D
Sector rotation score
```

Deliverables：

```text
1. Sector mapping
2. ETF holdings ingestion
3. ETF internal breadth calculation
4. Regime-aware sector ranking
```

---

## 19. Prompt for Claude Code / AI Coding Agent

```text
You are working on the Trade Basic ETF tool page.

Goal:
Integrate a Marketbee Regime Monitor into the existing ETF Sector Trend Board page.

Marketbee should calculate and display market breadth metrics that help users decide whether the current market environment supports higher beta exposure.

MVP requirements:
1. Add a Marketbee section above the ETF sector table.
2. Display the latest market regime: Bullish Thrust, Risk-On, Neutral, Risk-Off, or Capitulation Watch.
3. Display breadth metrics:
   - 4% Up Daily count
   - 4% Down Daily count
   - 10 Day Ratio
   - % Above 40D MA
4. Display a suggested beta exposure range based on regime.
5. Add API endpoint /api/market/marketbee/snapshot.
6. Add API endpoint /api/market/marketbee/history?days=120.
7. Add database table market_breadth_daily (via Prisma).
8. Add a batch job script that calculates breadth from daily OHLCV data.
9. Keep the existing ETF table, but add a regimeFit field or badge for each ETF.
10. Make the UI consistent with the existing Trade Basic dashboard style.

Regime rules (check in this order):
- Capitulation Watch: down4Pct >= 15% or above40dPct < 20%
- Risk-Off: ratio10d <= 0.7 or down4Pct >= up4Pct * 2 or above40dPct < 35%
- Bullish Thrust: ratio10d >= 2.0 and up4Pct > down4Pct and above40dPct >= 50%
- Risk-On: ratio10d >= 1.2 and above40dPct >= 55%
- Neutral: ratio10d between 0.7 and 1.8 and above40dPct between 35% and 60%

Use TypeScript, Vue 3, and the existing project conventions.
Prioritize clean component structure and keep calculations reusable.
```

---

## 20. 最終建議

不要直接複製 Stockbee Market Monitor。

Trade Basic 應該做一個更貼合 ETF / sector rotation / beta timing 的版本：

```text
Marketbee = Market Regime + Breadth Thrust + Beta Exposure Guide + ETF Rotation
```

最終產品價值：

```text
1. 用 Marketbee 判斷市場是否適合承擔 beta
2. 用 ETF Board 判斷 beta 應該放在哪個 sector
3. 用 regime-aware ranking 避免在 Risk-Off 環境追 breakout
4. 在 Capitulation Watch 階段提前準備分段買入
```

一句話定位：

```text
Marketbee helps ETF traders decide when to take beta risk and where to allocate it.
```