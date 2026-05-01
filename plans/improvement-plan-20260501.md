# Diary Vue 改善計畫

**日期**: 2026-05-01
**範圍**: 安全性、可維護性、新功能（排除 PostgreSQL 遷移）
**基線**: main 分支，commit 5ec7529

---

## 總覽

| Phase | 主題 | 任務數 | 優先級 |
|-------|------|--------|--------|
| Phase 0 | 資料品質修復（前置條件） | 3 | 🔴 P0 |
| Phase 1 | 安全性加固 | 5 | 🔴 P0 |
| Phase 2 | 程式碼品質統一 | 6 | 🟠 P1 |
| Phase 3 | 測試補強 | 8 | 🟠 P1 |
| Phase 4 | 可維護性提升 | 5 | 🟡 P2 |
| Phase 5 | 股票追蹤系統（新功能） | 7 | 🔵 Feature |
| Phase 6 | 通知系統 + 行動優化 | 4 | 🟡 P2 |
| Phase 7 | 文檔與開發體驗 | 3 | 🟢 P3 |

---

## 執行狀態（2026-05-01 檢查）

| Phase | 狀態 | 完成率 | 備註 |
|-------|------|--------|------|
| Phase 0 | ✅ 完成 | 3/3 | symbol 正規化、transaction ID 穩定化、成本法註解統一全到位 |
| Phase 1 | ✅ 完成 | 5/5 | CSP、CSRF、速率限制 middleware、PII 遮罩無遺漏 |
| Phase 2 | 🔄 進行中 | 3.5/6 | 2.4: 14 個端點未包 withRequestId；2.6: 錯誤訊息仍硬編碼英文，未 i18n |
| Phase 3 | 🔄 進行中 | 5/8 | 缺 3.3 ETF alert/watchlist 測試、3.4 WebSocket 測試、3.5 E2E 三支 spec |
| Phase 4 | ✅ 完成 | 4/5 | 4.1 依賴升級明確延期（⏸️），其餘 composable 拆分、元件拆分、logger JSON、API 文檔全到位 |
| Phase 5 | 🔄 進行中 | 6.5/7 | 核心功能完整；5.7 測試合併在 `tests/api/stock-tracking.test.ts` 而非 6 個獨立檔案 |
| Phase 6 | 🔄 進行中 | 0.75/4 | 僅 6.4 行動 UX（底部導航、safe-area、手勢）完成；6.1-6.3 通知功能全未動 |
| Phase 7 | ✅ 完成 | 3/3 | CONTRIBUTING.md、CHANGELOG.md、BACKUP_RESTORE.md 全部存在 |

### 未完成項目摘要

| 優先級 | 項目 | 所屬 Phase |
|--------|------|------------|
| 🟠 P1 | requestId 鏈路補完（14 個端點） | Phase 2.4 |
| 🟠 P1 | 錯誤訊息 i18n | Phase 2.6 |
| 🟠 P1 | 5 個端點仍用內聯 ZodError 處理 | Phase 2.5 |
| 🟠 P1 | ETF alert/watchlist 測試 | Phase 3.3 |
| 🟠 P1 | WebSocket 功能測試 | Phase 3.4 |
| 🟠 P1 | E2E 測試（auth-flow、diary-crud、stock-tracking） | Phase 3.5 |
| 🔵 Feature | 股票追蹤獨立測試檔案拆分 | Phase 5.7 |
| 🟡 P2 | 股票到價提醒（PriceAlert model + checkPriceAlerts） | Phase 6.1 |
| 🟡 P2 | 持倉回撤提醒（drawdown-alerts.ts） | Phase 6.2 |
| 🟡 P2 | 開單紀律確認（TransactionInput checkbox UI） | Phase 6.3 |
| 🟡 P2 | 錯誤處理樣板抽取（5 個端點殘留） | Phase 2.5 |

---

## Phase 0: 資料品質修復（前置條件）

> 來源：dev-plan-20260411.md Phase 0 / Codex Review 發現
> 所有後續功能的前置條件，必須先完成

### 0.1 Symbol 正規化
**問題**: `diary-write.ts` create 時存 raw symbol，update 時才 `.toUpperCase()`，導致 `aapl` 和 `AAPL` 被 `calculateHoldings()` 算成兩檔不同股票
**修復**:
- `server/utils/diary-write.ts` create path 加 `.trim().toUpperCase()`
- Prisma migration: `UPDATE transactions SET symbol = UPPER(TRIM(symbol))`
- 加 unit test: `tests/lib/symbol-normalization.test.ts`

### 0.2 Transaction ID 穩定化
**問題**: `server/api/diaries/[id].put.ts:55-62` 編輯日記時 `deleteMany` + recreate 所有交易，transaction ID 每次都變。任何綁定 transactionId 的功能（DisciplineCheck、TradeReview）編輯一次就斷線
**修復**: 把 deleteMany + recreate 改成 diff-based upsert（比對現有 vs 新提交，只刪/增/改差異部分）
**影響檔案**: `server/api/diaries/[id].put.ts`

### 0.3 成本法註解統一
**問題**: `lib/utils.ts:48` 註解寫「FIFO」但實作是 average cost
**修復**: 搜尋所有 FIFO 相關註解（`lib/utils.ts`、`HoldingsDisplay.vue`、tests），改為「平均成本法」

---

## Phase 1: 安全性加固

> 來源：分析報告 Section 2（安全性）

### 1.1 加入 Content-Security-Policy Header
**問題**: 完全沒有 CSP header，對抗 XSS 少一層防線
**修復**: `nuxt.config.ts` routeRules 加入 CSP header，從 report-only 開始逐步收緊
```typescript
'/**': {
  headers: {
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https:"
  }
}
```

### 1.2 管理端點加入速率限制
**問題**: `/api/admin/**`、部落格寫入路由完全無速率限制
**修復**: 對以下路由加上 `generalApi` 限制器（100次/60秒）:
- `/api/admin/**`
- `/api/blog/admin/**`
- `/api/api-keys/**`
- `/api/diaries/**`
- `/api/partners/**`

### 1.3 加入 CSRF Token 機制
**問題**: 完全依賴 `SameSite=Strict` cookie，無縱深防禦
**修復**: 引入 CSRF token header 驗證（可用 `csrf-csrf` 或自定義 middleware）
**影響檔案**: `server/middleware/csrf.ts`（新建）、`nuxt.config.ts`

### 1.4 API Key 創建速率限制
**問題**: 創建 API key 無限流，可被濫用
**修復**: `server/api/api-keys.post.ts` 加入 `generalApi` 限制器

### 1.5 日誌 PII 遮罩
**問題**: Logger 直接記錄 email、IP，無遮蔽
**修復**: `lib/logger.ts` 加入 `maskEmail()`、`maskIp()` 工具函數
- email: `ka***@gm***.com`
- IP: `192.168.***.***`

---

## Phase 2: 程式碼品質統一

> 來源：分析報告 Section 1（可維護性）

### 2.1 統一錯誤處理（27 處 console.log → 結構化 Logger）
**問題**: 13 個檔案中 27 處 `console.log/console.error`，錯誤處理模式不一致
**修復**:
- `server/api/alerts.post.ts` → `Errors` 工廠 + logger
- `server/api/discipline/*.ts`（4 個檔案）→ `Errors` 工廠
- `server/api/admin/*.ts`（5 個檔案）→ `Errors` 工廠 + logger
- `server/api/blog/admin/*.ts`（3 個檔案）→ `Errors` 工廠 + logger
- `server/api/etf/[symbol]/profile.get.ts` → 不要再吞掉錯誤

### 2.2 抽取重複的 enforceRateLimit
**問題**: `auth/login.post.ts`、`auth/register.post.ts`、`user/password.put.ts` 三個檔案中完全相同的 16 行函數
**修復**: 提取到 `server/utils/rate-limit.ts`，三處改為 import

### 2.3 移除冗餘 jsonwebtoken 依賴
**問題**: `jose` 和 `jsonwebtoken` 同時安裝，只用了 `jose`
**修復**:
- `npm uninstall jsonwebtoken @types/jsonwebtoken`
- 確認 `lib/jwt.ts` 只用 `jose`

### 2.4 requestId 鏈路完整化
**問題**: 部分端點未使用 `withRequestId`
**修復**: 確保所有 API endpoint handler 包裝 `withRequestId`

### 2.5 誤差處理樣板抽取
**問題**: 以下模式在 15+ 端點中重複:
```typescript
} catch (error) {
  if (error instanceof z.ZodError) { throw Errors.validationError(...) }
  if (error instanceof AppError) { throw error.toH3Error() }
  throw Errors.internalError(error).toH3Error()
}
```
**修復**: 提取為 `server/utils/error-handler.ts` 的 `handleApiError(error)` 工具函數

### 2.6 錯誤訊息國際化補完
**問題**: 部分錯誤訊息未 i18n
**修復**: 將 `lib/errors/codes.ts` 中的硬編碼錯誤訊息改為 i18n key，前端解析

---

## Phase 3: 測試補強

> 來源：分析報告 Section 1.6（測試缺口）

### 3.1 recurring-alerts 單元測試
**檔案**: `tests/lib/recurring-alerts.test.ts`（新建）
**覆蓋**:
- WEEK mode: 正常日期範圍、跨週末跳過、start date 是週末
- MONTH mode: 正常月份、月底處理、跨週末跳過
- 邊界: 空 config、單日 range、年末跨年

### 3.2 API Key 系統測試
**檔案**: `tests/api/api-keys.test.ts`（新建）
**覆蓋**:
- 創建 API key（正常 + Zod 驗證失敗）
- 列表（只能看到自己的 keys）
- 撤銷（軟刪除 + 所有權檢查）
- Agent API 使用 API key 認證

### 3.3 ETF Alert/Watchlist 測試
**檔案**: `tests/api/etf-alerts.test.ts`、`tests/api/etf-watchlist.test.ts`（新建）
**覆蓋**: CRUD 操作、所有權檢查、價格提醒觸發邏輯

### 3.4 WebSocket 功能測試
**檔案**: `tests/unit/websocket/alertHandler.test.ts`（新建）
**覆蓋**: 連接管理、alert 推送、重連機制

### 3.5 E2E 測試擴充
**檔案**: `tests/e2e/` 目錄
**新增**:
- `auth-flow.spec.ts` — 登入/註冊/登出完整流程
- `diary-crud.spec.ts` — 日記建立/編輯/刪除
- `stock-tracking.spec.ts` — 追蹤股票 + 查看 timeline（Phase 5 完成後）

### 3.6 symbol 正規化回歸測試
**檔案**: `tests/unit/lib/symbol-normalization.test.ts`（新建）
**覆蓋**: 大小寫統一、trim、特殊字符、`.TW` suffix 保留

### 3.7 transaction upsert 回歸測試
**檔案**: `tests/api/diary-update-transactions.test.ts`（新建）
**覆蓋**: 編輯 diary 後 transaction ID 保持不變、增/刪/改差異正確

### 3.8 覆蓋率門檻設定
**修復**: `vitest.config.ts` 加入 coverage threshold:
```typescript
coverage: {
  thresholds: {
    lines: 60,
    functions: 60,
    branches: 50,
    statements: 60
  }
}
```

---

## Phase 4: 可維護性提升

> 來源：分析報告 Section 1（可維護性）+ TECH_DEBT.md
> 狀態（2026-05-01）：已完成 Quick Note composer 低風險收斂、BlogEditor 子元件拆分、Logger JSON 測試與手寫 API 文件。依賴升級僅嘗試 `shiki`，但鎖檔 churn 過大，本輪未落地依賴變更。

### 4.1 更新過時依賴
**優先級順序**:
1. ⏸️ `shiki` 3.23.0 → 4.x：已嘗試，`package-lock.json` 產生大範圍 transitive churn，本輪為低風險 Phase 4 先不落地
2. ⏸️ `@nuxtjs/sitemap` 7.6.0 → 8.x：本輪不碰
3. ⏸️ `@nuxt/image` 1.11.0 → 2.x：本輪不碰
4. ⏸️ `md-editor-v3` 5.8.x → 6.x：本輪不碰
5. ⏸️ `vue-router` 4.6.4 → 5.x：本輪不碰，避免牽動 Nuxt 路由整合

**每個依賴更新流程**: 建立 feature branch → 更新 → typecheck + lint + test → 合併

### 4.2 拆分 useQuickNoteComposer
**問題**: 超過 350 行，違反單一職責
**重構**:
- ✅ `useQuickNoteComposer.ts` → 保留為 coordinator，行數降至 350 行以下
- ✅ 確認 `useQuickNoteDraft.ts`、`useQuickNoteSubmit.ts`、`useQuickNoteTags.ts`、`useQuickNoteTemplates.ts` 已存在
- ✅ 新增 `useQuickNoteTemplateDraft.ts` 收斂模板草稿同步、模板合併與 symbol 正規化，避免 composer 繼續塞業務細節

### 4.3 拆分大型組件
**目標**:
- `Navigation.vue` (392行) → `DesktopNav.vue` + `MobileNav.vue` + `NavLogo.vue` + `ThemeToggle.vue`（部分已存在，檢查是否需要進一步拆分）
- ✅ `Navigation.vue` 已有 `DesktopNav.vue`、`MobileNav.vue`、`NavLogo.vue` 拆分；本輪不做無關重構
- ✅ `BlogEditor.vue` → 提取 `BlogEditorToolbar.vue`、`BlogEditorMarkdownPreview.vue`、`BlogEditorMetadataForm.vue`

### 4.4 Logger 結構化輸出
**問題**: Logger 輸出純文字而非 JSON，日誌聚合工具無法解析
**修復**: ✅ `lib/logger.ts` 已有 JSON 輸出模式（通過環境變數 `LOG_FORMAT=json` 控制），本輪新增 `tests/unit/lib/logger.test.ts` 覆蓋 JSON 可解析輸出、PII masking 與純文字相容性

### 4.5 API 文檔生成
**問題**: 85 個 API endpoint 完全無文檔
**修復**:
- ✅ 不引入高風險 swagger runtime 依賴
- ✅ 新增 `docs/API.md` 手寫 API 文件
- ✅ 優先文檔化: auth、diaries、api-keys、agent、stocks

---

## Phase 5: 股票追蹤系統（新功能）

> 來源：plans/stock-tracking-proposal.md
> 前置依賴：Phase 0（symbol 正規化）

### 5.1 Schema Migration
**新增**:
- `Stock` model（symbol canonicalization）
- `StockWatchlist` model（user + stock + status + sortOrder）
- `StockTimelineRecord` model（summary + source + idempotency + confidence）
- Enums: `StockWatchStatus`、`StockTimelineSourceType`、`StockTimelineCreatedVia`
- `ApiKeyScope` 新增 `AGENT_WRITE`
- 補 `User`、`Diary` relations

**檔案**: `prisma/schema.prisma`、`prisma/migrations/`

### 5.2 API Key Scope 擴展
**修改**: `server/utils/api-key.ts`
- `requireApiKey()` 從單一 scope 改為接受 allowed scopes array
- `/api/agent/diaries.post.ts` 接受 `DIARY_CREATE` 或 `AGENT_WRITE`

### 5.3 Agent API
**新建**:
- `server/api/agent/stocks/watchlist.get.ts` — Ana 讀取用戶追蹤清單
- `server/api/agent/stocks/records.post.ts` — Ana 批量寫入 timeline records（含 batch validation、watchlist gating、idempotent upsert）

**工具函數**:
- `lib/stocks/symbols.ts` — `normalizeStockSymbol()`
- `server/utils/stock-timeline-records.ts` — 寫入邏輯集中

### 5.4 User-facing API
**新建**:
- `server/api/stocks/watchlist/index.get.ts` — 用戶追蹤清單
- `server/api/stocks/watchlist/index.post.ts` — 加入追蹤
- `server/api/stocks/watchlist/[id].patch.ts` — 更新 sortOrder/status
- `server/api/stocks/watchlist/[id].delete.ts` — 封存（ARCHIVED）
- `server/api/stocks/[symbol]/timeline.get.ts` — 單一股票 timeline
- `server/api/stocks/timeline.get.ts` — 全部追蹤股票 timeline feed

**所有 user-facing API 必須**: `requireUser(event)` + userId scope

### 5.5 Frontend
**新建頁面**:
- `pages/stocks/watchlist.vue` — 追蹤清單
- `pages/stocks/[symbol].vue` — 單一股票 timeline

**新建元件** (`components/stocks/`):
- `StockWatchlistTable.vue` — symbol、最新 record、record count
- `StockWatchlistAddForm.vue` — 新增追蹤
- `StockTimeline.vue` — 時間線列表
- `StockTimelineItem.vue` — 單條 record（摘要、來源、confidence）
- `StockSourceBadge.vue` — 來源類型 badge
- `StockEmptyTimeline.vue` — 空狀態

**修改**: `pages/stocks/index.vue` 加入 watchlist/timeline 入口

### 5.6 i18n
**修改**: `i18n/locales/{en,zh-TW,zh-CN}.json` 加入 stocks 相關翻譯 key

### 5.7 Tests
**新建**:
- `tests/lib/stocks-symbols.test.ts` — normalizeStockSymbol
- `tests/api/agent-stocks-watchlist.test.ts` — agent watchlist read
- `tests/api/agent-stocks-records.test.ts` — agent record write（created/updated/skipped）
- `tests/api/stocks-watchlist.test.ts` — user watchlist CRUD
- `tests/api/stocks-timeline.test.ts` — user timeline read
- `tests/integration/agent-stock-timeline.test.ts` — end-to-end agent flow

---

## Phase 6: 通知系統 + 行動優化

> 來源：dev-plan-20260411.md Phase 6（未完成部分）

### 6.1 股票到價提醒
**技術基礎**: `alert-scheduler.ts`（每分鐘 polling）+ WebSocket 推播
**新建**: `PriceAlert` model（不綁 etfId，通用 symbol）
**修改**: `server/plugins/alert-scheduler.ts` 加 `checkPriceAlerts()`
**注意**: ETF 相關（Etf/EtfAlert/EtfPrice/EtfWatchlist）是開發中半成品，完全不動

### 6.2 持倉回撤提醒
**做法**: scheduler 比對 `PortfolioSnapshot` vs 當前市值，超過 threshold 推播
**新建**: `server/utils/drawdown-alerts.ts`

### 6.3 開單紀律確認
**本質**: Phase 3 DisciplineCheck 的延伸
**修改**: `components/TransactionInput.vue` 加逐條打勾 UI
**注意**: 改名為「開單紀律確認」（記錄平台不是執行平台，「交易前」在此無意義）

### 6.4 行動體驗優化（精選子任務）
- 底部導航列（手機）— 純 UI
- 表單 safe-area 修復 — CSS `env()`
- 觸控手勢（swipe）— touch event
- ❌ iOS PWA 深度相容 — 不做（時間黑洞）
- ❌ Home Screen Widget — 不做（需原生開發）

---

## Phase 7: 文檔與開發體驗

> 來源：IMPROVEMENTS.md Priority 7 + TECH_DEBT.md Low Priority

### 7.1 CONTRIBUTING.md
**內容**: 開發環境設定、程式碼風格、PR 流程、測試要求

### 7.2 CHANGELOG.md
**內容**: 從 git history 回溯版本變更記錄

### 7.3 備份與恢復文檔
**檔案**: `docs/BACKUP_RESTORE.md`
**內容**: 資料庫備份策略、恢復流程、定期測試計畫

---

## 不納入範圍（明確排除）

| 項目 | 原因 |
|------|------|
| Prisma + MySQL → Drizzle + PostgreSQL 遷移 | 用戶決定不做 |
| AI 洞察引擎 | 數據量不足，等真實用戶累積 100+ 筆交易後再評估 |
| AI 輔助寫作 | 商業模型未定（誰付 LLM API 費？） |
| 相似交易自動聚合 | AI 洞察引擎的延伸，依賴同樣前置條件 |
| ETF 系統重構 | 開發中半成品，凍結不動 |
| Alert + EtfAlert 架構統一 | 等 ETF 系統完成後再議 |
| iOS PWA 深度相容 | 邊際收益遞減，時間黑洞 |
| Home Screen Widget | 需原生開發，PWA 無法實現 |
| 社交功能 | 個人工具優先 |

---

## 執行順序與依賴

```
Phase 0 (資料品質)
    │
    ├── Phase 1 (安全性) ── 可與 Phase 2 平行
    │
    ├── Phase 2 (程式碼品質) ── 可與 Phase 1 平行
    │
    ├── Phase 3 (測試補強) ── 依賴 Phase 0、2（錯誤處理統一後）
    │
    ├── Phase 4 (可維護性) ── 獨立，可隨時進行
    │
    ├── Phase 5 (股票追蹤) ── 依賴 Phase 0、1（API key scope 擴展）
    │
    ├── Phase 6 (通知+行動) ── 獨立
    │
    └── Phase 7 (文檔) ── 獨立，可隨時進行
```

**建議執行節奏**:
1. Week 1-2: Phase 0 + Phase 1（先修資料、先堵安全洞）
2. Week 2-3: Phase 2（統一程式碼品質，為後續打底）
3. Week 3-4: Phase 3 部分（至少 recurring-alerts + API keys + symbol 回歸測試）
4. Week 4-6: Phase 5（股票追蹤新功能，最大工作量）
5. Week 6-7: Phase 6（通知系統）
6. 持續進行: Phase 4、Phase 7

---

## 測試覆蓋目標

| 階段 | 目標覆蓋率 |
|------|-----------|
| Phase 0-2 完成後 | lines 50% |
| Phase 3 完成後 | lines 60% |
| Phase 5 完成後 | lines 65% |
| 長期目標 | lines 70%+ |
