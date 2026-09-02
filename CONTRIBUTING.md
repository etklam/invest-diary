# 貢獻指南 | Contributing Guide

感謝您對 Diary Vue 投資日記系統的貢獻興趣！本文件將引導您完成開發環境設定、程式碼風格規範與 Pull Request 流程。

## 目錄

- [開發環境設定](#開發環境設定)
- [程式碼風格](#程式碼風格)
- [專案結構概述](#專案結構概述)
- [Git 工作流程](#git-工作流程)
- [Pull Request 流程](#pull-request-流程)
- [測試要求](#測試要求)
- [Commit 規範](#commit-規範)
- [分支命名](#分支命名)
- [問題回報](#問題回報)

---

## 開發環境設定

### 必要條件

| 軟體 | 最低版本 | 說明 |
|------|---------|------|
| Node.js | 18+ (建議 20 LTS) | JavaScript 執行環境 |
| MariaDB | 11.4 | Backend v1 production database（Prisma `mysql` provider） |
| npm | 9+ | 套件管理工具（隨 Node.js 安裝） |
| Git | 2.30+ | 版本控制 |

### 快速開始

```bash
# 1. 複製專案
git clone <repository-url>
cd diary-vue

# 2. 安裝依賴
npm install

# 3. 設定環境變數
cp .env.example .env
# 編輯 .env 檔案，填入您的 MariaDB 11.4 連線資訊與 JWT_SECRET

# 4. 執行資料庫遷移
npx prisma migrate dev

# 5. 填充測試資料（可選）
npm run seed

# 6. 啟動開發伺服器
npm run dev
# 訪問 http://localhost:3000
```

### 環境變數說明

編輯 `.env` 檔案，設定以下必要變數：

```bash
# 資料庫連線（請修改為您的實際值）
DATABASE_URL="mysql://username:password@localhost:3306/invest_diary"

# JWT 簽章金鑰（至少 32 字元，請使用 openssl rand -base64 32 生成）
JWT_SECRET="your-32-character-random-secret-key-change-this-in-production"

# 應用程式名稱
NUXT_PUBLIC_APP_NAME="投資日記"

# 站點 URL（生產環境用於 SEO/Sitemap）
NUXT_PUBLIC_SITE_URL="https://your-domain.com"
```

### 資料庫設定

```sql
-- 建立資料庫
CREATE DATABASE invest_diary CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 建立使用者並授權
CREATE USER 'diary_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON invest_diary.* TO 'diary_user'@'localhost';
FLUSH PRIVILEGES;
```

### 開發常用指令

```bash
npm run dev              # 啟動開發伺服器 (http://localhost:3000)
npm run build            # 生產環境建置
npm run preview          # 預覽生產建置
npm run lint             # ESLint 程式碼檢查
npm run typecheck        # TypeScript 型別檢查
npm test                 # 執行所有測試
npm run test:watch       # 監視模式測試
npm run test:coverage    # 測試覆蓋率報告
npm run test:unit        # 僅單元測試
npm run test:integration # 僅整合測試
npm run health:check     # 系統健康檢查
npm run health:full      # 健康檢查 + 建置
npx prisma studio        # Prisma 資料庫管理介面
npx prisma generate      # 重新生成 Prisma Client
```

---

## 程式碼風格

### TypeScript

- 使用 **TypeScript strict 模式**，所有程式碼必須通過 `npm run typecheck`
- 禁止使用 `any` 型別，除非有充分理由並加上註解說明
- 優先使用 `interface` 而非 `type` 定義物件結構
- 使用 `import type` 匯入僅作為型別的依賴

### ESLint

專案使用 ESLint 搭配 `typescript-eslint` 與 `eslint-plugin-vue`：

```bash
# 檢查程式碼風格
npm run lint

# 自動修復可修復的問題
npx eslint . --ext .ts,.vue,.js --fix
```

### 格式化

- 縮排：2 個空格（不使用 Tab）
- 字串：優先使用單引號
- 分號：必須使用
- 行尾：LF (Unix 風格)
- 尾隨逗號：多行結構必須加尾隨逗號
- 行寬上限：120 字元

### Vue 元件規範

- 檔案命名：PascalCase（例如 `DiaryCard.vue`）
- 使用 `<script setup lang="ts">` 語法
- 使用 Composition API，避免 Options API
- Composables 命名：`use[Feature].ts`（例如 `useAuth.ts`）
- Props 必須宣告型別與預設值
- Emits 必須顯式宣告

### Prisma 相關（重要！）

- **永遠不要**直接 `import { PrismaClient }` — 請使用 `import prisma from '~/lib/prisma'`
- **永遠不要**執行時期匯入 `Decimal` — 使用 `import type { Prisma }` 僅作為型別
- Prisma Client 僅在伺服器端使用，不得出現在客戶端程式碼中

---

## 專案結構概述

```
diary-vue/
├── pages/                  # Nuxt 頁面（檔案路由）
│   ├── index.vue           # 首頁
│   ├── diaries/            # 投資日記頁面
│   ├── blog/               # 部落格頁面
│   ├── tools/              # 投資工具頁面
│   └── admin/              # 管理後台頁面
├── server/                 # 伺服器端程式碼
│   ├── api/                # REST API 路由
│   │   ├── auth/           # 認證相關 API
│   │   ├── diaries/        # 日記 CRUD API
│   │   ├── alerts/         # 提醒 API
│   │   ├── blog/           # 部落格 API
│   │   ├── transactions/   # 交易 API
│   │   └── admin/          # 管理員 API
│   ├── middleware/          # 伺服器中間件
│   │   └── auth.ts         # JWT 認證中間件
│   └── utils/              # 伺服器工具函數
├── composables/            # Vue Composables（自動匯入）
│   ├── useAuth.ts          # 認證狀態管理
│   ├── useToast.ts         # 通知提示
│   └── useAppPWA.ts        # PWA 狀態管理
├── lib/                    # 共用工具庫
│   ├── prisma.ts           # Prisma Client 單例 ⚠️ 關鍵
│   ├── jwt.ts              # JWT 簽章與驗證
│   ├── recurring-alerts.ts # 週期性提醒邏輯
│   └── stockSeasonality.ts # 股市季節性分析
├── prisma/                 # 資料庫層
│   ├── schema.prisma       # 資料庫結構定義
│   ├── migrations/         # 遷移檔案
│   └── seed.ts             # 測試資料填充
├── components/             # Vue 元件
├── i18n/                   # 國際化翻譯
│   └── locales/            # 語系檔案 (en, zh-TW, zh-CN)
├── tests/                  # 測試
│   ├── unit/               # 單元測試
│   ├── integration/        # 整合測試
│   └── e2e/                # 端對端測試
├── docs/                   # 文件
├── scripts/                # 工具腳本
├── nuxt.config.ts          # Nuxt 設定
├── tsconfig.json           # TypeScript 設定
├── Dockerfile              # Docker 建置檔
└── docker-compose.yml      # Docker 服務定義
```

### 架構關鍵原則

1. **Prisma 隔離**：Prisma Client 僅存在於 `lib/prisma.ts`，使用 `createRequire` 避免 Vite 打包
2. **認證流程**：JWT httpOnly cookies → `server/middleware/auth.ts` → `event.context.user`
3. **API 路由**：RESTful 命名，動態路由使用 `[param].get.ts` 格式
4. **PWA 快取**：API 路由永遠使用 `NetworkOnly`，靜態資源使用 `CacheFirst`

---

## Git 工作流程

### 分支策略

- `main` — 穩定生產分支，永遠可部署
- 功能分支從 `main` 建立，完成後合併回 `main`

### 開發流程

1. 確保 `main` 分支最新：`git checkout main && git pull`
2. 建立功能分支：`git checkout -b feature/your-feature-name`
3. 開發並提交變更
4. 推送分支：`git push -u origin feature/your-feature-name`
5. 建立 Pull Request 到 `main`

---

## Pull Request 流程

### 提交前檢查清單

- [ ] 程式碼通過 `npm run lint`
- [ ] 型別檢查通過 `npm run typecheck`
- [ ] 所有測試通過 `npm test`
- [ ] 新功能包含對應測試
- [ ] 沒有 `console.log` 或除錯程式碼
- [ ] 沒有意外提交的 `.env` 或敏感檔案
- [ ] 文件已更新（如需要）
- [ ] Commit 訊息符合規範

### PR 標題格式

使用與 commit 訊息相同的前綴：
- `feat: 新增日記匯出功能`
- `fix: 修復深色模式對比度問題`
- `refactor: 重構導覽列元件`

### PR 描述模板

```markdown
## 變更摘要
簡述此 PR 的目的與變更內容。

## 變更類型
- [ ] 新功能 (feat)
- [ ] 錯誤修復 (fix)
- [ ] 重構 (refactor)
- [ ] 文件 (docs)
- [ ] 測試 (test)
- [ ] 其他 (chore)

## 測試計畫
描述如何測試這些變更。

## 截圖（如適用）
附上前端變更的截圖。
```

### 審查流程

1. 至少一位維護者審查通過
2. CI 檢查全部通過（lint、typecheck、test）
3. 無合併衝突
4. 使用 Squash Merge 合併到 `main`

---

## 測試要求

### 必須通過

- `npm test` — 所有測試必須通過
- `npm run typecheck` — TypeScript 型別檢查零錯誤
- `npm run lint` — ESLint 零錯誤

### 測試撰寫規範

- **新功能**：必須包含單元測試，覆蓋核心邏輯
- **錯誤修復**：必須包含回歸測試，防止問題再次出現
- **API 變更**：必須更新對應的整合測試
- **覆蓋率目標**：單元測試 80%+

### 測試類型

| 類型 | 目錄 | 指令 | 說明 |
|------|------|------|------|
| 單元測試 | `tests/unit/` | `npm run test:unit` | 獨立函數與 Composables |
| 整合測試 | `tests/integration/` | `npm run test:integration` | API 端點與工作流程 |
| 端對端測試 | `tests/e2e/` | `npm run test:e2e` | Playwright 瀏覽器測試 |

---

## Commit 規範

本專案採用 **Conventional Commits** 規範。每個 commit 訊息必須包含型別前綴與簡潔描述。

### 格式

```
<type>: <簡短描述>

<選擇性詳細說明>

<選擇性 footer>
```

### 型別 (Type)

| 前綴 | 用途 | 範例 |
|------|------|------|
| `feat:` | 新功能 | `feat: add stock comparison chart` |
| `fix:` | 錯誤修復 | `fix: resolve dark mode contrast on dashboard` |
| `refactor:` | 重構（不改變功能） | `refactor: extract diary form into composable` |
| `docs:` | 文件更新 | `docs: update API authentication guide` |
| `test:` | 測試新增或修改 | `test: add unit tests for recurring alerts` |
| `chore:` | 建置/工具/依賴 | `chore: update prisma to 7.4.2` |
| `style:` | 格式調整（不影響邏輯） | `style: format with eslint rules` |
| `perf:` | 效能優化 | `perf: optimize diary list query with index` |
| `ci:` | CI/CD 變更 | `ci: add typecheck step to pipeline` |

### 規範要點

- 描述使用**英文**，採用祈使語氣（imperative mood）
- 首行不超過 72 字元
- 不要以句號結尾
- 如有 Breaking Change，在 footer 加上 `BREAKING CHANGE:` 說明

### 範例

```
feat: add portfolio snapshot comparison tool

Implement side-by-side comparison of portfolio snapshots
with percentage change calculation and visual diff.

Closes #42
```

```
fix: prevent token refresh race condition on page load

The auth middleware was firing multiple refresh requests
simultaneously when the access token was expired. Added
a promise-based lock to ensure only one refresh at a time.
```

---

## 分支命名

請使用以下前綴命名您的分支：

| 前綴 | 用途 | 範例 |
|------|------|------|
| `feature/` | 新功能開發 | `feature/portfolio-snapshot` |
| `fix/` | 錯誤修復 | `fix/dark-mode-contrast` |
| `refactor/` | 程式碼重構 | `refactor/navbar-components` |
| `docs/` | 文件更新 | `docs/api-reference` |
| `test/` | 測試相關 | `test/e2e-auth-flow` |
| `chore/` | 維護性工作 | `chore/update-dependencies` |
| `experiment/` | 實驗性功能 | `experiment/ai-analysis` |

### 命名規則

- 全部小寫
- 使用連字號 `-` 分隔單字
- 簡潔但具描述性（3-5 個單字為佳）
- 不要使用數字編號（除非關聯 Issue）

---

## 問題回報

### 回報 Bug

請使用 GitHub Issues 並包含以下資訊：

1. **描述**：清楚描述問題與預期行為
2. **重現步驟**：逐步說明如何重現問題
3. **環境資訊**：Node 版本、瀏覽器、作業系統
4. **截圖/日誌**：附上相關錯誤訊息或截圖
5. **commit hash**：問題發生的版本

### 功能請求

1. 描述功能與使用情境
2. 說明為何此功能對專案有價值
3. 如有參考實作，附上連結

---

感謝您的貢獻！您的每一行程式碼都讓這個專案變得更好。
