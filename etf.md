# ETF 趨勢分析工具

## 功能概述

一個用於追蹤和分析 ETF 價格變化的工具，提供多維度的時間序列比較。

### 核心功能

- **即時價格**: 取得 ETF 當前報價（不存資料庫）
- **月度對比 (MoM)**: 當月 vs 上個月、上上個月
- **季度變化**: 當季 vs 上季
- **同比分析**: 今年同期 vs 去年同期（如 2025年3→4月 vs 2024年3→4月）
- **技術指標**: MA20、MA60 移動平均線
- **價格提醒**: 價格突破/漲跌幅通知
- **Admin 管理**: 新增/刪除 ETF（僅 Admin）

---

## 資料庫 Schema

```prisma
model Etf {
  id          BigInt   @id @default(autoincrement())
  symbol      String   @unique // e.g., "SPY", "QQQ", "0050.TW"
  name        String?  // e.g., "SPDR S&P 500 ETF"

  prices      EtfPrice[]
  alerts      EtfAlert[]
  watchlists  EtfWatchlist[]

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([symbol])
}

model EtfPrice {
  id          BigInt   @id @default(autoincrement())
  etfId       BigInt
  date        DateTime @db.Date

  open        Decimal  @db.Decimal(10, 4)
  high        Decimal  @db.Decimal(10, 4)
  low         Decimal  @db.Decimal(10, 4)
  close       Decimal  @db.Decimal(10, 4)
  adjClose    Decimal  @db.Decimal(10, 4)
  volume      Int?

  etf         Etf      @relation(fields: [etfId], references: [id], onDelete: Cascade)

  @@unique([etfId, date])
  @@index([etfId, date(sort: Desc)])
}

model EtfAlert {
  id          BigInt     @id @default(autoincrement())
  userId      BigInt
  etfId       BigInt
  type        AlertType
  threshold   Decimal    @db.Decimal(10, 4)
  message     String
  isTriggered Boolean    @default(false)
  triggeredAt DateTime?

  user        User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  etf         Etf        @relation(fields: [etfId], references: [id], onDelete: Cascade)

  @@index([userId, isTriggered])
  @@index([etfId, isTriggered])
}

model EtfWatchlist {
  id          BigInt   @id @default(autoincrement())
  userId      BigInt
  etfId       BigInt
  sortOrder   Int      @default(0)

  user        User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  etf         Etf     @relation(fields: [etfId], references: [id], onDelete: Cascade)

  @@unique([userId, etfId])
  @@index([userId, sortOrder])
}

enum AlertType {
  PRICE_ABOVE    // 價格高於
  PRICE_BELOW    // 價格低於
  CHANGE_PERCENT // 漲跌幅
  MOVING_AVG     // 移動平均突破
}

// User model 需補上 relation
model User {
  // ...
  etfAlerts    EtfAlert[]
  etfWatchlist EtfWatchlist[]
}
```

---

## 分析數據結構

```typescript
interface EtfAnalysis {
  symbol: string
  name: string
  currentPrice: number

  // 月度對比
  monthly: {
    previousMonth: {
      price: number
      change: number
      changePercent: number
    }
    twoMonthsAgo: {
      price: number
      change: number
      changePercent: number
    }
  }

  // 季度變化
  quarterly: {
    change: number
    changePercent: number
  }

  // 同比分析
  yearlyComparison: {
    lastYearChange: number      // 2024年3→4月
    thisYearChange: number      // 2025年3→4月
    difference: number          // 差異
    improved: boolean           // 今年是否較好
  }

  // 技術指標
  technical: {
    ma20: number
    ma60: number
    trend: 'bullish' | 'bearish' | 'neutral'
  }

  // 建議
  recommendation: string // i18n key
}

interface MonthOverMonthData {
  month: string          // "2025-01"
  open: number
  close: number
  high: number
  low: number
  change: number
  changePercent: number
}
```

---

## Yahoo API 整合

### API 端點

| 用途 | URL |
|------|-----|
| **即時報價** | `https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?interval=1d&range=1d` |
| 月度數據 | `https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?interval=1mo&range=5y` |
| meta 資訊 | 同上，解析 `meta` 欄位 |

### 即時價格 API

```typescript
// server/api/etf/[symbol]/quote.get.ts
export default defineEventHandler(async (event) => {
  const symbol = getRouterParam(event, 'symbol')
  if (!symbol) {
    throw createError({ statusCode: 400, statusMessage: 'Missing symbol' })
  }

  // 直接從 Yahoo API 獲取，不存資料庫
  const response = await $fetch<any>(
    `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`
  )

  const result = response?.chart?.result?.[0]
  if (!result?.meta) {
    throw createError({ statusCode: 502, statusMessage: 'Yahoo quote unavailable' })
  }
  const quote = result.meta

  return {
    symbol: quote.symbol,
    regularMarketPrice: quote.regularMarketPrice,
    previousClose: quote.previousClose,
    change: quote.regularMarketPrice - quote.previousClose,
    changePercent: ((quote.regularMarketPrice - quote.previousClose) / quote.previousClose) * 100,
    currency: quote.currency,
    marketState: quote.marketState, // REGULAR, PRE, POST, CLOSED
    lastUpdateTime: new Date(quote.regularMarketTime * 1000).toISOString(),
  }
})
```

### Rate Limiter

```typescript
// server/api/etf/[symbol]/quote.get.ts
import { RateLimiterMemory } from 'rate-limiter-flexible'

const rateLimiter = new RateLimiterMemory({
  points: 60,      // 每分鐘 60 次
  duration: 60,    // 60 秒
})

export default defineEventHandler(async (event) => {
  const ip = getRequestIP(event) || 'unknown'
  await rateLimiter.consume(ip)
  // ... API logic
})
```

### 更新策略

**每月 1 號自動更新上個月數據**

```typescript
// server/api/etf/update-monthly.post.ts
// 每月 1 號 00:00 執行
export default defineEventHandler(async () => {
  const today = new Date()
  const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)

  const etfs = await prisma.etf.findMany()
  for (const etf of etfs) {
    // 檢查上月數據是否已存在
    const existing = await prisma.etfPrice.findUnique({
      where: {
        etfId_date: {
          etfId: etf.id,
          date: lastMonth
        }
      }
    })

    if (!existing) {
      await fetchMonthlyEtfPrice(etf.symbol, lastMonth)
    }
  }
})
```

### Cache 策略

```
1. 每月 1 號觸發更新
2. 檢查上月數據是否存在
3. 不存在則呼叫 Yahoo API
4. 寫入資料庫（月度收盤價）
5. 查詢時直接讀取資料庫
```

---

## Admin API 實作

### 新增 ETF

```typescript
// server/api/admin/etf/index.post.ts
import { requireUser } from '~/server/utils/auth'
import adminMiddleware from '~/server/middleware/admin'

export default defineEventHandler(async (event) => {
  requireUser(event)          // 必須先驗證登入
  await adminMiddleware(event) // 檢查 ADMIN

  const body = await readBody(event)
  const { symbol, name } = body

  // 驗證 symbol 是否存在於 Yahoo
  const yahooData = await $fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1mo&range=1mo`
  )

  if (!yahooData?.chart?.result?.[0]) {
    throw createError({ statusCode: 400, message: 'Invalid ETF symbol' })
  }

  // 建立 ETF
  const etf = await prisma.etf.create({
    data: { symbol: symbol.toUpperCase(), name }
  })

  return etf
})
```

### 刪除 ETF

```typescript
// server/api/admin/etf/[id].delete.ts
import { requireUser } from '~/server/utils/auth'
import adminMiddleware from '~/server/middleware/admin'

export default defineEventHandler(async (event) => {
  requireUser(event)
  await adminMiddleware(event)

  const id = BigInt(getRouterParam(event, 'id'))

  // Cascade 刪除相關價格、提醒、追蹤清單
  await prisma.etf.delete({
    where: { id }
  })

  return { success: true }
})
```

### 初始化歷史數據

```typescript
// server/api/admin/etf/[id]/initialize.post.ts
import { requireUser } from '~/server/utils/auth'
import adminMiddleware from '~/server/middleware/admin'

export default defineEventHandler(async (event) => {
  requireUser(event)
  await adminMiddleware(event)

  const id = BigInt(getRouterParam(event, 'id'))
  const etf = await prisma.etf.findUnique({ where: { id } })

  // 從 Yahoo 獲取 5 年月度數據
  const yahooData = await $fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${etf.symbol}?interval=1mo&range=5y`
  )

  const result = yahooData?.chart?.result?.[0]
  if (!result) {
    throw createError({ statusCode: 502, statusMessage: 'Yahoo historical data unavailable' })
  }

  const quotes = result.indicators.quote[0]
  const adjclose = result.indicators.adjclose?.[0]?.adjclose || []
  const timestamps = result.timestamp || []

  // 批量寫入
  const prices = timestamps.map((ts, i) => ({
    etfId: id,
    date: new Date(ts * 1000),
    open: quotes.open[i],
    high: quotes.high[i],
    low: quotes.low[i],
    close: quotes.close[i],
    adjClose: adjclose[i] ?? quotes.close[i],
  }))

  await prisma.etfPrice.createMany({
    data: prices,
    skipDuplicates: true
  })

  return { success: true, count: prices.length }
})
```

---

## UI 結構

```
pages/tools/etf.vue
├── Header
│   ├── ETF 搜尋下拉 (SPY, QQQ, IWM, VTI...)
│   └── 追蹤清單按鈕
│
├── Live Quote Card (即時報價)
│   ├── 當前價格 (定期刷新)
│   ├── 日漲跌 (+2.3%)
│   ├── 市場狀態 (交易中/休市)
│   ├── 最後更新時間
│   └── 刷新按鈕
│
├── Summary Card
│   ├── 當前價格
│   ├── 日漲跌 (+2.3%)
│   └── 趨勢圖示 (📈 / 📉)
│
├── Tabs
│   ├── All ETFs
│   │   └── 全部 ETF 比較表格 (可排序)
│   │
│   ├── Overview
│   │   ├── 月度對比表格
│   │   ├── 季度變化表格
│   │   └── 同比分析表格
│   │
│   ├── Comparison
│   │   └── 同期對比表格 (今年 vs 去年)
│   │
│   ├── Technical
│   │   ├── MA20/MA60 數據表格
│   │   └── 趨勢指標 (bullish/bearish/neutral)
│   │
│   └── Settings
│       ├── 價格提醒設定
│       └── 匯出 (CSV)
│
└── History Table
    └── 歷史價格列表 (分頁)
```

---

## 全部 ETF 比較表格

### 功能說明
單一表格顯示所有 ETF 的關鍵指標，支援欄位排序。

### 表格欄位

| 欄位 | 說明 | 排序 |
|------|------|------|
| Symbol | ETF 代碼 | ✅ |
| Name | ETF 名稱 | ✅ |
| 當前價格 | 即時報價 | ✅ |
| 日漲跌 | 日漲跌幅 % | ✅ |
| 月漲跌 | vs 上個月 | ✅ |
| 季漲跌 | vs 上季 | ✅ |
| 年漲跌 | YTD | ✅ |
| MA20 | 20日均线 | ✅ |
| MA60 | 60日均线 | ✅ |
| 趨勢 | bullish/bearish/neutral | ✅ |
| 操作 | 詳情/追蹤 | - |

### API 端點

```typescript
// server/api/etf/all.get.ts
export default defineEventHandler(async (event) => {
  const sortBy = getQuery(event).sort || 'symbol'  // symbol, currentPrice, dailyChangePercent, monthlyChangePercent, quarterlyChangePercent, ytdChangePercent, ma20, ma60, trendScore
  const order = getQuery(event).order || 'asc'     // asc, desc

  const etfs = await prisma.etf.findMany({
    include: {
      prices: {
        orderBy: { date: 'desc' },
        take: 60,  // 足夠計算 MA60
      }
    }
  })

  // 取得即時報價並計算所有指標
  const results = await Promise.all(
    etfs.map(etf => analyzeEtf(etf))
  )

  // 排序鍵對應（避免直接用 a[sortBy] 造成巢狀欄位/字串比較錯誤）
  const sortValueMap = {
    symbol: (row) => row.symbol,
    currentPrice: (row) => row.currentPrice,
    dailyChangePercent: (row) => row.daily.changePercent,
    monthlyChangePercent: (row) => row.monthly.previousMonth.changePercent,
    quarterlyChangePercent: (row) => row.quarterly.changePercent,
    ytdChangePercent: (row) => row.ytd.changePercent,
    ma20: (row) => row.technical.ma20,
    ma60: (row) => row.technical.ma60,
    trendScore: (row) => ({ bearish: 0, neutral: 1, bullish: 2 }[row.technical.trend] ?? -1)
  } as const

  const getSortValue = sortValueMap[sortBy] || sortValueMap.symbol

  // 排序
  results.sort((a, b) => {
    const aVal = getSortValue(a)
    const bVal = getSortValue(b)

    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return order === 'asc'
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal)
    }

    return order === 'asc'
      ? Number(aVal) - Number(bVal)
      : Number(bVal) - Number(aVal)
  })

  return results
})
```

### 排序欄位對應

```typescript
type SortField =
  | 'symbol'      // 字母順序
  | 'currentPrice'         // 當前價格
  | 'dailyChangePercent'   // 日漲跌幅
  | 'monthlyChangePercent' // 月漲跌
  | 'quarterlyChangePercent' // 季漲跌
  | 'ytdChangePercent'     // 年初至今
  | 'ma20'        // MA20 數值
  | 'ma60'        // MA60 數值
  | 'trendScore'  // 趨勢 (bullish > neutral > bearish)
```

---

## Admin UI 結構

```
pages/admin/etf.vue
├── Header
│   └── 標題: ETF 管理
│
├── Add ETF Form
│   ├── Symbol 輸入框 (e.g., SPY)
│   ├── Name 輸入框 (e.g., SPDR S&P 500 ETF)
│   ├── 驗證按鈕 (檢查 Yahoo 是否存在)
│   └── 新增按鈕
│
├── ETF List (Table)
│   ├── Symbol
│   ├── Name
│   ├── 價格數據數量
│   ├── 最後更新時間
│   ├── 操作:
│   │   ├── 初始化歷史數據按鈕
│   │   └── 刪除按鈕
│   └── 分頁
```

---

## API 路由規劃

### 一般用戶

| 路由 | 方法 | 功能 | 存資料庫 |
|------|------|------|----------|
| `/api/etf/search` | GET | 搜尋 ETF (Yahoo) | - |
| `/api/etf/all` | GET | **全部 ETF 比較表格** (支援排序) | - |
| `/api/etf/:symbol/quote` | GET | **即時報價** | ❌ |
| `/api/etf/:symbol` | GET | 取得 ETF 分析 | - |
| `/api/etf/:symbol/price` | GET | 取得價格歷史 | - |
| `/api/etf/watchlist` | GET/POST | 追蹤清單 | ✅ |
| `/api/etf/alerts` | GET/POST/DELETE | 價格提醒 | ✅ |

### Admin 專用

| 路由 | 方法 | 功能 | 權限 |
|------|------|------|------|
| `/api/admin/etf` | GET | 取得所有 ETF 列表 | Admin |
| `/api/admin/etf` | POST | 新增 ETF | Admin |
| `/api/admin/etf/:id` | DELETE | 刪除 ETF | Admin |
| `/api/admin/etf/:id/initialize` | POST | 初始化歷史數據 | Admin |

---

## 實作順序

### Phase 1: 基礎架構
- [x] 設計 Schema
- [ ] Prisma migration
- [ ] Yahoo API fetcher (`lib/yahoo-finance.ts`)
- [ ] **即時價格 API** (`server/api/etf/[symbol]/quote.get.ts`) + **Rate Limiter**

### Phase 2: 分析邏輯
- [ ] `lib/etf-analyzer.ts` - 各項指標計算
- [ ] 同比比較邏輯
- [ ] 技術指標 (MA20, MA60)

### Phase 3: API
- [ ] **全部 ETF 比較 API** (支援排序)
- [ ] ETF 分析 API
- [ ] 搜尋 API
- [ ] 手動更新 API

### Phase 4: UI
- [ ] 主頁面
- [ ] **全部 ETF 比較表格** (可排序)
- [ ] **即時報價卡片** (含 auto-refresh)
- [ ] 數據表格組件 (Overview/Comparison/Technical)
- [ ] 追蹤清單

### Phase 5: Admin 功能
- [ ] Admin API (新增/刪除 ETF)
- [ ] Admin 驗證 middleware
- [ ] Admin UI 頁面

### Phase 6: 進階功能
- [ ] 每月自動更新 cron
- [ ] 匯出功能

---

## 注意事項

- Yahoo Finance 無官方 API 限制，但建議加入 rate limiter
- **主要聚焦美股 ETF**: `SPY`, `QQQ`, `IWM`, `VTI`, `GLD`, `TLT`...
- 台灣 ETF symbol 格式: `0050.TW` (次要支援)
- 資料庫使用 `Decimal` 避免浮點誤差
- 所有日期統一使用 UTC
- 確保 TS 型別正確，避免 runtime import Prisma
- **即時價格不存資料庫，直接從 Yahoo API 回傳**
- **即時價格需加入 Rate Limiter 避免濫用**
- Admin API 需先 `requireUser(event)` 再執行 `adminMiddleware(event)`，避免未登入繞過
- **Admin 新增 ETF 時需先驗證 Yahoo API 是否回傳有效數據**
- **刪除 ETF 會 Cascade 刪除所有相關價格、提醒、追蹤清單**
- **每月只存儲月度收盤價，不需每日數據**
- **首次使用需手動觸發初始化，補齊歷史數據**

---

## 常用美股 ETF 清單

| Symbol | 名稱 | 類別 |
|--------|------|------|
| SPY | SPDR S&P 500 ETF | 大盤 |
| QQQ | Invesco QQQ Trust | 納指 |
| IWM | iShares Russell 2000 ETF | 小型股 |
| VTI | Vanguard Total Stock Market ETF | 全市場 |
| VOO | Vanguard S&P 500 ETF | 大盤 |
| GLD | SPDR Gold Shares | 黃金 |
| TLT | iShares 20+ Year Treasury Bond | 長期公債 |
| XLE | Energy Select Sector SPDR Fund | 能源 |
| XLK | Technology Select Sector SPDR Fund | 科技 |
| XLB | Materials Select Sector SPDR Fund | 原物料 |
| XLV | Health Care Select Sector SPDR Fund | 醫療 |
| SPMO | Invesco S&P 500 Momentum ETF | 動能 |
| IGV | iShares Semiconductor ETF | 半導體 |
