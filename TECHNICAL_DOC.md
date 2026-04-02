# Diary Vue 技術文檔

## 📋 專案概述

**Diary Vue** 是一個全端投資日記應用程式，使用 Nuxt 4、Vue 3、MySQL 和 Prisma ORM 建構。提供投資日記記錄、投資組合追蹤和教育博客功能，旨在幫助交易員和投資者追蹤交易決策、分析組合表現，並建立紀律性的交易習慣。

- **Nuxt 版本**: 4.3.1+
- **Vue 版本**: 3.5.27
- **資料庫**: MySQL 8.0+ / MariaDB
- **ORM**: Prisma 7.4.2
- **認證**: JWT with httpOnly cookies
- **套件管理工具**: npm
- **Node.js 版本要求**: 18+
- **部署方式**: Docker / CapRover

---

## 🏗️ 專案結構

```
diary-vue/
├── app.vue                      # 根應用組件
├── assets/                      # 靜態資源
│   └── css/                    # 自訂 CSS
│       ├── design-tokens.css   # 設計標記
│       ├── markdown.css        # Markdown 樣式
│       └── mobile.css          # 行動裝置樣式
├── components/                  # Vue 組件（20+ 組件）
│   ├── PWAInstallPrompt.vue    # PWA 安裝提示
│   ├── PWAUpdatePrompt.vue     # PWA 更新提示
│   └── ...                     # 其他業務組件
├── composables/                 # Vue 組合式函數
│   ├── useAppPWA.ts           # PWA 狀態管理
│   ├── useAuth.ts             # 認證狀態
│   └── ...                     # 其他 composables
├── layouts/                     # Nuxt 佈局
│   ├── default.vue             # 預設佈局
│   └── authenticated.vue      # 認證後佈局
├── pages/                       # 檔案路由
│   ├── auth/                   # 認證頁面（login, register）
│   ├── admin/                  # 管理面板（博客管理）
│   ├── blog/                   # 公開博客頁面
│   ├── settings/               # 用戶設定
│   ├── stocks/                 # 投資組合管理
│   ├── tools/                  # 投資工具
│   │   ├── position-sizing/    # 倉位計算器
│   │   └── seasonality/        # 季節性分析器
│   ├── timeline/               # 日記時間軸
│   ├── calendar/               # 日曆視圖
│   ├── alerts/                 # 集中提醒頁面
│   ├── discipline/             # 投資紀律管理
│   └── diaries/                # 日記 CRUD
├── server/                      # Nitro API 路由和中介軟體
│   ├── api/                    # RESTful 端點
│   │   ├── auth/              # 認證 API
│   │   ├── blog/              # 博客 API
│   │   ├── stocks/            # 股票 API
│   │   └── ...                # 其他 API
│   └── middleware/             # Server 中介軟體
│       └── auth.ts            # JWT 認證中介軟體
├── lib/                         # 共用工具庫
│   ├── prisma.ts              # Prisma client 單例
│   ├── positionSizing.ts      # 倉位計算邏輯
│   ├── stockSeasonality.ts    # 股票季節性分析
│   ├── recurring-alerts.ts    # 循環提醒日期計算
│   ├── blog.ts                # 博客工具
│   ├── jwt.ts                 # JWT 工具
│   ├── disciplineShare.ts     # 紀律分享工具
│   └── utils.ts               # 通用工具
├── prisma/                      # Prisma schema 和遷移
│   ├── schema.prisma          # 資料庫 schema
│   ├── migrations/            # 遷移檔案
│   └── seed.ts                # 種子數據
├── i18n/                        # i18n 配置
│   └── locales/               # 翻譯文件（en, zh-TW, zh-CN）
├── database/                    # 資料庫相關
├── scripts/                     # 工具腳本
│   ├── health-check.ts        # 系統健康檢查
│   └── generate-icons.mjs     # PWA 圖示生成
├── tests/                       # 測試檔案
│   ├── unit/                   # 單元測試
│   ├── integration/            # 整合測試
│   └── e2e/                    # E2E 測試（Playwright）
├── public/                      # 公開靜態資源
├── .env                        # 環境變數（不提交）
├── .env.example                # 環境變數範例
├── nuxt.config.ts              # Nuxt 配置
├── tsconfig.json               # TypeScript 配置
├── Dockerfile                  # Docker 建置文件
├── docker-compose.yml           # Docker Compose 配置
├── docker-entrypoint.sh        # Docker 入口腳本
├── captain-definition          # CapRover 部署配置
├── deploy.sh                   # 部署腳本
├── README.md                   # 專案說明
├── CLAUDE.md                   # 開發者文檔
├── DEPLOYMENT.md               # 部署指南
├── IMPLEMENTATION_SUMMARY.md   # 實作總結
└── package.json                # 專案依賴
```

---

## 💻 技術棧詳情

### 核心框架
- **Nuxt**: 4.3.1+
- **Vue**: 3.5.27
- **Vue Router**: 4.6.4

### 資料庫
- **MySQL**: 8.0+（生產環境）
- **MariaDB**: 支援（透過 @prisma/adapter-mariadb）
- **Prisma ORM**: 7.4.2

### 認證與安全
- **JWT**: 9.0.3（Access Token）
- **bcryptjs**: 3.0.3（密碼加密）
- **jose**: 6.1.3（JWT 處理）
- **DOMPurify**: 3.3.3（Markdown 淨化）
- **Zod**: 4.3.6（輸入驗證）

### 樣式
- **Tailwind CSS**: 6.14.0（@nuxtjs/tailwindcss）
- **@tailwindcss/typography**: 0.5.19
- **@nuxtjs/color-mode**: 4.0.0（暗黑模式）

### PWA
- **@vite-pwa/nuxt**: 1.1.1
- **@vite-pwa/assets-generator**: 1.0.2（圖示生成）

### 國際化
- **@nuxtjs/i18n**: 10.2.3
- 支援語言：EN, ZH-TW, ZH-CN

### 內容管理
- **@nuxtjs/mdc**: 0.20.1（Markdown 組件）
- **md-editor-v3**: 5.8.4（Markdown 編輯器）
- **Shiki**: 3.22.0（語法高亮）
- **rehype-gfm**: 4.0.1（GitHub Flavored Markdown）
- **rehype-slug**: 6.0.0
- **rehype-pretty-code**: 0.14.1

### 工具庫
- **@vueuse/core**: 14.2.1
- **date-fns**: 4.1.0（日期處理）
- **canvas**: 3.2.1（圖形生成）
- **socket.io**: 4.8.3（即時通訊）
- **rate-limiter-flexible**: 9.1.1（速率限制）

### 圖片優化
- **@nuxt/image**: 1.11.0
- **sharp**: 0.34.5（圖片處理）

### SEO
- **@nuxtjs/sitemap**: 7.6.0（動態 Sitemap）
- **web-vitals**: 4.2.4（性能指標）

### 測試
- **Vitest**: 4.0.18（單元測試）
- **@vitest/coverage-v8**: 4.0.18（測試覆蓋率）
- **@vitest/ui**: 4.0.18（測試 UI）
- **@nuxt/test-utils**: 4.0.0（Nuxt 測試工具）
- **@playwright/test**: 1.58.2（E2E 測試）
- **@vue/test-utils**: 2.4.6（Vue 測試工具）
- **happy-dom**: 20.5.0（DOM 測試環境）
- **tsx**: 4.21.0（TypeScript 執行）

### 開發工具
- **TypeScript**: 支援內建於 Nuxt
- **vue-tsc**: 3.2.5（Vue 類型檢查）

---

## 🔧 核心功能

### 1. 投資日記

#### 功能
- Markdown 支援的日記條目
- 標籤系統
- 日期管理
- 分類和搜索

#### API 端點
- `GET /api/diaries` - 獲取日記列表
- `POST /api/diaries` - 創建日記
- `GET /api/diaries/:id` - 獲取單一日記
- `PUT /api/diaries/:id` - 更新日記
- `DELETE /api/diaries/:id` - 刪除日記

### 2. 投資組合追蹤

#### 功能
- 股票交易記錄（BUY/SELL）
- 持倉計算
- 即時持倉價值
- 交易歷史

#### API 端點
- `GET /api/stocks/transactions` - 獲取交易記錄
- `POST /api/stocks/transactions` - 創建交易
- `GET /api/stocks/holdings` - 獲取持倉
- `DELETE /api/stocks/transactions/:id` - 刪除交易

### 3. 投資工具

#### 倉位計算器 (`/tools/position-sizing`)
- 計算最佳倉位大小
- 多種策略支援（金字塔、倒金字塔、矩形）
- 分階段倉位管理

#### 股票季節性分析器 (`/tools/seasonality`)
- 基於 S&P 500 歷史數據（1950-至今）
- 月度表現數據
- 當月和下月洞察
- 最佳/最差月份識別
- 週期分析（強週期 vs 弱週期）
- 波動性評估
- 投資建議
- 匯出為 Markdown

### 4. 提醒系統

#### 功能
- 時間提醒（日記條目提醒）
- 循環選項（週/月）
- 集中提醒頁面
- 提醒狀態管理

#### API 端點
- `GET /api/alerts` - 獲取提醒列表
- `POST /api/alerts` - 創建提醒
- `PUT /api/alerts/:id` - 更新提醒
- `DELETE /api/alerts/:id` - 刪除提醒
- `POST /api/alerts/:id/dismiss` - 標記為已閱讀
- `POST /api/alerts/:id/pause` - 暫停提醒

### 5. 投資紀律

#### 功能
- 自訂投資原則/格言
- 分享功能（透過 token）
- 順序管理

#### API 端點
- `GET /api/discipline` - 獲取紀律列表
- `POST /api/discipline` - 創建紀律
- `PUT /api/discipline/:id` - 更新紀律
- `DELETE /api/discipline/:id` - 刪除紀律
- `GET /api/discipline/share/:token` - 共享紀律

### 6. 教育博客

#### 功能
- Markdown 基礎博客系統
- 語法高亮
- 分類過濾
- 管理員管理
- 狀態管理（DRAFT/PUBLISHED/ARCHIVED）

#### API 端點
- `GET /api/blog` - 獲取文章列表
- `GET /api/blog/:slug` - 獲取單篇文章
- `POST /api/blog` - 創建文章（管理員）
- `PUT /api/blog/:id` - 更新文章（管理員）
- `DELETE /api/blog/:id` - 刪除文章（管理員）

### 7. 認證系統

#### 功能
- JWT 認證（httpOnly cookies）
- Refresh Token 輪換
- Token 版本控制
- CSRF 保護（SameSite cookies）

#### API 端點
- `POST /api/auth/register` - 註冊
- `POST /api/auth/login` - 登入
- `POST /api/auth/refresh` - 刷新 Token
- `POST /api/auth/logout` - 登出
- `GET /api/auth/me` - 獲取當前用戶

### 8. PWA 功能

#### 功能
- 安裝到主螢幕（Android / 桌面 Chrome）
- 自動更新（Service Worker）
- 靜態資源/字體運行時快取
- API 路由永不快取（NetworkOnly）

#### 核心組件
- `composables/useAppPWA.ts` - PWA 狀態管理
- `components/PWAInstallPrompt.vue` - 安裝提示（7天消失邏輯）
- `components/PWAUpdatePrompt.vue` - 更新提示

### 9. 視圖

#### 時間軸視圖 (`/timeline`)
- 日記時間軸展示
- 按日期排序

#### 日曆視圖 (`/calendar`)
- 視覺日曆界面
- 按日期查看和管理日記

---

## 📦 主要依賴

### package.json 依賴
```json
{
  "dependencies": {
    "@nuxt/icon": "^2.2.1",
    "@nuxt/image": "^1.11.0",
    "@nuxtjs/i18n": "^10.2.3",
    "@nuxtjs/mdc": "^0.20.1",
    "@nuxtjs/sitemap": "^7.6.0",
    "@nuxtjs/tailwindcss": "^6.14.0",
    "@prisma/adapter-mariadb": "^7.4.2",
    "@prisma/client": "^7.4.2",
    "@tailwindcss/typography": "^0.5.19",
    "@types/dompurify": "^3.0.5",
    "@vueuse/core": "^14.2.1",
    "bcryptjs": "^3.0.3",
    "canvas": "^3.2.1",
    "date-fns": "^4.1.0",
    "dompurify": "^3.3.3",
    "jose": "^6.1.3",
    "jsonwebtoken": "^9.0.3",
    "mariadb": "^3.5.1",
    "md-editor-v3": "^5.8.4",
    "nuxt": "^4.3.1",
    "rate-limiter-flexible": "^9.1.1",
    "rehype-pretty-code": "^0.14.1",
    "rehype-slug": "^6.0.0",
    "remark-gfm": "^4.0.1",
    "shiki": "^3.22.0",
    "socket.io": "^4.8.3",
    "socket.io-client": "^4.8.3",
    "vue": "^3.5.27",
    "vue-router": "^4.6.4",
    "web-vitals": "^4.2.4",
    "zod": "^4.3.6"
  },
  "devDependencies": {
    "@nuxt/test-utils": "^4.0.0",
    "@nuxtjs/color-mode": "^4.0.0",
    "@playwright/test": "^1.58.2",
    "@types/jsonwebtoken": "^9.0.10",
    "@vite-pwa/assets-generator": "^1.0.2",
    "@vite-pwa/nuxt": "^1.1.1",
    "@vitejs/plugin-vue": "^6.0.5",
    "@vitest/coverage-v8": "^4.0.18",
    "@vitest/ui": "^4.0.18",
    "@vue/test-utils": "^2.4.6",
    "happy-dom": "^20.5.0",
    "prisma": "^7.4.2",
    "sharp": "^0.34.5",
    "tsx": "^4.21.0",
    "vitest": "^4.0.18",
    "vue-tsc": "^3.2.5"
  }
}
```

---

## 🔑 配置說明

### nuxt.config.ts（部分）
```typescript
export default defineNuxtConfig({
  nitro: {
    externals: {
      external: ['@prisma/client', 'canvas']
    },
    nodeModulesDirs: [process.cwd() + '/node_modules'],
    experimental: {
      vars: true
    },
    envPrefix: '',
    routeRules: {
      '/api/blog': {
        cors: true,
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=300'
        }
      },
      '/api/blog/**': {
        cors: true,
        headers: {
          'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=900'
        }
      },
      '/api/**': { cors: true, headers: { 'Cache-Control': 'no-store' } },
      '/articles': {
        headers: {
          'Cache-Control': 'public, max-age=120',
          Vary: 'Cookie, Accept-Language'
        }
      },
      '/articles/**': {
        headers: {
          'Cache-Control': 'public, max-age=300',
          Vary: 'Cookie, Accept-Language'
        }
      }
    }
  },
  vite: {
    build: {
      chunkSizeWarningLimit: 1000,
      sourcemap: false,
      modulePreload: {
        polyfill: false
      }
    },
    optimizeDeps: {
      exclude: ['@prisma/client', '@prisma/client/runtime', 'canvas'],
      include: [
        '@vue/devtools-core',
        '@vue/devtools-kit',
        'socket.io-client'
      ]
    }
  },
  modules: [
    '@nuxtjs/tailwindcss',
    '@nuxtjs/mdc',
    '@nuxt/image',
    '@nuxt/icon',
    '@nuxtjs/color-mode',
    '@nuxtjs/i18n',
    '@vite-pwa/nuxt',
    '@nuxtjs/sitemap'
  ],
  // ... 其他配置
})
```

### Prisma Schema（主要模型）

```prisma
generator client {
  provider = "prisma-client-js"
  binaryTargets = ["native", "debian-openssl-3.0.x"]
}

datasource db {
  provider = "mysql"
}

model User {
  id                    BigInt        @id @default(autoincrement())
  email                 String        @unique @db.VarChar(255)
  password              String        @db.VarChar(255)
  name                  String?       @db.VarChar(100)
  role                  UserRole      @default(USER)
  tokenVersion          Int           @default(0)

  // User settings
  expectedMonthlyTrades Int           @default(20)
  expectedProfit        Decimal       @default(0) @db.Decimal(15, 2)
  expectedAvgHolding    Decimal       @default(0) @db.Decimal(15, 2)
  timezone              String        @default("Asia/Taipei") @db.VarChar(50)
  favoriteTagsString    String?       @db.VarChar(500)

  createdAt             DateTime      @default(now())
  updatedAt             DateTime      @updatedAt

  diaries               Diary[]
  disciplines           Discipline[]
  posts                 Post[]
  refreshTokens         RefreshToken[]
  etfAlerts             EtfAlert[]
  etfWatchlist          EtfWatchlist[]
}

model Diary {
  id           BigInt        @id @default(autoincrement())
  userId       BigInt
  title        String        @db.VarChar(255)
  content      String?       @db.Text
  tagsString   String?       @db.VarChar(500)
  date         DateTime      @default(now())
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt
  user         User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  alerts       Alert[]
  transactions Transaction[]
}

model Transaction {
  id        BigInt          @id @default(autoincrement())
  diaryId   BigInt
  symbol    String          @db.VarChar(20)
  type      TransactionType
  quantity  Decimal         @db.Decimal(15, 4)
  price     Decimal         @db.Decimal(15, 4)
  tradeDate DateTime
  createdAt DateTime        @default(now())
  diary     Diary           @relation(fields: [diaryId], references: [id], onDelete: Cascade)
}

model Alert {
  id             BigInt   @id @default(autoincrement())
  diaryId        BigInt
  message        String   @db.VarChar(500)
  triggerAt      DateTime
  isDismissed    Boolean  @default(false)
  recurringMode  String?  @db.VarChar(20)
  parentId       BigInt?
  instanceNumber Int?     @default(1)
  isPaused       Boolean  @default(false)
  createdAt      DateTime @default(now())
  diary          Diary    @relation(fields: [diaryId], references: [id], onDelete: Cascade)
}

model Discipline {
  id        BigInt   @id @default(autoincrement())
  userId    BigInt
  content   String   @db.VarChar(255)
  order     Int      @default(0)
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Post {
  id          BigInt       @id @default(autoincrement())
  authorId    BigInt
  title       String       @db.VarChar(255)
  slug        String       @unique @db.VarChar(255)
  content     String       @db.Text
  excerpt     String?      @db.Text
  coverImage  String?      @db.VarChar(500)
  category    String       @db.VarChar(100)
  tags        String?      @db.VarChar(500)
  status      PostStatus   @default(DRAFT)
  publishedAt DateTime?
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
  author      User         @relation(fields: [authorId], references: [id], onDelete: Cascade)
}

enum UserRole {
  USER
  ADMIN
}

enum PostStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
}

enum TransactionType {
  BUY
  SELL
}
```

### 環境變數

#### .env.example
```bash
# Database (Required)
DATABASE_URL="mysql://username:password@localhost:3306/invest_diary"

# JWT (Required - Generate with: openssl rand -base64 32)
JWT_SECRET="your-secret-key-for-jwt"

# App Configuration
NUXT_PUBLIC_APP_NAME="投資日記"

# Site URL (Required for production - used for SEO/Sitemap)
NUXT_PUBLIC_SITE_URL="https://your-domain.com"

# Scheduler (Optional - Set to "true" only on one instance in multi-instance deployments)
SCHEDULER_ENABLED="true"
```

---

## 🚀 運行方式

### 本機開發

#### 安裝依賴
```bash
npm install
```

#### 設定環境變數
```bash
cp .env.example .env
# 編輯 .env 設定資料庫憑證
```

#### 生成 Prisma Client
```bash
npx prisma generate
```

#### 執行資料庫遷移
```bash
npx prisma migrate dev
```

#### 種子數據（可選）
```bash
npm run seed
```

#### 啟動開發伺服器
```bash
npm run dev
```
應用將運行在 `http://localhost:3000`

### 開發命令

```bash
# Development
npm run dev              # 啟動開發伺服器
npm run build           # 建置 production
npm run preview         # 預覽 production 建置
npm run generate        # 靜態網站生成

# Database
npm run seed            # 種子數據
npx prisma studio       # 開啟 Prisma Studio
npx prisma migrate dev  # 創建和應用遷移

# Testing
npm test                # 執行所有測試
npm run test:watch      # 監看模式
npm run test:ui         # Vitest UI
npm run test:coverage   # 測試覆蓋率報告
npm run test:e2e        # Playwright E2E 測試

# Code Quality
npm run lint            # ESLint
npm run typecheck       # TypeScript 檢查

# Health Checks
npm run health:check    # 系統健康驗證
npm run health:full     # 健康檢查 + 建置
npm run health:quick    # 快速測試 + Prisma validate
```

### Docker 部署

#### 使用 Docker Compose
```bash
# 建置並啟動所有服務
docker-compose up -d

# 查看 Log
docker-compose logs -f app

# 停止服務
docker-compose down
```

#### 手動 Docker 建置
```bash
# 建置 Image
docker build -t diary-vue .

# 執行 Container
docker run -p 3000:3000 \
  -e DATABASE_URL="mysql://user:pass@host:3306/db" \
  -e JWT_SECRET="your-secret" \
  diary-vue
```

### CapRover 部署

參考 `DEPLOYMENT.md` 進行完整部署流程。

---

## 🔧 故障排除

### 已知問題與解決方案

#### 1. Blog Slug & PWA 動態路由問題

**症狀**:
- 博客列表正常
- 單篇文章顯示「文章不存在」
- Network 顯示 `400 Slug is required (from service worker)`

**原因**: Service Worker 快取 API 路由錯誤

**解決方案**: 詳見 `CLAUDE.md` - PWA + Nitro 動態路由章節

#### 2. Prisma + Vite 開發錯誤

**症狀**:
- `(0, Fo.promisify) is not a function`
- `The requested module does not provide an export named 'Decimal'`
- 500 errors 在使用 Prisma 的頁面

**原因**: Vite 打包 Prisma runtime 為客戶端依賴

**解決方案**: 詳見 `CLAUDE.md` - Prisma + Nuxt + Vite 章節

### 常見問題

#### 1. 資料庫連接失敗
- 檢查 `DATABASE_URL` 在 `.env` 中是否正確
- 確認 MySQL 正在運行
- 驗證資料庫憑證

#### 2. Port 3000 已被使用
- 更改 `.env` 中的 port
- 或停止衝突的進程

#### 3. PWA 無法安裝
- 確保 HTTPS 已啟用（PWA 必需）
- 開發環境可使用 `localhost`

#### 4. 圖片無法載入
- 檢查圖片檔案是否在 `public/` 目錄
- 驗證 `<NuxtImg>` 組件中的路徑

#### 5. 暗黑模式無法持續
- 清除 localStorage
- 檢查 browser console 的 color-mode 錯誤
- 驗證 `@nuxtjs/color-mode` 配置

---

## 📚 文檔資源

- **README.md** - 專案說明和使用指南
- **CLAUDE.md** - 開發者技術文檔（架構模式、關鍵問題）
- **DEPLOYMENT.md** - 部署指南（Docker、手動、生產檢查清單）
- **IMPROVEMENTS.md** - 計畫功能和增強路線圖
- **docs/TESTING.md** - 測試指南和最佳實踐
- **docs/HEALTH_CHECK.md** - 健康檢查系統文檔
- **IMPLEMENTATION_SUMMARY.md** - 實作總結
- **TIMELINE_REFACTOR_PLAN.md** - 時間軸重構計劃

---

## 💡 最佳實踐

### 1. 開發流程
1. 創建功能分支
2. 開發功能
3. 運行測試：`npm test`
4. 運行健康檢查：`npm run health:check`
5. 提交變更
6. 推送到分支
7. 開啟 Pull Request

### 2. 代碼風格
- 所有新代碼使用 TypeScript
- 遵循 Vue 3 Composition API 模式
- 提交前運行 `npm run lint`
- 為新功能添加測試
- 更新相關文檔

### 3. 安全性
- 使用 httpOnly cookies 存儲 JWT
- 輸入驗證使用 Zod
- Markdown 內容淨化使用 DOMPurify
- 速率限制使用 rate-limiter-flexible

### 4. 性能
- 使用 Nitro SWR 快取
- 靜態資源優化
- 圖片優化使用 @nuxt/image
- 適當設置 Cache-Control

---

**生成時間**: 2026-03-26
**專案版本**: 4.3.1+ (Nuxt)
**技術文檔版本**: 1.0
