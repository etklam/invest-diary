# 投資日記系統 - 實作計劃

## 專案概述

一個為投資者設計的個人日記系統，具備 Markdown 寫作功能和應用程式內的提醒功能，讓未來的自己能收到提醒。支援多使用者帳號系統、JWT 身份驗證、持股管理儀表板。使用 Nuxt 3、Vue 3、MySQL 和 Prisma ORM 建構。

---

## 需求摘要

| 需求 | 說明 |
|-------------|-------------|
| **撰寫日記** | 使用 Markdown 格式建立和編輯日記條目 |
| **設定提醒** | 建立在應用程式內的提醒，在指定時間觸發 |
| **追蹤持股** | 記錄買入/賣出交易，系統自動計算持股部位 |
| **持股儀表板** | 檢視所有持股的詳細資訊與成本分配 |
| **使用者帳號** | 支援註冊、登入、個人設定管理 |
| **資料庫** | 使用 MySQL 進行資料持久化 |

---

## 系統架構

```mermaid
graph TB
    subgraph 前端 - Nuxt 頁面
        A[日記列表頁面 - pages/diaries/index.vue] --> B[日記編輯頁面 - pages/diaries/new.vue]
        B --> C[日記詳情頁面 - pages/diaries/[id].vue]
        D[提醒管理頁面 - pages/alerts/index.vue] --> E[提醒通知元件]
        A --> F[導航與標頭 - components/Navigation.vue]
        B --> G[Markdown 編輯器與預覽 - components/DiaryEditor.vue]
        B --> H[交易輸入元件 - components/TransactionInput.vue]
        C --> I[持股顯示元件 - components/HoldingsDisplay.vue]
    end
    
    subgraph 後端 API - Nuxt 伺服器路由
        J[POST /api/diaries - server/api/diaries.post.ts]
        K[GET /api/diaries - server/api/diaries.get.ts]
        L[PUT /api/diaries/[id] - server/api/diaries/[id].put.ts]
        M[DELETE /api/diaries/[id] - server/api/diaries/[id].delete.ts]
        N[POST /api/alerts - server/api/alerts.post.ts]
        O[GET /api/alerts - server/api/alerts.get.ts]
        P[PUT /api/alerts/[id]/dismiss - server/api/alerts/[id]/dismiss.put.ts]
        Q[GET /api/transactions/latest - server/api/transactions/latest.get.ts]
    end
    
    subgraph 背景工作
        R[Nitro Cron 任務 - 提醒檢查器]
    end
    
    subgraph 資料庫
        S[(MySQL - diaries 表)]
        T[(MySQL - alerts 表)]
        U[(MySQL - transactions 表)]
    end
    
    A --> K
    B --> J
    B --> L
    C --> M
    D --> N
    D --> O
    E --> P
    R --> O
    R --> P
    B --> Q
    
    J --> S
    K --> S
    L --> S
    M --> S
    N --> T
    O --> T
    P --> T
    Q --> U
    J --> U
    L --> U
    K --> U
```

---

## 資料庫架構設計

```mermaid
erDiagram
    USERS ||--o{ DIARIES : owns
    DIARIES ||--o{ ALERTS : has
    DIARIES ||--o{ TRANSACTIONS : contains

    USERS {
        bigint id PK
        string email UK
        string password
        string name
        int tokenVersion
        datetime created_at
        datetime updated_at
    }

    DIARIES {
        bigint id PK
        bigint user_id FK
        string title
        text content
        date date
        datetime created_at
        datetime updated_at
    }

    ALERTS {
        bigint id PK
        bigint diary_id FK
        string message
        datetime trigger_at
        boolean is_dismissed
        datetime created_at
    }

    TRANSACTIONS {
        bigint id PK
        bigint diary_id FK
        string symbol
        enum type (BUY/SELL)
        decimal quantity
        decimal price
        datetime trade_date
        datetime created_at
    }
```

### 表格詳細資訊

#### `users` 表格
| 欄位 | 類型 | 說明 |
|--------|------|-------------|
| id | BIGINT | 主鍵，自動遞增 |
| email | VARCHAR(255) | 使用者電子郵件（唯一） |
| password | VARCHAR(255) | bcrypt 雜湊後的密碼 |
| name | VARCHAR(255) | 使用者顯示名稱 |
| tokenVersion | INT | Token 版本，用於使舊 token 失效 |
| created_at | DATETIME | 建立時間戳記 |
| updated_at | DATETIME | 最後更新時間戳記 |

#### `diaries` 表格
| 欄位 | 類型 | 說明 |
|--------|------|-------------|
| id | BIGINT | 主鍵，自動遞增 |
| user_id | BIGINT | users 表的外鍵 |
| title | VARCHAR(255) | 日記標題 |
| content | TEXT | 日記的 Markdown 內容 |
| date | DATE | 日記日期 |
| created_at | DATETIME | 建立時間戳記 |
| updated_at | DATETIME | 最後更新時間戳記 |

#### `alerts` 表格
| 欄位 | 類型 | 說明 |
|--------|------|-------------|
| id | BIGINT | 主鍵，自動遞增 |
| diary_id | BIGINT | diaries 表的外鍵 |
| message | VARCHAR(500) | 提醒訊息內容 |
| trigger_at | DATETIME | 提醒應觸發的時間 |
| is_dismissed | BOOLEAN | 提醒是否已關閉 |
| created_at | DATETIME | 提醒建立時間戳記 |

#### `transactions` 表格
| 欄位 | 類型 | 說明 |
|--------|------|-------------|
| id | BIGINT | 主鍵，自動遞增 |
| diary_id | BIGINT | diaries 表的外鍵 |
| symbol | VARCHAR(20) | 股票代碼（如 AAPL、TSLA） |
| type | ENUM | 交易類型（BUY 或 SELL） |
| quantity | DECIMAL(15, 4) | 交易數量 |
| price | DECIMAL(15, 4) | 交易價格 |
| trade_date | DATETIME | 交易日期時間 |
| created_at | DATETIME | 記錄建立時間戳記 |

**注意：** 持股資訊（包含平均成本）由系統根據所有交易記錄動態計算，不儲存在資料庫中。計算採用 FIFO（先進先出）原則。

---

## 技術堆疊

| 層級 | 技術 | 用途 |
|-------|-----------|---------|
| 框架 | Nuxt 3 | Vue 3 框架，具備自動導入功能 |
| UI 函式庫 | Vue 3.5+ | 元件函式庫 |
| 樣式 | Tailwind CSS v3 | 實用優先的 CSS 框架 |
| 深色模式 | @nuxtjs/color-mode | 主題切換功能 |
| 資料庫 | MySQL 8.0+ | 關聯式資料庫 |
| ORM | Prisma | 型別安全的資料庫客戶端 |
| 驗證 | JWT + bcrypt | JSON Web Token + 密碼雜湊 |
| Markdown | @nuxtjs/mdc | 支援元件的 Markdown 渲染 |
| 日期處理 | date-fns | 日期操作工具 |
| 圖示 | @nuxt/icon | 圖示元件（UnoCSS） |
| TypeScript | v5 | 型別安全 |
| 測試框架 | Vitest | 單元測試與整合測試 |
| 測試工具 | @nuxt/test-utils | Nuxt 元件測試工具 |
| Git Hooks | Husky | 自動化 Git hooks |
| DOM 環境 | happy-dom | 輕量級測試環境 |

---

## 實作任務

### 階段 1：資料庫設定

- [x] 安裝 MySQL 相關套件（`@prisma/client`、`prisma`、`zod`）
- [x] 設定 Nuxt 模組（`@nuxtjs/tailwindcss`、`@nuxtjs/mdc`、`@nuxt/icon`）
- [x] 設計資料庫架構（diaries、alerts、transactions 表格）
- [x] 建立 Prisma schema 檔案（`prisma/schema.prisma`）
- [x] 設定資料庫連線和環境變數
- [ ] 執行 Prisma 遷移建立表格
- [x] 建立資料庫種子腳本（選用）

### 階段 2：後端 API 路由（Nuxt Server）

- [x] 建立日記條目的 API 路由（`server/api/diaries.post.ts`）
- [x] 建立取得日記條目的 API 路由（`server/api/diaries.get.ts`）
- [x] 建立更新日記條目的 API 路由（`server/api/diaries/[id].put.ts`）
- [x] 建立刪除日記條目的 API 路由（`server/api/diaries/[id].delete.ts`）
- [x] 建立建立提醒的 API 路由（`server/api/alerts.post.ts`）
- [x] 建立取得有效提醒的 API 路由（`server/api/alerts.get.ts`）
- [x] 建立關閉提醒的 API 路由（`server/api/alerts/[id]/dismiss.put.ts`）
- [x] 建立取得最新交易的 API 路由（`server/api/transactions/latest.get.ts`）
- [x] 建立 Nitro cron 任務用於檢查和觸發提醒

### 階段 3：前端 UI 元件（Nuxt 頁面）

- [x] 更新應用程式版面配置，加入導航和標頭（`app.vue` 或 `layouts/default.vue`）
- [x] 建立日記列表頁面（`pages/diaries/index.vue`）
- [x] 建立日記編輯頁面（`pages/diaries/new.vue`、`pages/diaries/[id]/edit.vue`）
- [x] 建立日記詳情頁面（`pages/diaries/[id].vue`）
- [x] 建立提醒管理頁面（`pages/alerts/index.vue`）
- [x] 建立提醒通知元件（`components/AlertNotification.vue`）
- [x] 建立交易輸入元件（`components/TransactionInput.vue`）
- [x] 建立持股顯示元件（`components/HoldingsDisplay.vue`）
- [x] 加入響應式設計和深色模式支援

### 階段 4：核心功能實作 ✅

- [x] 使用 `@nuxtjs/mdc` 實作 Markdown 編輯器與預覽
- [x] 使用 MySQL 實作日記 CRUD 操作
- [x] 實作交易管理（新增買入/賣出交易）
- [x] 實作從交易記錄計算持股（FIFO 原則）
- [x] 實作從最新交易複製到新日記
- [x] 實作使用日期/時間選擇器建立提醒
- [x] 實作提醒檢查和顯示邏輯
- [x] 加入日記的日期篩選和排序功能
- [x] 加入日記的基本搜尋功能

> 📄 **詳細說明**: 請參考 [Stage 4 實作報告](docs/STAGE4_IMPLEMENTATION.md)

### 階段 7：身份驗證與使用者系統 ✅

- [x] 實作 JWT 身份驗證系統
- [x] 建立使用者註冊 API（`server/api/auth/register.post.ts`）
- [x] 建立使用者登入 API（`server/api/auth/login.post.ts`）
- [x] 建立使用者登出 API（`server/api/auth/logout.post.ts`）
- [x] 建立取得目前使用者 API（`server/api/auth/me.get.ts`）
- [x] 實作 bcrypt 密碼雜湊
- [x] 實作 HttpOnly Cookie 存儲 JWT
- [x] 建立路由中介層（`middleware/auth.ts`）
- [x] 建立登入頁面（`pages/auth/login.vue`）
- [x] 建立註冊頁面（`pages/auth/register.vue`）
- [x] 建立身份驗證 Composable（`composables/useAuth.ts`）
- [x] 更新所有 API 以支援使用者隔離

### 階段 8：持股儀表板 ✅

- [x] 建立持股儀表板頁面（`pages/stocks/index.vue`）
- [x] 實作持股摘要卡片（總持股、成本、股票數）
- [x] 實作詳細持股表格與成本分配
- [x] 支援用戶端資料獲取以避免 SSR 身份驗證問題

### 階段 9：時間軸檢視 ✅

- [x] 建立時間軸頁面（`pages/timeline/index.vue`）
- [x] 實作按年/月分組的日記時間軸
- [x] 新增日期範圍篩選功能
- [x] 顯示交易與提醒計數
- [x] 響應式設計與行動裝置支援

### 階段 10：使用者體驗優化 ✅

- [x] 實作深色/淺色主題切換（`@nuxtjs/color-mode`）
- [x] 建立使用者選單元件（`components/UserMenu.vue`）
- [x] 實作響應式導航與行動版選單
- [x] 新增 useNavigation composable 統一導航邏輯

### 階段 5：設定與文件

- [x] 更新 README.md 的設定說明
- [x] 建立 `.env.example` 檔案，包含所需變數
- [x] 更新 `nuxt.config.ts` 的模組設定
- [x] 加入資料庫設定指南

### 階段 6：測試與品質保證

- [x] 建立 Vitest 測試框架配置
- [x] 撰寫工具函式單元測試
- [x] 建立 API 路由測試結構
- [x] 設定 Git Hooks (Husky) 自動化檢查
- [x] 實作系統健康檢查機制
- [x] 建立健康檢查 API 端點
- [x] 撰寫測試與健康檢查文件

---

## API 端點規格

### 身份驗證端點

| 方法 | 端點 | 說明 |
|--------|----------|-------------|
| POST | `/api/auth/register` | 註冊新使用者 |
| POST | `/api/auth/login` | 使用者登入（設定 JWT Cookie） |
| POST | `/api/auth/logout` | 使用者登出（清除 JWT Cookie） |
| GET | `/api/auth/me` | 取得目前使用者資料 |

### 使用者設定端點

| 方法 | 端點 | 說明 |
|--------|----------|-------------|
| GET | `/api/user/settings` | 取得使用者設定 |
| PUT | `/api/user/settings` | 更新使用者設定 |
| PUT | `/api/user/password` | 修改使用者密碼 |

#### 請求/回應範例

**POST /api/auth/register**
```json
// 請求
{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "張三"
}

// 回應
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "張三",
    "createdAt": "2025-02-08T10:00:00Z"
  }
}
```

**POST /api/auth/login**
```json
// 請求
{
  "email": "user@example.com",
  "password": "securePassword123"
}

// 回應（JWT 設定於 HttpOnly Cookie）
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "張三"
  }
}
```

### 日記端點

| 方法 | 端點 | 說明 |
|--------|----------|-------------|
| POST | `/api/diaries` | 建立新的日記條目 |
| GET | `/api/diaries` | 取得所有日記條目（可選篩選條件） |
| GET | `/api/diaries/[id]` | 取得特定日記條目 |
| PUT | `/api/diaries/[id]` | 更新日記條目 |
| DELETE | `/api/diaries/[id]` | 刪除日記條目 |

#### 請求/回應範例

**POST /api/diaries**
```json
// 請求
{
  "title": "市場分析 - 2025年2月",
  "content": "# AAPL 分析\n\n強勁的財報...",
  "transactions": [
    {
      "symbol": "AAPL",
      "type": "BUY",
      "quantity": 100,
      "price": 150.25,
      "trade_date": "2025-02-01T09:30:00Z"
    },
    {
      "symbol": "TSLA",
      "type": "BUY",
      "quantity": 50,
      "price": 200.50,
      "trade_date": "2025-02-01T10:00:00Z"
    }
  ]
}

// 回應
{
  "id": 1,
  "title": "市場分析 - 2025年2月",
  "content": "# AAPL 分析\n\n強勁的財報...",
  "created_at": "2025-02-07T12:00:00Z",
  "updated_at": "2025-02-07T12:00:00Z",
  "transactions": [
    {
      "id": 1,
      "symbol": "AAPL",
      "type": "BUY",
      "quantity": 100,
      "price": 150.25,
      "trade_date": "2025-02-01T09:30:00Z"
    },
    {
      "id": 2,
      "symbol": "TSLA",
      "type": "BUY",
      "quantity": 50,
      "price": 200.50,
      "trade_date": "2025-02-01T10:00:00Z"
    }
  ]
}
```

### 提醒端點

| 方法 | 端點 | 說明 |
|--------|----------|-------------|
| POST | `/api/alerts` | 建立新的提醒 |
| GET | `/api/alerts` | 取得有效提醒 |
| PUT | `/api/alerts/[id]/dismiss` | 關閉提醒 |

#### 請求/回應範例

**POST /api/alerts**
```json
// 請求
{
  "diary_id": 1,
  "message": "檢視 AAPL 部位",
  "trigger_at": "2025-03-01T09:00:00Z"
}

// 回應
{
  "id": 1,
  "diary_id": 1,
  "message": "檢視 AAPL 部位",
  "trigger_at": "2025-03-01T09:00:00Z",
  "is_dismissed": false,
  "created_at": "2025-02-07T12:00:00Z"
}
```

### 交易端點

| 方法 | 端點 | 說明 |
|--------|----------|-------------|
| GET | `/api/transactions/latest` | 取得最新日記的交易記錄 |
| POST | `/api/transactions` | 建立新的交易記錄 |

### 系統監控端點

| 方法 | 端點 | 說明 |
|--------|----------|-------------|
| GET | `/api/health` | 系統健康檢查狀態 |

#### 請求/回應範例

**GET /api/health**
```json
// 回應（系統正常）
{
  "status": "healthy",
  "timestamp": "2025-02-08T10:30:00.000Z",
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

// 回應（系統異常）
{
  "status": "unhealthy",
  "timestamp": "2025-02-08T10:30:00.000Z",
  "checks": {
    "database": {
      "status": "error",
      "message": "Database connection failed"
    },
    "server": {
      "status": "ok",
      "uptime": 3600,
      "environment": "development"
    }
  }
}
```

#### 請求/回應範例

**GET /api/transactions/latest**
```json
// 回應
{
  "diary_id": 5,
  "diary_date": "2025-02-07T12:00:00Z",
  "transactions": [
    {
      "id": 1,
      "symbol": "AAPL",
      "type": "BUY",
      "quantity": 100,
      "price": 150.25,
      "trade_date": "2025-02-01T09:30:00Z"
    },
    {
      "id": 2,
      "symbol": "TSLA",
      "type": "BUY",
      "quantity": 50,
      "price": 200.50,
      "trade_date": "2025-02-01T10:00:00Z"
    }
  ]
}
```

**POST /api/transactions**
```json
// 請求
{
  "diary_id": 1,
  "symbol": "AAPL",
  "type": "BUY",
  "quantity": 50,
  "price": 155.00,
  "trade_date": "2025-02-15T09:30:00Z"
}

// 回應
{
  "id": 3,
  "diary_id": 1,
  "symbol": "AAPL",
  "type": "BUY",
  "quantity": 50,
  "price": 155.00,
  "trade_date": "2025-02-15T09:30:00Z",
  "created_at": "2025-02-15T09:30:00Z"
}
```

---

## 專案結構

```
diary-vue/
├── app.vue                    # 根元件
├── pages/
│   ├── index.vue              # 首頁
│   ├── auth/
│   │   ├── login.vue          # 登入頁面
│   │   └── register.vue       # 註冊頁面
│   ├── settings/
│   │   └── index.vue          # 使用者設定頁面
│   ├── stocks/
│   │   └── index.vue          # 持股儀表板
│   ├── timeline/
│   │   └── index.vue          # 時間軸檢視
│   ├── diaries/
│   │   ├── index.vue          # 日記列表
│   │   ├── new.vue            # 建立日記
│   │   └── [id]/
│   │       ├── index.vue      # 檢視日記
│   │       └── edit.vue       # 編輯日記
│   └── alerts/
│       └── index.vue          # 提醒管理
├── components/
│   ├── DiaryEditor.vue
│   ├── DiaryList.vue
│   ├── DiaryCard.vue
│   ├── AlertNotification.vue
│   ├── TransactionInput.vue
│   ├── HoldingsDisplay.vue
│   ├── Navigation.vue         # 響應式導航元件
│   ├── UserMenu.vue           # 使用者下拉選單
│   ├── HealthStatus.vue       # 系統健康狀態指示器
│   └── Toast.vue
├── composables/
│   ├── useAuth.ts             # 身份驗證狀態管理
│   ├── useNavigation.ts       # 導航狀態管理
│   └── useToast.ts            # Toast 通知
├── middleware/
│   └── auth.ts                # 路由保護中介層
├── server/
│   └── api/
│       ├── auth/
│       │   ├── login.post.ts
│       │   ├── register.post.ts
│       │   ├── logout.post.ts
│       │   └── me.get.ts
│       ├── user/
│       │   ├── settings.get.ts
│       │   ├── settings.put.ts
│       │   └── password.put.ts
│       ├── diaries/
│       │   ├── get.ts
│       │   ├── post.ts
│       │   ├── by-date.get.ts
│       │   └── [id]/
│       │       ├── get.ts
│       │       ├── put.ts
│       │       └── delete.ts
│       ├── alerts/
│       │   ├── get.ts
│       │   ├── post.ts
│       │   └── [id]/
│       │       └── dismiss/
│       │           └── put.ts
│       ├── transactions/
│       │   └── latest/
│       │       └── get.ts
│       ├── stocks/
│       │   └── holdings.get.ts
│       └── health.get.ts      # 健康檢查 API 端點
├── tests/                     # 測試目錄
│   ├── setup.ts               # 測試設置工具
│   ├── lib/
│   │   └── utils.test.ts      # 工具函式測試
│   ├── api/
│   │   └── diaries.test.ts    # API 路由測試
│   └── components/
│       └── AlertNotification.test.ts  # 元件測試
├── scripts/
│   └── health-check.ts        # 健康檢查腳本
├── lib/
│   ├── prisma.ts              # Prisma 客戶端
│   └── utils.ts               # 工具函式
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/
├── docs/
│   └── HEALTH_CHECK.md        # 健康檢查說明文件
├── .husky/                    # Git hooks
│   ├── pre-commit
│   └── pre-push
├── public/
├── .env.example
├── .gitignore
├── vitest.config.ts           # Vitest 測試配置
├── nuxt.config.ts             # Nuxt 設定
├── package.json
├── tsconfig.json
├── CLAUDE.md                  # Claude Code 指導文件
└── README.md
```

---

## 環境變數

```env
# 資料庫
DATABASE_URL="mysql://username:password@localhost:3306/invest_diary"

# 身份驗證
JWT_SECRET="your-secret-key-for-jwt-token-signing"

# 應用程式
NUXT_PUBLIC_APP_NAME="投資日記"
```

---

## 開發工作流程

1. **設定 MySQL 資料庫**
   ```bash
   # 在本機安裝 MySQL 或使用 Docker
   docker run --name invest-diary-db -e MYSQL_ROOT_PASSWORD=root -e MYSQL_DATABASE=invest_diary -p 3306:3306 -d mysql:8.0
   ```

2. **安裝相依套件**
   ```bash
   npm install
   ```

3. **設定環境變數**
   ```bash
   cp .env.example .env
   # 編輯 .env 檔案設定 DATABASE_URL
   ```

4. **設定 Prisma**
   ```bash
   npx prisma generate
   npx prisma migrate dev --name init
   ```

5. **執行開發伺服器**
   ```bash
   npm run dev
   ```

6. **執行測試**
   ```bash
   # 執行所有測試
   npm test

   # 監看模式（開發時使用）
   npm run test:watch

   # 測試覆蓋率報告
   npm run test:coverage
   ```

7. **系統健康檢查**
   ```bash
   # 完整健康檢查（Git pre-commit 自動執行）
   npm run health:check

   # 包含建置驗證的完整檢查（Git pre-push 自動執行）
   npm run health:full

   # 快速檢查（測試 + Prisma 驗證）
   npm run health:quick
   ```

8. **建置生產版本**
   ```bash
   npm run build
   npm run preview
   ```

### Git Hooks 自動化

專案已設定 Husky Git hooks，在每次 commit 和 push 前自動執行健康檢查：

- **Pre-commit**: 自動執行 `npm run health:check`
- **Pre-push**: 自動執行 `npm run health:full`

如需跳過檢查（僅在確定變更安全時使用）：

```bash
git commit --no-verify -m "WIP: experimental changes"
git push --no-verify
```

---

## Docker 部署

專案提供完整的 Docker 支援，包含生產環境和開發環境的配置。

### 生產環境部署

使用 Docker Compose 快速部署應用程式和 MySQL 資料庫：

```bash
# 1. 設定環境變數（可選，已包含預設值）
cp .env.example .env
# 編輯 .env 檔案，特別是 JWT_SECRET

# 2. 建構並啟動服務
docker-compose up -d

# 3. 查看日誌
docker-compose logs -f app

# 4. 檢查服務狀態
docker-compose ps

# 5. 停止服務
docker-compose down

# 6. 停止並移除所有資料（包含資料庫 volume）
docker-compose down -v
```

**服務訪問：**
- 應用程式：http://localhost:3000
- MySQL：localhost:3306

### 開發環境部署

開發環境支援熱重載（Hot Reload），適合本地開發：

```bash
# 使用開發配置啟動
docker-compose -f docker-compose.dev.yml up

# 在背景執行
docker-compose -f docker-compose.dev.yml up -d

# 查看日誌
docker-compose -f docker-compose.dev.yml logs -f app

# 停止服務
docker-compose -f docker-compose.dev.yml down
```

**開發環境服務：**
- 應用程式：http://localhost:3000
- Nuxt WebSocket（熱重載）：localhost:24678
- MySQL：localhost:3307（避免與生產環境衝突）

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

### 手動執行資料庫遷移

```bash
# 在執行中的容器中執行遷移
docker-compose exec app npx prisma migrate deploy

# 執行種子腳本（僅開發環境）
docker-compose exec app npm run seed
```

### 進入容器除錯

```bash
# 進入應用程式容器
docker-compose exec app sh

# 進入 MySQL 容器
docker-compose exec mysql mysql -u diary_user -pdiary_password invest_diary
```

### Dockerfile 特性

生產環境 Dockerfile 包含以下優化：

| 特性 | 說明 |
|------|------|
| **多階段建構** | 分離建置和執行環境，減少最終映像大小 |
| **Alpine Linux** | 使用輕量級基礎映像 |
| **非 Root 使用者** | 以 UID 1001 執行，提升安全性 |
| **層級快取優化** | 先複製依賴配置檔案，優化建置速度 |
| **Tini Init** | 正確處理信號和殭屬程序 |
| **健康檢查** | 自動監控應用程式健康狀態 |
| **自動遷移** | 啟動時自動執行 Prisma 遷移 |
| **開發者支援** | 提供開發環境 Dockerfile 支援熱重載 |

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

**無法訪問應用程式：**
```bash
# 確認端口是否正確對映
docker-compose port app 3000

# 檢查防火牆設定
# macOS/Linux: 確保端口 3000 未被佔用
lsof -i :3000
```

**生產環境安全性檢查清單：**

- [ ] 修改 `docker-compose.yml` 中的 MySQL root 密碼
- [ ] 設定強大的 `JWT_SECRET`（至少 32 字元隨機字串）
- [ ] 修改 MySQL 使用者密碼（`MYSQL_PASSWORD`）
- [ ] 使用 HTTPS 反向代理（如 Nginx 或 Traefik）
- [ ] 限制資料庫端口僅內網訪問
- [ ] 定期備份 MySQL 資料卷
- [ ] 設定資源限制（CPU、記憶體）
- [ ] 啟用 Docker 日誌輪轉

### 備份與還原

**備份 MySQL 資料庫：**
```bash
# 備份到本地檔案
docker-compose exec mysql mysqldump -u diary_user -pdiary_password invest_diary > backup.sql

# 從 volume 備份
docker run --rm -v diary-vue_mysql_data:/data -v $(pwd):/backup alpine tar czf /backup/mysql-backup.tar.gz -C /data .
```

**還原 MySQL 資料庫：**
```bash
# 從備份檔案還原
cat backup.sql | docker-compose exec -T mysql mysql -u diary_user -pdiary_password invest_diary

# 從 volume 還原
docker run --rm -v diary-vue_mysql_data:/data -v $(pwd):/backup alpine tar xzf /backup/mysql-backup.tar.gz -C /data
```

---

## 測試與品質保證

專案採用全面的測試與品質保證機制：

### 測試框架
- **Vitest**: 快速的單元測試框架
- **@nuxt/test-utils**: Nuxt 元件與整合測試工具
- **happy-dom**: 輕量級測試 DOM 環境
- **Vitest UI**: 可視化測試介面（`npm run test:ui`）

### 測試覆蓋範圍
- ✅ 工具函式單元測試（`tests/lib/utils.test.ts`）
  - `calculateHoldings()` - 持股計算（平均成本法）
  - `getHoldingBySymbol()` - 特定股票查詢
  - `formatDate()` - 日期格式化（zh-TW）
  - `formatCurrency()` - 貨幣格式化（TWD）
- ✅ Composables 測試（`tests/composables/`）
  - `useNavigation.test.ts` - 導航邏輯測試
  - `useToast.test.ts` - Toast 通知測試
- ✅ API 路由整合測試結構（`tests/api/diaries.test.ts`）
- ✅ 元件測試示例（`tests/components/`）

### 執行測試

```bash
# 執行所有測試
npm test

# 監看模式（開發時使用）
npm run test:watch

# 測試覆蓋率報告
npm run test:coverage

# 可視化測試介面
npm run test:ui
```

### 健康檢查機制

每次代碼變更後自動執行的健康檢查包含：

| 檢查項目 | 說明 |
|---------|------|
| 🔑 環境變數 | 驗證 `.env` 文件存在且 `DATABASE_URL` 已配置 |
| 🗄️ Prisma Schema | 驗證 Prisma schema 語法正確 |
| 📘 TypeScript 編譯 | 檢查 TypeScript 類型錯誤 |
| 🧪 單元測試 | 運行所有測試套件 |
| 🗃️ 數據庫連接 | 驗證 MySQL 服務可訪問 |
| 📦 依賴項 | 確保 `node_modules` 和 `.nuxt` 存在 |

詳細說明請參考 [docs/HEALTH_CHECK.md](docs/HEALTH_CHECK.md)

## 未來增強功能（選用）

- [ ] 標籤/分類用於組織日記
- [ ] 投資追蹤，包含圖表和績效指標
- [ ] 投資組合績效分析
- [ ] 匯出日記為 PDF
- [x] 深色/淺色主題切換
- [ ] 全文搜尋與索引
- [ ] 資料備份與還原
- [ ] 行動應用程式（Vue Native）
- [x] 多使用者身份驗證系統
- [x] 持股儀表板
- [x] 時間軸檢視
- [x] 自動化測試系統
- [x] 系統健康檢查機制

---

## 備註

- 系統支援多使用者，每個使用者只能存取自己的日記、提醒和交易記錄
- 身份驗證使用 JWT Token 儲存於 HttpOnly Cookie 中
- 密碼使用 bcrypt 進行雜湊儲存
- 提醒檢查將實作為定期執行的 Nitro cron 任務
- 系統使用 Nuxt 3 和 Vue 3 以獲得最佳效能和開發體驗
- 所有元件將支援響應式設計和透過 Tailwind CSS 支援深色模式
- 交易記錄儲存在每篇日記中，系統根據所有交易記錄動態計算持股資訊
- 平均成本採用 FIFO（先進先出）原則計算
- 建立新日記時，系統會提議從最新的交易記錄複製到新日記
- 時間軸檢視提供按年/月分組的日記列表，支援日期範圍篩選
- 深色/淺色模式自動儲存使用者偏好，支援系統偏好偵測
- 響應式導航提供行動版選單，包含漢堡選單和優化的觸控操作
