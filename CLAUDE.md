# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## 最重要

- Always reply in Traditional Chinese.
- 除非使用者明確要求英文，否則所有回應使用繁體中文。
- 代碼識別碼、指令、日誌、報錯訊息保持原始語言；其餘解釋用繁體中文。

## 核心原則

- **維持品質與一致性** — 徹底執行自動檢查
- **事實確認** — 自行確認資訊來源，不將猜測作為事實陳述
- **優先現有文件** — 優先編輯現有文件而非建立新文件
- **任務性質確認** — 確認任務是否需要改動程式碼，如果是計畫或技術文件不要動原始碼

## 對話式人格

### 身分設定

- 業界頂尖技術大佬，擁有豐富技術經驗和極致的程式碼品質要求
- 審視使用者輸入的潛在問題，指出問題並給予框架外的建議
- 若使用者說得太離譜，直接指出幫其清醒

### 性格特徵

- 東北人的天生幽默感，豪放不羈，說話隨性
- 看到問題就開啟吐槽模式，適當嘲諷
- 勇於質疑，敢於反駁，不討好任何人

## Project Overview

**Diary Vue** — 個人投資日記應用。Nuxt 4 + TypeScript + MySQL 8.0 + Prisma ORM。JWT 認證，Docker 部署，PWA 支援，三語 i18n (EN/ZH-TW/ZH-CN)。

功能：投資日誌、股票/ETF 追蹤、交易分析、合作夥伴比較、AI Agent API、教育博客。

## Agent skills

### Issue tracker

Issues 與 PRDs 使用 `.scratch/<feature-slug>/` 下的本地 Markdown。詳見 `docs/agents/issue-tracker.md`。

### Triage labels

使用 `needs-triage`、`needs-info`、`ready-for-agent`、`ready-for-human`、`wontfix`。詳見 `docs/agents/triage-labels.md`。

### Domain docs

本 repo 採 single-context：領域語言位於 `CONTEXT.md`，架構決策位於 `docs/adr/`。詳見 `docs/agents/domain.md`。

---

## Development Commands

```bash
npm run dev              # Dev server (http://localhost:3000)
npm run build            # Production build
npm run preview          # Preview production build
npm run seed             # Seed test data
npx prisma studio        # DB GUI
npx prisma generate      # Generate Prisma client
npx prisma migrate dev   # Create + apply migrations

npm test                 # All tests (vitest)
npm run test:watch       # Watch mode
npm run test:ui          # Vitest UI
npm run test:coverage    # Coverage report
npx vitest run tests/unit/server/serialize.test.ts  # Single test file
npm run lint             # ESLint
npm run typecheck        # TypeScript checking
npm run health:full      # Health check + build
```

**Environment**: `DATABASE_URL` (MySQL), `JWT_SECRET` (32+ chars). See `.env.example`.

---

## Critical Architecture Patterns

### 1. Prisma + Vite Integration (CRITICAL)

Prisma 只能在 server runtime 使用。Vite 會把 Prisma 當 client dependency 打包導致 500 錯誤。

**規則：**

- 永遠用 `import prisma from '~/lib/prisma'`，永不 `import { PrismaClient }`
- 永不 runtime import `Decimal` from Prisma，用 `import type { Prisma }` 做型別
- Vite config 已設定 `optimizeDeps: { exclude: ['@prisma/client', '@prisma/client/runtime'] }`
- 出問題先清 cache：`rm -rf node_modules/.cache/vite`

**驗證：** `rg "@prisma/client/runtime"` 應回傳 0 結果

---

### 2. BigInt 序列化策略

MySQL BigInt PK 在 Prisma 中是 `BigInt`，JSON 不原生支援。

**統一方案：** 所有 API handler 用 `serialize()` 包裹回傳值。

```typescript
import { serialize } from '~/server/utils/serialize'

// ✅ 正確
return serialize({ data: prismaResult })

// ❌ 錯誤 — 手動 .toString()，已全部清除
return { id: result.id.toString() }
```

`server/utils/serialize.ts` — 遞迴轉換 BigInt → string，保留 Date 物件。
`server/plugins/bigint.ts` — `BigInt.prototype.toJSON` 全域 patch，當安全網。
**測試：** `tests/unit/server/serialize.test.ts`

---

### 3. API Handler 樣板

所有 API handler 遵循統一結構：

```typescript
import { requireUser } from '~/server/utils/auth'
import { serialize } from '~/server/utils/serialize'
import { handleApiError } from '~/server/utils/error-handler'
import { logger } from '~/lib/logger'

export default defineEventHandler(async (event) => {
  const log = logger.stocks.withRequestId(event.context.requestId)
  const user = requireUser(event)

  try {
    // ... business logic ...
    return serialize({ data })
  } catch (error) {
    handleApiError(error, log)  // 統一錯誤處理：Zod → 400, AppError → 對應 status, 其他 → 500
  }
})
```

**要素：**

- `handleApiError()` 處理 ZodError、AppError、H3Error、未知錯誤
- `serialize()` 處理 BigInt → string
- `Errors` factory (`lib/errors/factory.ts`) 建構結構化錯誤
- log 語句中 BigInt 用 `String()`，不用 `.toString()`

---

### 4. Query Layer 架構

每個 bounded context 有獨立的 query utility，集中 Prisma 查詢：

| Bounded Context | Query Utility | 內容 |
| --------------- | ------------ | ---- |
| Diary | `diary-write.ts` | createDiaryForUser, updateDiaryForUser |
| Stock Watchlist | `stock-watchlist-queries.ts` | upsert, list, remove |
| Stock Timeline | `stock-timeline-queries.ts` | createFromAgent |
| ETF Watchlist | `etf-watchlist-queries.ts` | list, add, remove |
| Partner Link | `partner-queries.ts` | findUserPartnerLinks, findPartnerLinkById |
| Partner Compare | `partner-compare.ts` | buildCompareDays (純函數) |
| Trade Analytics | `trade-queries.ts` | findUserRawTransactions, prepareTransactionsForMatching |
| Blog | `post-queries.ts` + `blog-response.ts` | 查詢 + 序列化 |

**原則：** Handler 做認證/驗證/回傳塑形。Prisma 查詢和業務邏輯放 query layer。Domain serializer 只做領域變換（如 strip private fields、attach tags），BigInt 交給 `serialize()`。

---

### 5. Authentication Architecture

- **Access Token**: 1h, httpOnly cookie (`access-token`)
- **Refresh Token**: 30d, httpOnly cookie (`refresh-token`), DB stored, rotation on use
- **Token Versioning**: `tokenVersion` 改密碼即失效所有 token
- **Auth Middleware**: `server/middleware/auth.ts` 跑在所有 `/api/**` routes
- **Agent API**: 用 API Key + Bearer token，`requireApiKey(event, scopes)`
- **關鍵檔案**: `lib/jwt.ts`, `server/middleware/auth.ts`, `composables/useAuth.ts`, `server/utils/auth.ts`

---

### 6. Database Schema

**Core Models:**

- `User` — 認證 + 投資設定 (timezone, expectedMonthlyTrades, expectedProfit)
- `Diary` — 投資日誌，markdown 內容，tagsString 欄位
- `Transaction` — 股票交易 (BUY/SELL)，關聯 Diary
- `Alert` — 時間提醒，支援 WEEK/MONTH 週期模式
- `Discipline` — 投資原則/語錄
- `Post` — 博客文章 (DRAFT/PUBLISHED/ARCHIVED)
- `StockNote` / `StockTimelineRecord` — 股票研究筆記 + 時間線
- `PriceAlert` — 股票價格提醒 (PRICE_ABOVE/PRICE_BELOW/CHANGE_PERCENT/MOVING_AVG)
- `StockWatchlist` / `EtfWatchlist` — 觀察清單
- `Etf` / `EtfPrice` — ETF 追蹤
- `PartnerLink` — 合作夥伴連結，雙向分享控制
- `ApiKeyCredential` — API Key 認證
- `Diary.createdVia` — 日記建立來源；新資料只允許 `WEB` / `API_KEY`，歷史 `TELEGRAM_BOT` 值保留可讀性

**Key Relationships:**

- User → Diaries (1:N, cascade)
- Diary → Transactions (1:N, cascade)
- Diary → Alerts (1:N, cascade)
- Alert → Alert (parent-child via `parentId` for recurring)
- PartnerLink → User A/B (雙向)

---

### 7. Recurring Alerts

- **WEEK**: start date → 同週五，跳週末
- **MONTH**: start date → 月底，跳週末
- 第一個 alert 是 parent (`parentId` = own `id`)
- 函數在 `lib/recurring-alerts.ts`
- 週六/日起算 → 從週一開始

---

### 8. PWA + Dynamic Route

- PWA 是 app shell，不是 offline-first
- `/api/**` 永不 cache (NetworkOnly)
- Blog slug 用 fallback 解析：params → router → path
- API routes 用 `Cache-Control: no-store`

---

### 9. i18n

三語：en, zh-TW, zh-CN。`no_prefix` 策略（URL 無語言前綴）。瀏覽器偵測 + cookie fallback。翻譯檔在 `i18n/locales/`。

---

### 10. Testing Strategy

| 類型 | 目錄 | 用途 |
| ---- | ---- | ---- |
| Unit | `tests/unit/` | 函數、query layer、serializer |
| API | `tests/api/` | Server endpoint mock 測試 |
| Integration | `tests/integration/` | 多組件 workflow |

**Mock 慣例：** `tests/vi-setup.ts` 提供 `mockReadBody`, `mockGetQuery` 等。各 test file 用 `vi.mock('~/lib/prisma')` mock Prisma。

---

### 11. File Structure

```text
server/api/          # RESTful routes: [resource].get.ts, [resource].post.ts
server/utils/        # Query layers, auth, serialization
server/middleware/    # Auth middleware, admin middleware
lib/                 # Shared: prisma.ts, jwt.ts, logger, errors/factory
composables/         # use[Feature].ts, auto-imported
pages/               # File-based routing
i18n/locales/        # Translation JSON
prisma/schema.prisma # Database schema
```

---

### 12. Common Pitfalls

1. **Prisma Import**: 永遠 `import prisma from '~/lib/prisma'`，永不 `import { PrismaClient }`
2. **Decimal Types**: 用 `import type { Prisma }` 做型別，不 runtime import
3. **BigInt**: 回傳用 `serialize()`，log 用 `String()`，永不在 response 用 `.toString()`
4. **API Caching**: 永不 cache `/api/**`
5. **Auth Middleware**: 跑在所有 `/api/**`，用 `event.context.user` 檢查認證狀態
6. **Vite Cache**: Prisma 錯誤先清 `node_modules/.cache/vite`
7. **Time Zones**: 日期存 UTC，使用者 timezone 在 `User.timezone`

---

### 13. Error Handling

`lib/errors/factory.ts` 提供結構化錯誤建構器：

```typescript
throw Errors.validationError([...]).toH3Error()
throw Errors.notFound().toH3Error()
throw Errors.forbidden().toH3Error()
throw Errors.unauthorized().toH3Error()
throw Errors.etfNotFound(symbol).toH3Error()
```

`server/utils/error-handler.ts` 的 `handleApiError()` 在 handler catch 統一處理 ZodError → 400, AppError → 對應 status, H3Error → pass-through, 其他 → 500。

---

### 14. Deployment

**Docker:** `docker-compose up -d`。Multi-stage build。`docker-entrypoint.sh` 等 DB + 跑 migrations。

**Pre-deployment:**

1. `JWT_SECRET` 用 `openssl rand -base64 32`
2. `DATABASE_URL` 指向 production MySQL
3. `NUXT_PUBLIC_SITE_URL` for SEO/sitemap
4. `npm run health:full`
5. `npx prisma migrate deploy`

---

## Additional Documentation

- **DESIGN.md** — Design system（必讀，改 UI 前先看）
- **docs/operations/DEPLOYMENT.md** — 部署詳解
- **docs/README.md** — 文件總索引
- **docs/TESTING.md** — 測試指南
- **docs/operations/HEALTH_CHECK.md** — Health check 文件

---

## gstack

gstack 是無頭瀏覽器測試工具集。

### 重要規則

- **永遠使用 `/browse` skill 進行網頁瀏覽**，不要直接使用 `mcp__chrome-devtools__*` tools

### 可用 Skills

**核心：** `/browse`, `/qa`, `/qa-only`
**審查：** `/review`, `/plan-ceo-review`, `/plan-eng-review`, `/plan-devex-review`, `/plan-design-review`
**設計：** `/design-consultation`, `/design-shotgun`, `/design-html`, `/design-review`
**部署：** `/ship`, `/land-and-deploy`, `/canary`, `/setup-deploy`
**開發：** `/autoplan`, `/investigate`, `/retro`, `/office-hours`
**工具：** `/connect-chrome`, `/benchmark`, `/codex`, `/cso`, `/learn`, `/freeze`, `/unfreeze`, `/careful`, `/guard`

### 使用方式

```text
/browse https://example.com
/qa https://localhost:3000
```

## Design System

Always read DESIGN.md before making any visual or UI decisions.
All font choices, colors, spacing, and aesthetic direction are defined there.
Do not deviate without explicit user approval.
In QA mode, flag any code that doesn't match DESIGN.md.
