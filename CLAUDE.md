# Diary Vue - Technical Documentation

## Prisma + Nuxt + Vite 本地 500 Error 最終解法備忘

### 問題背景
在 Nuxt 3 專案中使用 Prisma（MySQL）時，本地開發（`npm run dev`）出現以下錯誤，但 **Docker / production 正常**：

- `(0, Fo.promisify) is not a function`
- `The requested module '/_nuxt/node_modules/@prisma/client/runtime/library.js' does not provide an export named 'Decimal'`
- `/timeline` SSR 500 error

## 根本原因（重點）
**Prisma runtime 被 Vite dev server 當成 client/shared dependency 打包**。

只要下列任一情況成立，錯誤一定會發生：
- 在 shared / utils / client code 中 `import '@prisma/client/runtime/*'`
- 在 client 可達檔案中 `import { PrismaClient } from '@prisma/client'`
- Vite `optimizeDeps` 沒排除 Prisma
- Vite cache 未清乾淨

這是 **Vite dev 專屬問題**，不是 Prisma、不是 DB、不是 migration 問題。

## 最終正確做法（不可缺一）

### 1. Prisma 僅能存在於 server runtime
**`lib/prisma.ts`（ESM-safe）**
```ts
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)

const { PrismaClient } = require('@prisma/client')

const prismaClientSingleton = () => new PrismaClient()

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton()
export default prisma

if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaGlobal = prisma
}
```

✅ 不可使用 `import { PrismaClient } from '@prisma/client'`

---

### 2. **禁止任何 runtime import Prisma Decimal**
❌ 錯誤示例（一定會炸）：
```ts
import { Decimal } from '@prisma/client/runtime/library'
```

✅ 正確（型別專用）：
```ts
import type { Prisma } from '@prisma/client'

quantity: Prisma.Decimal | number
price: Prisma.Decimal | number
```

> 型別 import 會在編譯期消失，不會進 runtime / client bundle。

---

### 3. 明確告訴 Vite 不要碰 Prisma
**`nuxt.config.ts`**
```ts
export default defineNuxtConfig({
  vite: {
    optimizeDeps: {
      exclude: ['@prisma/client', '@prisma/client/runtime']
    }
  }
})
```

---

### 4. 一定要清 Vite cache（一次）
```bash
rm -rf node_modules/.cache/vite
npm run dev
```

> Vite 不會因為 config 改變自動失效 cache。

---

## 為什麼 server / docker 不會中
- Production / Docker 使用 **Nitro server bundle**
- 不經過 Vite dev / optimizeDeps
- Prisma 永遠只在 Node server side

所以這類錯誤 **理論上只會在 local dev 發生**。

## 上線前自檢清單
```bash
# 必須為 0 筆
rg "@prisma/client/runtime"

# PrismaClient 只能存在於 lib/prisma.ts
rg "PrismaClient"
```

通過以上檢查即可確保：
- local ✅
- docker ✅
- production ✅

## 結論
這不是 Prisma 或資料庫問題，而是 **Nuxt + Vite + Prisma 的經典踩雷點**。
只要遵守上述結構，問題不會再復發。

---

## Stock Seasonality Implementation Notes

### Architecture
The seasonality analyzer is a **client-side only tool** with no server dependencies:

- **Data Source**: `lib/stockSeasonality.ts` contains static historical data (1950-present S&P 500)
- **No Prisma/DB Queries**: All analysis is computed in-browser from the static `monthlyData` array
- **i18n Integration**: Uses Vue I18n for all labels, descriptions, and recommendations
- **Public Access**: Page sets `requiresAuth: false` in `definePageMeta`

### Key Files

#### `utils/stockSeasonality.ts`
- **Core Data**: `monthlyData` array with 12 months of historical averages
- **Analysis Functions**:
  - `getBestMonths(count)` / `getWorstMonths(count)` - Sort by avgReturn
  - `calculatePeriodAvgReturn(months[])` - Period analysis (Nov-Apr vs May-Oct)
  - `analyzeSeasonality()` - Complete analysis object
- **Utilities**: Month name localization, return formatting, color classes
- **Volatility Levels**: 5-tier system (low, low-medium, medium, medium-high, high)
- **Strength Levels**: 5-tier system (weakest, weak, neutral, strong, strongest)

#### `pages/tools/seasonality.vue`
- **Reactive Analysis**: Uses `computed()` for all derived data
- **Current Month Highlight**: Automatically detects current month and next month
- **Copy to Clipboard**: Exports analysis as markdown in EN/ZH-TW/ZH-CN
- **SEO**: Includes meta description for search engines
- **Responsive**: Mobile-first grid layouts

### Data Format

```typescript
export interface MonthData {
  month: number              // 1-12
  avgReturn: number          // Average return percentage
  characteristicsKey: string // i18n key for characteristics
  volatility: VolatilityLevel
  possibleReasonsKeys: string[] // i18n keys for reasons
}
```

### Localization Strategy

All user-facing text uses i18n keys:
- Characteristics: `tools.seasonality.months.{jan,feb,...}.characteristics`
- Reasons: `tools.seasonality.months.{jan,feb,...}.reasons.{0,1,2}`
- Volatility: Handled in `getVolatilityLabel()` function
- Strength: Handled in `getStrengthLabel()` function

### Public Tool Considerations

Since this is a **public-access tool** (no authentication required):
- ✅ No sensitive data exposure
- ✅ No server-side computation (static data only)
- ✅ SEO-optimized with meta tags
- ✅ Shareable via clipboard export
- ✅ Mobile-responsive design

### Adding Historical Data Updates

When updating with new historical data:

1. Recalculate averages in `monthlyData` array
2. Update i18n files for any new characteristics/reasons
3. Verify `getBestMonths()` / `getWorstMonths()` still return correct results
4. Test period calculations (strong vs weak)

---

## Recurring Alerts Implementation

### Architecture
Recurring alerts allow users to set up **multi-instance reminders** for diary entries:

- **WEEK Mode**: Daily alerts from start date through Friday of the same week (skips weekends)
- **MONTH Mode**: Daily alerts from start date through the last day of the month (skips weekends)
- **Smart Scheduling**: Automatically skips Saturday/Sunday
- **Parent-Child Relationship**: First alert is parent, subsequent alerts link via `parentId`

### Key Files

#### `lib/recurring-alerts.ts`
- **Core Functions**:
  - `calculateRecurringAlertDates(config)` - Returns array of trigger dates
  - `calculateEndDate(startDate, mode)` - Determines end date based on WEEK/MONTH mode
  - `generateRecurringAlertsData(config)` - Creates Prisma batch insert data
  - `isWeekday(date)` / `getNextWeekday(date)` - Date utilities
- **Weekend Handling**: Automatically skips Saturday (6) and Sunday (0)
- **Time Preservation**: Maintains the original trigger time from diary creation

#### Database Schema (`prisma/schema.prisma`)
```prisma
model Alert {
  id             BigInt    @id @default(autoincrement())
  diaryId        BigInt
  message        String
  triggerAt      DateTime  @db.Date
  recurringMode  String?   // 'WEEK' | 'MONTH' | null for one-time
  instanceNumber Int?      // 1 for parent, 2+ for children
  parentId       BigInt?   // null for parent alert
  isTriggered    Boolean   @default(false)
  createdAt      DateTime  @default(now())

  diary          Diary     @relation(fields: [diaryId], references: [id], onDelete: Cascade)

  @@index([triggerAt, isTriggered])
  @@index([diaryId])
}
```

### Implementation Flow

1. **User Creates Diary**: In `pages/diaries/new.vue`
   - User selects recurring mode (none/week/month)
   - Trigger time is set based on diary creation time

2. **Server Processing**: `server/api/alerts.post.ts`
   - Calls `generateRecurringAlertsData()`
   - Batch creates all alert instances via Prisma
   - Updates first alert's `parentId` to its own `id`

3. **Alert Display**: `pages/alerts/index.vue`
   - Shows all pending alerts sorted by trigger date
   - Groups recurring alerts visually
   - Displays instance number for recurring alerts

### Important Notes

- **Time Zone Handling**: All dates stored in UTC, trigger time preserved from user's input
- **Cascade Delete**: When diary is deleted, all related alerts are automatically removed (`onDelete: Cascade`)
- **Performance**: Batch creation uses `createMany()` for efficiency
- **Edge Cases**:
  - If start date is Saturday, alerts begin Monday
  - If start date is Sunday, alerts begin Monday
  - WEEK mode always ends on Friday of the same week
  - MONTH mode always ends on last day of the same month

---

## PWA + Nitro Dynamic Route Gotcha (Blog Slug Issue)

### Problem Description
