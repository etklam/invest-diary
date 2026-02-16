# CLAUDE.md

這個文件提供給 Claude Code (claude.ai/code) 和開發者在這個儲存庫中工作時的詳細指導。

## 專案概述

這是一個**個人投資日記系統**（投資日記系統）- 一個多用戶應用程式，用於追蹤投資日記，支援 Markdown 寫作、應用程式內提醒，以及使用 FIFO 成本計算的股票投資組合管理。具備基於 JWT 的身份驗證和 bcrypt 密碼雜湊。

**額外功能**：包含一個公開訪問的投資教學博客，管理員可以發布投資知識文章，支援分類、標籤和 Markdown 編輯。

**技術堆疊：** Nuxt 3 + Vue 3 + TypeScript + MySQL + Prisma ORM + Tailwind CSS + JWT + bcrypt + @nuxtjs/color-mode + @vite-pwa/nuxt

**主要語言：** 繁體中文是 UI 和文件的主要語言。

## 開發指令

```bash
# 開發
npm run dev                    # 啟動開發伺服器（支援熱重載）

# 資料庫設定
npx prisma generate            # 生成 Prisma 客戶端
npx prisma migrate dev         # 建立並應用遷移
npx prisma studio              # 開啟 Prisma Studio 查看資料庫
npm run seed                   # 使用範例資料植入資料庫

# 建置與部署
npm run build                  # 建置生產版本
npm run preview                # 在本地預覽生產建置
npm run generate               # 生成靜態網站（SSG）

# 測試
npm test                       # 執行所有測試
npm run test:watch             # 以監看模式執行測試
npm run test:coverage          # 生成覆蓋率報告
npm run test:ui                # 使用視覺化 UI 執行測試

# 健康檢查
npm run health:check           # 執行全面健康檢查（Git pre-commit）
npm run health:full            # 完整健康檢查 + 建置驗證（Git pre-push）
npm run health:quick           # 快速健康檢查（測試 + Prisma 驗證）
```

## 自動化健康檢查系統

這個專案包含一個**自動化健康檢查系統**，在每次程式碼變更後執行以確保系統穩定性。

### 檢查項目

1. **環境變數** - 驗證 `.env` 檔案存在且 `DATABASE_URL` 已配置
2. **Prisma Schema** - 驗證 Prisma schema 語法正確
3. **TypeScript 編譯** - 檢查 TypeScript 類型錯誤
4. **單元測試** - 執行所有測試套件
5. **資料庫連接** - 驗證 MySQL 可存取
6. **相依項** - 確保 `node_modules` 和 `.nuxt` 存在

### 健康檢查執行時機

- **Pre-commit**：每次 Git commit 前自動執行 `npm run health:check`
- **Pre-push**：每次 Git push 前自動執行 `npm run health:full`
- **手動**：隨時執行 `npm run health:check` 驗證系統健康狀態

### 健康檢查 API 端點

系統暴露 `GET /api/health` 用於監控：

```bash
curl http://localhost:3000/api/health
```

回應：
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "checks": {
    "database": {
      "status": "ok",
      "responseTime": 15
    },
    "server": {
      "status": "ok",
      "uptime": 3600,
      "environment": "development"
    }
  }
}
```

### 健康狀態元件

`<HealthStatus>` 元件在 UI 中顯示系統狀態：
- 健康時顯示綠色指示器與「系統正常」
- 異常時顯示紅色指示器與「系統異常」
- 每 30 秒自動重新整理
- 點擊顯示錯誤詳細資訊

### 跳過健康檢查

如果您需要在 Git 操作期間跳過健康檢查：

```bash
# 跳過 pre-commit 檢查
git commit --no-verify -m "WIP: experimental changes"

# 跳過 pre-push 檢查
git push --no-verify
```

**警告**：僅在確定變更安全時才跳過檢查！

## 架構概覽

### 全端 Nuxt 模式
- **混合渲染**：透過 Nuxt 3 實現 SSR + SSG
- **基於檔案的路由**：`pages/` 目錄自動生成路由
- **伺服器 API 路由**：`server/api/` 包含無伺服器端點
- **自動導入**：元件、組合式函數和工具函式自動導入

### 資料層
- **ORM**：使用 MySQL 8.0+ 的 Prisma
- **Prisma 客戶端單例**：`lib/prisma.ts` 導出單一實例，在開發中支援熱重載
- **級聯刪除**：刪除日記會自動刪除其提醒和交易
- **運行時配置**：資料庫 URL 來自 `DATABASE_URL`，應用程式名稱來自 `NUXT_PUBLIC_APP_NAME`

### 資料庫模型

六個主要表格，具有外鍵關係：
- **User** - 使用者帳戶，包含電子郵件、密碼（bcrypt 雜湊）、姓名和交易設定
- **Diary** - 主要日記條目，具有 `date` 欄位（預設為現在）、標題（必填）、內容（可選）、連結到 User
- **Alert** - 連結到日記的基於時間的提醒（trigger_at、is_dismissed）
- **Transaction** - 連結到日記的股票交易（BUY/SELL、FIFO 計算）
- **Discipline** - 使用者的自定義交易紀律引語（content: VarChar(255)，連結到 User）
- **Post** - 博客文章，具有標題、slug、內容（Markdown）、摘要、封面圖片、分類、標籤、狀態（DRAFT/PUBLISHED/ARCHIVED）、發布時間，連結到 User（作者）

**重要事項：**
- 持股使用平均成本法動態計算（不是真正的 FIFO 匹配），透過 `lib/utils.ts`
- 日記 `date` 欄位強制唯一性：每天只能有一篇日記（透過日期範圍查詢檢查）
- 所有關係使用級聯刪除
- `date` 欄位與 `createdAt`/`updatedAt` 時間戳分開
- Schema 中的內容欄位是可選的（可以建立沒有內容的日記）

### 關鍵架構決策

1. **身份驗證**：基於 JWT，使用 bcrypt 密碼雜湊，HttpOnly cookies
2. **多用戶**：每個使用者都有自己的日記、提醒和交易
3. **提醒系統**：Nitro cron 任務檢查觸發器（待實作）
4. **Markdown 渲染**：`@nuxtjs/mdc` 用於支援元件的豐富文本
5. **深色模式**：基於 Tailwind CSS 類別（`dark` 類別切換）
6. **類型安全**：完整 TypeScript 與 Zod 驗證

## 檔案結構模式

### API 路由命名慣例

在 `server/api/` 中的 RESTful 模式：
- `auth/login.post.ts` - POST /api/auth/login（驗證使用者，設定 JWT cookie）
- `auth/register.post.ts` - POST /api/auth/register（建立新使用者）
- `auth/logout.post.ts` - POST /api/auth/logout（清除 JWT cookie）
- `auth/me.get.ts` - GET /api/auth/me（取得目前使用者設定檔）
- `diaries.get.ts` - GET /api/diaries（僅限已驗證使用者的日記）
- `diaries.post.ts` - POST /api/diaries（如果相同日期的日記存在則回傳 409 Conflict）
- `diaries/[id].get.ts` - GET /api/diaries/:id
- `diaries/[id].put.ts` - PUT /api/diaries/:id
- `diaries/[id].delete.ts` - DELETE /api/diaries/:id
- `diaries/by-date.get.ts` - GET /api/diaries/by-date?date=YYYY-MM-DD（按日期取得）
- `transactions/latest.get.ts` - GET /api/transactions/latest（重複使用持股）
- `stocks/holdings.get.ts` - GET /api/stocks/holdings（計算後的部位）
- `alerts.get.ts` - GET /api/alerts
- `alerts.post.ts` - POST /api/alerts
- `alerts/[id]/dismiss.put.ts` - PUT /api/alerts/:id/dismiss
- `discipline.get.ts` - GET /api/discipline（取得所有使用者的紀律）
- `discipline.post.ts` - POST /api/discipline（建立新紀律）
- `discipline/random.get.ts` - GET /api/discipline/random（取得隨機紀律引語）
- `admin/stats.get.ts` - GET /api/admin/stats（管理員統計資料）
- `admin/users.get.ts` - GET /api/admin/users（使用者管理）
- `admin/users/[id].delete.ts` - DELETE /api/admin/users/:id（刪除使用者）
- `admin/users/[id]/role.put.ts` - PUT /api/admin/users/:id/role（更新使用者角色）

**博客 API 路由：**
- `blog/index.get.ts` - GET /api/blog（公開，僅已發布文章，支援分頁、分類、標籤篩選）
- `blog/[slug].get.ts` - GET /api/blog/:slug（公開，取得單篇文章詳情）
- `blog/index.post.ts` - POST /api/blog（管理員，建立新文章）
- `blog/[id].put.ts` - PUT /api/blog/:id（管理員，更新文章）
- `blog/[id].delete.ts` - DELETE /api/blog/:id（管理員，刪除文章）
- `blog/admin/index.get.ts` - GET /api/blog/admin（管理員，取得所有文章含草稿）
- `blog/admin/[id]/publish.post.ts` - POST /api/blog/admin/:id/publish（管理員，發布文章）
- `blog/admin/[id]/archive.post.ts` - POST /api/blog/admin/:id/archive（管理員，歸檔文章）

### 元件組織
- `pages/` - 路由頁面（自動導入）
- `pages/auth/` - 身份驗證頁面（登入、註冊）
- `pages/settings/` - 使用者設定頁面
- `pages/stocks/` - 股票持股儀表板
- `pages/timeline/` - 日記的時間軸檢視，支援日期範圍篩選
- `pages/discipline/` - 交易紀律引語管理
- `pages/blog/` - 公開博客頁面（首頁、文章詳情頁）
- `pages/admin/` - 管理員面板
- `pages/admin/blog/` - 博客管理（列表、新增、編輯）
- `components/` - 可重複使用的 Vue 元件（自動導入）
  - `UserMenu.vue` - 已驗證使用者的下拉選單，包含登出
  - `Navigation.vue` - 響應式導航，包含行動選單
  - `BlogCard.vue` - 博客文章卡片
  - `BlogEditor.vue` - Markdown 博客編輯器
  - `CategoryFilter.vue` - 文章分類篩選器
  - `PostMeta.vue` - 文章後設資訊（作者、日期、閱讀時間）
  - `DiaryEditor.vue`、`HoldingsDisplay.vue`、`TransactionInput.vue` 等
- `composables/` - Vue 組合式函數（useAuth.ts、useNavigation.ts、useDiscipline.ts）
- `middleware/` - 路由中介層（auth.ts 用於路由保護）
- `layouts/` - 版面配置包裝器（目前使用來自 `app.vue` 的預設）

### 資料庫 Schema 變更

修改 `prisma/schema.prisma` 時：
1. 變更 schema
2. 執行 `npx prisma migrate dev --name description`
3. Prisma 自動生成 TypeScript 類型

## 環境變數

在 `.env` 中需要（參見 `.env.example`）：
```bash
DATABASE_URL="mysql://username:password@localhost:3306/invest_diary"
JWT_SECRET="your-secret-key-for-jwt-token-signing"
NUXT_PUBLIC_APP_NAME="投資日記"
```

## 特殊實作細節

### 持股成本計算（lib/utils.ts）

持股使用平均成本法（簡化 FIFO）：
- BUY 交易增加部位：數量增加，總成本 += 數量 × 價格
- SELL 交易減少部位：數量減少，成本按平均成本基礎減少
- 平均成本 = 總成本 / 剩餘數量
- 賣出成本計算為：數量 × 目前平均成本（不是真正的批次匹配）
- 數量為零的持股從結果中移除
- 函數：`calculateHoldings()`、`getHoldingBySymbol()`

### 提醒系統
- 提醒儲存時帶有 `trigger_at` 日期（僅日期，沒有時間元件）
- `is_dismissed` 標記用於使用者關閉
- 提醒顯示為日記詳情頁面頂部的固定橫幅
- 時間軸頁面在日記卡片上顯示帶有琥珀色突顯的提醒
- 使用者可以在建立/編輯日記時設定提醒日期
- 支援每篇日記多個提醒

### 身份驗證系統
- 基於 JWT 的身份驗證，使用 `jose` 進行權杖驗證
- 使用 `bcrypt`（10 輪）進行密碼雜湊
- 用於安全權杖儲存的 HttpOnly cookies
- 透過 `middleware/auth.ts` 進行路由保護
- 用於身份驗證狀態管理的使用者組合式函數 `composables/useAuth.ts`
- 支援密碼變更時使權杖失效的權杖版本支援
- 所有日記/提醒/交易查詢都範圍限定於已驗證的使用者

### 使用者設定
- 設定檔：姓名、電子郵件
- 交易偏好：expectedMonthlyTrades、expectedProfit、expectedAvgHolding
- 含有舊密碼驗證的密碼變更
- 設定頁面位於 `pages/settings/index.vue`

### 時間軸檢視
- 所有日記的視覺化時間軸，按年/月分組
- 日期範圍篩選（從/到日期）
- 顯示每篇日記的交易和提醒計數
- 響應式設計，支援行動裝置
- 頁面位於 `pages/timeline/index.vue`

### 色彩模式（深色/淺色主題）
- 使用 `@nuxtjs/color-mode` 模組
- 導航列中的切換按鈕
- 保存使用者偏好
- 系統偏好偵測作為後備
- 所有元件透過 Tailwind `dark:` 類別支援兩種模式

### 導航組合式函數
- `useNavigation()` 提供導航狀態和輔助函數
- `visibleNavItems` - 身份驗證感知的導航項目
- `isActive(path)` - 檢查路由是否啟用
- 處理已驗證與訪客導航

### 國際化（i18n）
- 使用 `@nuxtjs/i18n` 模組進行多語言支援
- 支援的語言：zh-TW（繁體中文，預設）、zh-CN（简体中文）、en（English）
- `locales/` 目錄中的延遲載入語言檔案
- 無前綴策略（URL 不包含語言代碼）
- 使用 cookie 儲存的瀏覽器語言偵測
- 偵測瀏覽器語言並後備為 zh-TW

### Toast 組合式函數
- `useToast()` 提供 toast 通知功能
- `showToast(message, type)` - 顯示 toast 訊息
- 超時後自動關閉

### 交易紀律系統
- 使用者可以透過 `pages/discipline/index.vue` 建立自定義交易紀律引語
- `showDisciplineToast()` 組合式函數在日記儲存/編輯後顯示隨機紀律
- API 端點 `/api/discipline/random` 回傳隨機紀律：
  - 如果使用者有自定義紀律，從其列表中回傳隨機一個
  - 如果使用者沒有紀律，回傳隨機預設引語（鼓勵寫日記）
- 預設引語包括：「寫日記是提升交易心態的最好方法」、「明天又是新的一天，持續寫日記吧」等
- Toast 顯示 8 秒，自定義引語用 💭，預設引語用 💡
- 在 `pages/diaries/new.vue` 和 `pages/diaries/[id]/edit.vue` 中成功建立/編輯日記後自動呼叫

### 交易重複使用

建立新日記時，使用者可以透過 `/api/transactions/latest` 從最新交易記錄複製持股。

### PWA（漸進式 Web 應用程式）
- 使用 `@vite-pwa/nuxt` 模組進行離線支援和可安裝性
- **PWA 元件：**
  - `PWAInstallPrompt.vue` - 當應用程式可以安裝時顯示安裝橫幅
  - `PWAReloadPrompt.vue` - 顯示更新提示和離線就緒通知
- **PWA 配置**（`nuxt.config.ts`）：
  - 服務工作者的自動更新模式
  - 包含應用程式名稱、圖示、主題色彩的 manifest
  - 靜態資源和 API 端點的 Workbox 快取策略
  - 測試啟用的開發模式
- **重要：** 在元件中存取 `$pwa` 時，總是先檢查它是否存在：
  ```typescript
  const pwa = computed(() => {
    try {
      return useNuxtApp().$pwa
    } catch {
      return null
    }
  })
  ```
  `$pwa` 物件在 SSR 期間或 PWA 初始化前可能未定義
- **圖示生成：** `scripts/` 中的腳本從 SVG 來源生成 PNG 圖示：
  - `scripts/generate-icons.js` - 生成 SVG 基礎圖示
  - `scripts/generate-png-icons.js` - 生成 PNG 圖示（192x192、512x512、maskable）
- **快取策略：**
  - 靜態資源：CacheFirst（1 年到期）
  - API 端點：NetworkFirst，5 分鐘快取
  - Google Fonts：CacheFirst（1 年到期）

### 管理員功能
- 管理員可以透過 `pages/admin/index.vue` 存取系統管理面板
- 管理員統計：總使用者數、管理員數、總日記數、總提醒數、總交易數
- 使用者管理：查看所有使用者、搜尋使用者、變更使用者角色、刪除使用者
- 管理員 API 端點受 `server/middleware/admin.ts` 保護
- 管理員角色在 `User` 模型中定義為 `UserRole` 枚舉

### 博客系統
- **公開訪問**：博客首頁（`/blog`）和文章詳情頁（`/blog/[slug]`）對所有訪客開放，無需登入
- **管理員專屬**：只有管理員可以建立、編輯、發布和刪除博客文章
- **文章狀態**：支援三種狀態 - DRAFT（草稿）、PUBLISHED（已發布）、ARCHIVED（已歸檔）
- **Markdown 支援**：文章內容使用 `@nuxtjs/mdc` 渲染，支援豐富的 Markdown 語法
- **分類系統**：四個預設分類 - 基本面分析、技術面分析、市場觀察、投資策略
- **標籤系統**：支援自定義標籤，以逗號分隔儲存
- **SEO 友好**：自動從標題生成 URL slug，支援封面圖片、摘要
- **閱讀時間**：自動計算文章預估閱讀時間（基於 200 字/分鐘）
- **篩選與搜尋**：公開 API 支援按分類、標籤篩選和關鍵字搜尋
- **分頁**：公開 API 支援分頁，預設每頁 9 篇文章
- **工具函數**（`lib/blog.ts`）：
  - `generateSlug()` - 從標題生成 URL 友善的 slug
  - `generateExcerpt()` - 從 Markdown 內容生成純文本摘要
  - `calculateReadingTime()` - 計算閱讀時間
  - `parseTags()` / `stringifyTags()` - 標籤與字串的轉換
- **博客元件**：
  - `BlogCard.vue` - 文章卡片，顯示封面、分類、標題、摘要、標籤、後設資訊
  - `BlogEditor.vue` - 管理員用 Markdown 編輯器，支援即時預覽
  - `CategoryFilter.vue` - 分類篩選下拉選單
  - `PostMeta.vue` - 顯示作者、發布時間、閱讀時間
- **博客頁面**：
  - `/blog` - 公開博客首頁，顯示已發布文章列表，支援分頁和篩選
  - `/blog/[slug]` - 文章詳情頁，顯示完整內容和相關文章
  - `/admin/blog` - 管理員博客管理面板
  - `/admin/blog/new` - 建立新文章
  - `/admin/blog/[id]/edit` - 編輯現有文章

## UI/UX 模式

- **響應式**：使用 Tailwind 斷點的行動優先設計
- **圖示**：透過 `@nuxt/icon` 的 Heroicons（自動導入為 `<i-heroicons-name>`）
- **表單**：使用 Zod 進行驗證 schema
- **日期**：`lib/utils.ts` 中的 `Intl.DateTimeFormat` 用於本地化（zh-TW）
- **貨幣**：`Intl.NumberFormat` 用於 TWD 貨幣格式化

## 目前實作狀態

基於 README.md 檢查清單：
- ✅ 階段 1：資料庫設定（完成）
- ✅ 階段 2：後端 API 路由（完成）
- ✅ 階段 3：前端 UI 元件（完成）
- ✅ 階段 4：核心功能整合（完成）
- ✅ 階段 5：配置與文件（完成）
- ✅ 階段 6：測試與品質保證（完成）
- ✅ 身份驗證系統（完成）
- ✅ 股票持股儀表板（完成）
- ✅ 使用者設定管理（完成）
- ✅ 含篩選的時間軸檢視（完成）
- ✅ 深色/淺色模式切換（完成）
- ✅ 行動響應式導航（完成）
- ✅ 含離線功能的 PWA 支援（完成）
- ✅ 管理員面板（完成）
- ✅ 交易紀律系統（完成）
- ✅ 投資教學博客（完成）

## 重要注意事項

- **需要身份驗證**：所有日記/提醒/交易操作都需要有效的 JWT 權杖
- **博客公開訪問**：博客文章（/blog）對所有訪客開放，無需登入即可閱讀
- **博客管理權限**：只有 ADMIN 角色的使用者可以建立、編輯、發布和刪除博客文章
- 所有 API 回應包含用於除錯的主控台日誌記錄
- 錯誤處理使用 Nuxt 的 `createError()` 與適當的狀態碼
- 日期/時間欄位在 Prisma 中使用 `DateTime` 類型，在 MySQL 中儲存為 `DATETIME`
- 透過 `utf8mb4` 支援中文字元（MySQL 預設）
- 在 Prisma 關係層級配置級聯刪除
- MySQL 在 docker 中執行
- 種子腳本使用 `tsx` 直接執行 TypeScript
- 提醒 cron 任務已計畫但尚未實作
- 時間軸檢視使用用戶端提取（`useLazyFetch`）避免 SSR 身份驗證問題
- 色彩模式偏好保存在 localStorage 並與系統偏好同步
- 交易紀律引語在 schema 中使用 `VarChar(255)` 以簡潔引語
- `showDisciplineToast()` 是一個獲取並顯示隨機紀律的異步組合式函數

## 測試策略

### 測試框架
- **Vitest**：快速單元測試框架
- **@nuxt/test-utils**：Nuxt 元件與整合測試工具
- **happy-dom**：輕量級測試 DOM 環境
- **Vitest UI**：視覺化測試介面（`npm run test:ui`）

### 測試覆蓋範圍
- ✅ 工具函式單元測試（`tests/lib/utils.test.ts`）
  - `calculateHoldings()` - 持股計算（平均成本法）
  - `getHoldingBySymbol()` - 特定股票查詢
  - `formatDate()` - 日期格式化（zh-TW）
  - `formatCurrency()` - 貨幣格式化（TWD）
- ✅ 組合式函數測試（`tests/composables/`）
  - `useNavigation.test.ts` - 導航邏輯測試
  - `useToast.test.ts` - Toast 通知測試
- ✅ API 路由整合測試結構（`tests/api/diaries.test.ts`）
- ✅ 元件測試範例（`tests/components/`）

### 執行測試

```bash
# 執行所有測試
npm test

# 監看模式（開發時使用）
npm run test:watch

# 測試覆蓋率報告
npm run test:coverage

# 視覺化測試介面
npm run test:ui
```

## Docker 部署詳細資訊

### 生產環境特性

生產環境 Dockerfile 包含以下最佳化：

| 特性 | 說明 |
|------|------|
| **多階段建構** | 分離建置和執行環境，減少最終映像大小 |
| **Alpine Linux** | 使用輕量級基礎映像 |
| **非 Root 使用者** | 以 UID 1001 執行，提升安全性 |
| **層級快取最佳化** | 先複製依賴配置檔案，最佳化建置速度 |
| **Tini Init** | 正確處理信號和殭屍程序 |
| **健康檢查** | 自動監控應用程式健康狀態 |
| **自動遷移** | 啟動時自動執行 Prisma 遷移 |
| **開發者支援** | 提供開發環境 Dockerfile 支援熱重載 |

### Docker 環境變數

| 變數 | 說明 | 預設值 |
|------|------|--------|
| `DATABASE_URL` | MySQL 連線字串 | mysql://diary_user:diary_password@mysql:3306/invest_diary |
| `JWT_SECRET` | JWT Token 簽名金鑰 | **必須在生產環境設定** |
| `NUXT_PUBLIC_APP_NAME` | 應用程式名稱 | 投資日記 |
| `NODE_ENV` | 執行環境 | production |
| `PORT` | 應用程式端口 | 3000 |
| `HOST` | 應用程式主機 | 0.0.0.0 |
| `RUN_MIGRATIONS` | 啟動時執行資料庫遷移 | true（生產） |
| `SEED_DATABASE` | 啟動時執行資料庫種子 | false（開發可設為 true） |

### 故障排除

**容器無法啟動：**
```bash
# 查看詳細日誌
docker-compose logs app

# 檢查容器狀態
docker-compose ps

# 重新建置映像
docker-compose up -d --build
```

**資料庫連線失敗：**
```bash
# 確認 MySQL 容器健康狀態
docker-compose logs mysql

# 等待 MySQL 完全啟動（最多 30 秒）
docker-compose up -d
docker-compose logs -f mysql
```

## 效能最佳化

### 前端最佳化
- 使用 Nuxt 3 的混合渲染（SSR + SSG）
- 圖片最佳化與懶載入
- 程式碼分割與動態導入
- PWA 快取策略

### 後端最佳化
- Prisma 查詢最佳化
- 資料庫索引策略
- API 回應快取
- 連線池管理

### 資料庫最佳化
- 適當的索引設計
- 查詢最佳化
- 連線池配置
- 備份策略

## 安全性考量

### 身份驗證與授權
- JWT 權杖與 HttpOnly cookies
- bcrypt 密碼雜湊（10 輪）
- 權杖版本支援
- 路由層級保護

### 資料保護
- 輸入驗證與清理
- SQL 注入防護（Prisma ORM）
- XSS 防護（Vue 3 內建）
- CSRF 保護

### 生產環境安全
- 環境變數管理
- HTTPS 強制
- 安全標頭
- 定期更新相依項

## 監控與日誌記錄

### 應用程式監控
- 健康檢查端點
- 效能指標
- 錯誤追蹤
- 使用者分析

### 日誌記錄策略
- 結構化日誌記錄
- 日誌級別管理
- 日誌輪轉
- 集中式日誌收集

## 故障排除指南

### 常見問題

**身份驗證問題：**
- 檢查 JWT_SECRET 設定
- 驗證 cookie 設定
- 確認中介層配置

**資料庫連線問題：**
- 驗證 DATABASE_URL 格式
- 檢查 MySQL 服務狀態
- 確認網路連線

**PWA 問題：**
- 檢查服務工作者註冊
- 驗證 manifest 配置
- 確認 HTTPS 設定

### 除錯工具

- Nuxt DevTools
- Prisma Studio
- 瀏覽器開發者工具
- Vue DevTools

## 未來增強功能

### 短期目標
- [ ] 實作提醒 cron 任務
- [ ] 增強搜尋功能
- [ ] 改進行動體驗
- [ ] 新增資料匯出功能

### 長期目標
- [ ] 投資組合分析工具
- [ ] 機器學習建議
- [ ] 社群功能
- [ ] 行動應用程式

## 貢獻指南

### 開發流程
1. Fork 專案
2. 建立功能分支
3. 執行健康檢查
4. 提交 Pull Request

### 程式碼標準
- 使用 TypeScript
- 遵循 Vue 3 組合式 API
- 使用 ESLint 和 Prettier
- 撰寫測試

### 提交規範
- 使用語義化提交訊息
- 包含測試覆蓋率
- 更新文件
- 通過所有健康檢查
