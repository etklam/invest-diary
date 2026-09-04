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

**Diary Vue** — 個人投資日記應用。Nuxt 4 + TypeScript + MariaDB 11.4 + Prisma ORM（provider 名稱仍是 `mysql`）。JWT 認證，Docker 部署，PWA 支援，三語 i18n (EN/ZH-TW/ZH-CN)。

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
npm run test:integration # Integration tree only
npx vitest run tests/unit/server/serialize.test.ts  # Single test file
npm run lint             # ESLint
npm run typecheck        # TypeScript checking
npm run typecheck:tests  # Critical test/helper typechecking
npm run test:socketio    # Real Socket.IO listener contract
npm run test:e2e         # Playwright E2E; main push deploy gate
npm run health:full      # Health check + build
```

**Environment**: `server/config/env.ts` is the typed runtime configuration
boundary. `DATABASE_URL` and `JWT_SECRET` are mandatory at Nitro startup;
boolean flags use explicit `true`/`false` values. New server code must read
runtime configuration through this boundary; do not add direct
`process.env.SOMETHING` reads outside `server/config/env.ts` (test fixtures and
explicit CLI/bootstrap plumbing are the narrow exceptions). Runtime settings
are parsed on demand rather than cached, because tests and deployment startup
semantics intentionally observe the current environment. See `.env.example`.

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

MariaDB/MySQL BigInt PK 在 Prisma 中是 `BigInt`，JSON 不原生支援。

**統一方案：** 所有 API handler 用 `serialize()` 包裹回傳值。

```typescript
import { serialize } from '~/server/utils/serialize'

// ✅ 正確
return serialize({ data: prismaResult })

// ❌ 錯誤 — 手動 .toString()，已全部清除
return { id: result.id.toString() }
```

`server/utils/serialize.ts` — 遞迴轉換 BigInt → string，保留 Date 物件。回傳型別是 truthful 的 `Serialized<T>`（deep-map bigint/Date → string），handler 可直接標注 `Promise<Serialized<T>>`。
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

每個 bounded context 有獨立的 query utility，集中 Prisma 查詢（完整清單 `ls server/utils/`）：

| Bounded Context | Query Utility | 內容 |
| --------------- | ------------ | ---- |
| Diary 寫入 | `diary-write.ts` | createDiaryForUser, updateDiaryForUser（web + agent 共用） |
| Diary 讀取 | `diary-read.ts` | findDiaryForUser, listDiariesForUser, buildReviewBuckets |
| Alert | `alert-queries.ts` | 日記回頭提醒 CRUD |
| Trade Plan | `trade-plan-queries.ts` | 交易計畫 CRUD |
| Transaction 讀取 | `transaction-read.ts` | readPortfolioTransactions（含 matching 準備） |
| Portfolio | `portfolio-read.ts` | loadValuedHoldings（估值組裝 + valuationStatus） |
| Stock Watchlist | `stock-watchlist-queries.ts` | upsertStockWatchlistItem, listUserWatchlist, updateStockWatchlistItem |
| Stock Timeline | `stock-timeline-queries.ts` | createStockTimelineRecordFromWeb, createStockTimelineRecordsFromAgent, listUserTimeline(BySymbol) |
| Investment Thesis | `investment-thesis-queries.ts` | thesis + reviews |
| Company Hub | `company-hub-query.ts` | 個股入口聚合 |
| ETF Watchlist | `etf-watchlist-queries.ts` | list, add, remove |
| ETF Admin | `etf-admin-queries.ts` | admin ETF 管理 |
| Partner | `partner-queries.ts` + `partner.ts` + `partner-compare.ts` | links, loadCompareContext；sharing gate（`listSharingPartners`）在 `partner.ts` + 純比較函數 |
| Discipline | `discipline-queries.ts` | CRUD + getRandomDiscipline |
| Price Alert | `price-alert-queries.ts` | 價格警示 CRUD |
| User / Auth | `user-queries.ts` | login, register, 密碼變更（tokenVersion++） |
| API Key | `api-key-queries.ts` | CRUD + scope 單一真相源 |
| Blog | `post-queries.ts` + `post-write.ts` | 讀取（Admin/Public persona）+ 寫入 |
| Market Rotation | `market-rotation-queries.ts` / `market-rotation-monitor-queries.ts` | snapshot 查詢 + monitor 組裝 |
| Market State | `market-state-queries.ts` | state / breadth 查詢 |

**原則：** Handler 做認證/驗證/回傳塑形（auth → Zod → query layer → serialize → return）。Prisma 查詢和業務邏輯放 query layer。Domain serializer 只做領域變換（如 strip private fields、attach tags），BigInt 交給 `serialize()`。

---

### 5. Authentication Architecture

- **Credential Resolution（ADR-0006，fail-closed）**: `server/middleware/auth.ts` 對所有 `/api/**` 跑單一演算法，產生 `event.context.auth`（verified transport + identity）；`event.context.user` 為相容層。顯式 credential（`Authorization: Bearer dva_*` API key、`Authorization: Bearer <JWT>` access token、`x-api-key`）驗證失敗一律 401，**永不 fallback cookie**；多個顯式 credential 來源 → 401 拒絕 ambiguity
- **Access Token**: 1h, httpOnly cookie (`access-token`)；native client 也可用 `Authorization: Bearer <access JWT>`
- **Refresh Token**: 30d, httpOnly cookie (`refresh-token`), DB stored. 刻意不輪換（refresh 僅換發 access token）— 避免 cross-tab refresh race 造成強制登出；代價是無 stolen-token 重用偵測，失效只能靠 logout / 改密碼（tokenVersion）
- **Token Versioning**: `tokenVersion` 改密碼即失效所有 token
- **CSRF（transport-aware）**: 只根據已驗證的 auth transport 決策——`cookie` → requireCsrf；`bearer` / `api-key` → 豁免。auth middleware 必須先於 csrf middleware 執行（integration test 鎖定）
- **Agent API**: 用 API Key（前綴 `dva_`），`requireApiKey(event, scopes)`；scope 定義在 `prisma/schema.prisma` 的 `ApiKeyScope` enum（`api-key-queries.ts` 的 `API_KEY_SCOPE_VALUES` 是 DB enum mirror）
- **關鍵檔案**: `lib/jwt.ts`, `server/middleware/auth.ts`, `server/middleware/csrf.ts`, `composables/useAuth.ts`, `server/utils/auth.ts`, `server/utils/api-key.ts`

---

### 6. Database Schema

**Core Models:**

- `User` — 認證 + 投資設定 (timezone, expectedMonthlyTrades, expectedProfit)
- `Diary` — 投資日誌，markdown 內容，tagsString 欄位；`createdVia` 建立來源（新資料只允許 `WEB` / `API_KEY`，歷史 `TELEGRAM_BOT` 保留可讀性）
- `DiaryReconciliationAudit` — 日記重複調解稽核軌跡（見 `scripts/diary-reconcile-duplicates.ts`）
- `Transaction` — 股票交易 (BUY/SELL)，關聯 Diary
- `TradePlan` — 交易計畫（進出場規劃，獨立於已執行的 Transaction）
- `Alert` — 時間提醒，支援 WEEK/MONTH 週期模式
- `Discipline` — 投資原則/語錄
- `Post` — 博客文章 (DRAFT/PUBLISHED/ARCHIVED)
- `Stock` / `StockWatchlist` / `StockNote` / `StockTimelineRecord` / `DiaryStock` — 股票主表、觀察清單、當前觀點筆記、不可變時間線證據、日記↔股票關聯
- `InvestmentThesis` / `ThesisReview` — 投資論點 + 定期審視（full-replace 更新，勿用 merge）
- `PriceAlert` — 股票價格提醒 (PRICE_ABOVE/PRICE_BELOW/CHANGE_PERCENT/MOVING_AVG)
- `EtfWatchlist` / `Etf` / `EtfPrice` — ETF 追蹤（與 Stock 系統完全分離，ADR-0002）
- `PartnerLink` — 合作夥伴連結，雙向分享控制
- `ApiKeyCredential` — API Key 認證
- `RefreshToken` — DB stored refresh token
- Market Rotation（ADR-0004）: `MarketUniverse` / `MarketDailyPrice` / `MarketRotationSnapshot` / `MarketRotationSnapshotRun` / `MarketBreadthDaily` — 持久化每日快照與批次軌跡

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
- dismiss recurring parent 會 atomically dismiss root + materialized children；
  scheduler/list query 亦會檢查 parent state
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

**Mock 慣例：** `tests/vi-setup.ts` 提供 `mockReadBody`, `mockGetQuery` 等共用 mock；domain fixtures 用 `tests/fixtures/builders.ts` 的 builders（`aUser` / `aDiary` / `aTransaction` / `anAlert` / `aStockNote` / `aPost`，預設值涵蓋完整 Prisma row shape；fixture 型別為手寫，schema 加欄位時需同步更新 builders）。各 test file 用 `vi.mock('~/lib/prisma')` mock Prisma。MySQL integration tests 需要 DB（見 `docs/TESTING.md`）。

---

### 11. File Structure

```text
server/api/          # RESTful routes: [resource].get.ts, [resource].post.ts
server/utils/        # Query layers, auth, serialization
server/middleware/    # Auth middleware (fail-closed), CSRF, admin middleware
lib/                 # Shared: prisma.ts, jwt.ts, logger, market-data/, market-rotation/
lib/contracts/       # Client-neutral API 契約: error codes SSOT, diary/review/stocks wire types
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

### 13. Error Handling（ADR-0007）

錯誤契約採 H3 wire shape：machine-readable code 在 `data.code`，`requestId` 由 nitro `error` hook（`server/plugins/error-contract.ts`）注入 `data`。Error codes 單一真相源在 `lib/contracts/common/error-codes.ts`（命名 `MODULE_ACTION_REASON`，三語 i18n mapping + parity test 把關）。Ownership mismatch 一律 404（不洩漏存在性）。

`lib/errors/factory.ts` 提供結構化錯誤建構器。`lib/logger.ts` 會將
unexpected errors 統一記錄為 error message/type/stack，並遮罩 credentials；
request log 透過 `requestId`，scheduler/batch 透過 `jobId` 對應。Production
K3s app/CronJob 設定 `LOG_FORMAT=json`；structured stdout/stderr 的
`level == "ERROR"` 是主要告警訊號，外部 collector 應按 `operation`、
`requestId`/`jobId`、`errorType` 和 `error` 聚合。相關 operational failure
應先用 `formatErrorContext()` 正規化錯誤，再以 `reportError()` 送到可選的
secondary sink；不得記錄 secret、token、cookie 或完整 credential。
`lib/observability.ts` 保留 vendor-neutral `ErrorTrackingSink` seam；接入
外部 tracker 必須只傳 safe error context，而且不可令 request/job failure
處理失敗。Nitro startup 同時觀察 `uncaughtExceptionMonitor` 與
`unhandledRejection`；後者會記錄後維持 Node fail-fast，避免壞 process 繼續
假裝健康。

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

目前保持 modular monolith：deployment topology 假設一個 active
realtime/scheduler instance。`SCHEDULER_ENABLED=true` 必須只出現一次；
WebSocket broadcaster 同 market-data cache 都係 process-local。要水平擴展
web replicas，先要另行設計 distributed coordination（見 ADR-0010）。

K3s 的 `k8s/03-app-deployment.yaml` 固定 `replicas: 1`、`strategy: Recreate`
並明確設定 `SCHEDULER_ENABLED=true`；這是目前「恰好一個」scheduler 的
deployment contract。`k8s/cron-market-rotation.yaml` 以同一 image 直接執行
shared batch scripts，image 必須保留 scripts、lib、必要 server utilities
及 `scripts/tsconfig.runtime.json`。

Pull request 的 Forgejo gate 保持 fast `quality` path；push 到 `main` 必須
再通過完整 Playwright E2E 才能 build/push/deploy。E2E 使用獨立 disposable
MariaDB 11.4，報告與 failure artifacts 由 CI 保留 14 日。不要為了未發生的
水平擴展預先引入 Redis、BullMQ 或 microservice split。

**Pre-deployment:**

1. `JWT_SECRET` 用 `openssl rand -base64 32`
2. `DATABASE_URL` 指向 production MariaDB 11.4
3. `NUXT_PUBLIC_SITE_URL` for SEO/sitemap
4. `LOG_FORMAT=json` in production so the cluster collector receives the
   structured ERROR signal
5. `npm run health:full`
6. `npx prisma migrate deploy` (controlled release step; K3s app manifest keeps
   `RUN_MIGRATIONS=false`)

---

## Additional Documentation

- **DESIGN.md** — Design system（必讀，改 UI 前先看）
- **CONTEXT.md** — 領域語言 + 架構決策記錄（各輪深化審計的完整記錄）
- **docs/adr/** — 架構決策（ADR-0006 credential resolution、ADR-0007 error contract 等）
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
