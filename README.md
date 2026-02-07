# 投資日記系統 - 實作計劃

## 專案概述

一個為投資者設計的個人日記系統，具備 Markdown 寫作功能和應用程式內的提醒功能，讓未來的自己能收到提醒。使用 Nuxt 3、Vue 3、MySQL 和 Prisma ORM 建構。

---

## 需求摘要

| 需求 | 說明 |
|-------------|-------------|
| **撰寫日記** | 使用 Markdown 格式建立和編輯日記條目 |
| **設定提醒** | 建立在應用程式內的提醒，在指定時間觸發 |
| **追蹤持股** | 記錄買入/賣出交易，系統自動計算持股部位 |
| **重複使用持股** | 建立新日記時可從最新交易記錄複製 |
| **資料庫** | 使用 MySQL 進行資料持久化 |
| **使用者類型** | 僅限個人使用（單一使用者，無需驗證） |

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
    DIARIES ||--o{ ALERTS : has
    DIARIES ||--o{ TRANSACTIONS : contains
    
    DIARIES {
        bigint id PK
        string title
        text content
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

#### `diaries` 表格
| 欄位 | 類型 | 說明 |
|--------|------|-------------|
| id | BIGINT | 主鍵，自動遞增 |
| title | VARCHAR(255) | 日記標題 |
| content | TEXT | 日記的 Markdown 內容 |
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
| 資料庫 | MySQL 8.0+ | 關聯式資料庫 |
| ORM | Prisma | 型別安全的資料庫客戶端 |
| Markdown | @nuxtjs/mdc | 支援元件的 Markdown 渲染 |
| 日期處理 | date-fns | 日期操作工具 |
| 圖示 | @nuxt/icon | 圖示元件（UnoCSS） |
| TypeScript | v5 | 型別安全 |

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

### 階段 4：核心功能實作

- [ ] 使用 `@nuxtjs/mdc` 實作 Markdown 編輯器與預覽
- [ ] 使用 MySQL 實作日記 CRUD 操作
- [ ] 實作交易管理（新增買入/賣出交易）
- [ ] 實作從交易記錄計算持股（FIFO 原則）
- [ ] 實作從最新交易複製到新日記
- [ ] 實作使用日期/時間選擇器建立提醒
- [ ] 實作提醒檢查和顯示邏輯
- [ ] 加入日記的日期篩選和排序功能
- [ ] 加入日記的基本搜尋功能

### 階段 5：設定與文件

- [ ] 更新 README.md 的設定說明
- [ ] 建立 `.env.example` 檔案，包含所需變數
- [ ] 更新 `nuxt.config.ts` 的模組設定
- [ ] 加入資料庫設定指南

---

## API 端點規格

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
invest-diary/
├── app/
│   └── app.vue                # 根元件
├── pages/
│   ├── index.vue              # 首頁
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
│   └── Navigation.vue
├── server/
│   ├── api/
│   │   ├── diaries/
│   │   │   ├── index.get.ts
│   │   │   ├── index.post.ts
│   │   │   └── [id]/
│   │   │       ├── index.get.ts
│   │   │       ├── index.put.ts
│   │   │       └── index.delete.ts
│   │   ├── alerts/
│   │   │   ├── index.get.ts
│   │   │   ├── index.post.ts
│   │   │   └── [id]/
│   │   │       └── dismiss/
│   │   │           └── index.put.ts
│   │   └── transactions/
│   │       └── latest/
│   │           └── index.get.ts
│   └── routes/
│       └── alerts-checker.ts  # Nitro cron 任務
├── lib/
│   ├── prisma.ts              # Prisma 客戶端
│   └── utils.ts               # 工具函式
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── public/
├── .env.example
├── .gitignore
├── nuxt.config.ts             # Nuxt 設定
├── package.json
├── tsconfig.json
└── README.md
```

---

## 環境變數

```env
# 資料庫
DATABASE_URL="mysql://username:password@localhost:3306/invest_diary"

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

3. **設定 Prisma**
   ```bash
   npx prisma generate
   npx prisma migrate dev --name init
   ```

4. **執行開發伺服器**
   ```bash
   npm run dev
   ```

5. **建置生產版本**
   ```bash
   npm run build
   npm run preview
   ```

---

## 未來增強功能（選用）

- [ ] 標籤/分類用於組織日記
- [ ] 投資追蹤，包含圖表和績效指標
- [ ] 投資組合績效分析
- [ ] 匯出日記為 PDF
- [ ] 深色/淺色主題切換
- [ ] 全文搜尋與索引
- [ ] 資料備份與還原
- [ ] 行動應用程式（Vue Native）

---

## 備註

- 這是一個個人使用系統，因此不需要驗證
- 提醒檢查將實作為定期執行的 Nitro cron 任務
- 系統使用 Nuxt 3 和 Vue 3 以獲得最佳效能和開發體驗
- 所有元件將支援響應式設計和透過 Tailwind CSS 支援深色模式
- 交易記錄儲存在每篇日記中，系統根據所有交易記錄動態計算持股資訊
- 平均成本採用 FIFO（先進先出）原則計算
- 建立新日記時，系統會提議從最新的交易記錄複製到新日記
