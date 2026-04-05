# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## 最重要
- Always reply in Traditional Chinese.
- 除非使用者明確要求英文，否則所有回應使用繁體中文。
- 代碼識別碼、指令、日誌、報錯訊息保持原始語言；其餘解釋用繁體中文。

# 核心原則
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

**Diary Vue** is a personal investment diary application built with Nuxt 4, featuring investment journaling, stock portfolio tracking, educational blog, and investment tools. It uses MySQL with Prisma ORM, JWT authentication, and is deployable via Docker.

**Tech Stack**: Nuxt 4 (Vue 3), TypeScript, MySQL 8.0+, Prisma ORM, TailwindCSS, JWT auth, PWA support, i18n (EN/ZH-TW/ZH-CN)

---

## Development Commands

```bash
# Development
npm run dev              # Start dev server (http://localhost:3000)
npm run build           # Build for production
npm run preview         # Preview production build

# Database
npm run seed            # Seed database with test data
npx prisma studio       # Open Prisma Studio (DB GUI)
npx prisma generate     # Generate Prisma client
npx prisma migrate dev  # Create and apply migrations

# Testing
npm test                # Run all tests
npm run test:watch      # Watch mode
npm run test:ui         # Vitest UI
npm run test:coverage   # Coverage report
npm run test:unit       # Unit tests only
npm run test:integration # Integration tests only

# Code Quality
npm run lint            # ESLint
npm run typecheck       # TypeScript checking

# Health Checks
npm run health:check    # System health validation
npm run health:full     # Health check + build
npm run health:quick    # Quick tests + Prisma validate
```

---

## Critical Architecture Patterns

### 1. Prisma + Nuxt + Vite Integration (CRITICAL)

**Problem**: Prisma runtime gets bundled by Vite dev server, causing 500 errors in local development (production/Docker work fine).

**Root Cause**: Vite treats Prisma as client/shared dependency if:
- `import '@prisma/client/runtime/*'` exists in shared/utils/client code
- `import { PrismaClient }` exists in client-reachable files
- Vite `optimizeDeps` doesn't exclude Prisma
- Vite cache is stale

**Solution (ALL required)**:

1. **Prisma ONLY in server runtime** (`lib/prisma.ts`):
```typescript
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { PrismaClient } = require('@prisma/client')

const prismaClientSingleton = () => new PrismaClient()
declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>
}
const prisma = globalThis.prismaGlobal ?? prismaClientSingleton()
export default prisma

if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaGlobal = prisma
}
```

2. **Never runtime import Prisma Decimal**:
```typescript
// ❌ WRONG - will crash
import { Decimal } from '@prisma/client/runtime/library'

// ✅ CORRECT - type-only import
import type { Prisma } from '@prisma/client'
quantity: Prisma.Decimal | number
```

3. **Vite config** (`nuxt.config.ts`):
```typescript
vite: {
  optimizeDeps: {
    exclude: ['@prisma/client', '@prisma/client/runtime']
  }
}
```

4. **Clear Vite cache once**:
```bash
rm -rf node_modules/.cache/vite
npm run dev
```

**Pre-deployment checks**:
```bash
rg "@prisma/client/runtime"  # Must return 0 results
rg "PrismaClient"            # Should only appear in lib/prisma.ts
```

---

### 2. PWA + Nitro Dynamic Route Gotcha (Blog Slug Issue)

**Problem**: Blog list works, but clicking a post shows "文章不存在" (article not found). Network shows `400 Slug is required (from service worker)`.

**Root Cause**: Service Worker caches API routes, returning stale/incorrect responses. Dynamic route params may not resolve correctly through SW cache.

**Solution**:

1. **Never cache `/api/**` routes** (`nuxt.config.ts`):
```typescript
pwa: {
  workbox: {
    runtimeCaching: [
      {
        urlPattern: /^https?:\/\/.*\/api\//,
        handler: 'NetworkOnly'  // CRITICAL
      }
    ]
  }
}
```

2. **Robust slug parsing** (`server/api/blog/[slug].get.ts`):
```typescript
const resolveSlug = (event: any) => {
  const rawFromParams = event.context?.params?.slug
  const rawFromRouter = getRouterParam(event, 'slug')
  const rawFromPath = event.path?.split('/').filter(Boolean).pop()
  const rawSlug = rawFromParams ?? rawFromRouter ?? rawFromPath
  return rawSlug ? decodeURIComponent(String(rawSlug)) : undefined
}
```

3. **API routes must use `no-store`** (`nuxt.config.ts`):
```typescript
nitro: {
  routeRules: {
    '/api/**': { cors: true, headers: { 'Cache-Control': 'no-store' } }
  }
}
```

**Symptoms**: Blog list works, individual posts fail with 400/404 from SW.

---

### 3. Authentication Architecture

**JWT Token System**:
- **Access Token**: 1 hour, httpOnly cookie (`access-token`)
- **Refresh Token**: 30 days, httpOnly cookie (`refresh-token`), stored in DB
- **Token Versioning**: `tokenVersion` field invalidates all tokens on password change

**Auth Flow**:
1. `server/middleware/auth.ts` runs on all `/api/**` routes
2. Checks `access-token` cookie → verifies JWT → sets `event.context.user`
3. If access token expired, tries refresh token → issues new access token
4. Client-side: `composables/useAuth.ts` manages user state
5. Protected pages: Use `definePageMeta({ middleware: 'auth' })`

**Key Files**:
- `lib/jwt.ts` - Token signing/verification (jose library)
- `server/middleware/auth.ts` - Global auth middleware
- `composables/useAuth.ts` - Client-side auth state
- `server/utils/auth.ts` - Auth utilities (requireAuth, requireAdmin)

**Important**: Never use `import { PrismaClient }` in auth middleware - use `import prisma from '~/lib/prisma'`

---

### 4. Database Schema Overview

**Core Models**:
- `User` - Authentication + investment settings (expectedMonthlyTrades, expectedProfit, timezone)
- `Diary` - Investment journal entries with markdown content
- `Transaction` - Stock trades (BUY/SELL) linked to diaries
- `Alert` - Time-based reminders with recurring support (WEEK/MONTH modes)
- `Discipline` - Investment principles/quotes with shareable tokens
- `Post` - Blog articles (DRAFT/PUBLISHED/ARCHIVED)
- `Etf` / `EtfPrice` / `EtfAlert` / `EtfWatchlist` - ETF tracking system

**Key Relationships**:
- User → Diaries (1:N, cascade delete)
- Diary → Transactions (1:N, cascade delete)
- Diary → Alerts (1:N, cascade delete)
- Alert → Alert (parent-child via `parentId` for recurring alerts)

**Indexes**: Optimized for common queries (user diaries by date, transactions by symbol, alerts by trigger date)

---

### 5. Recurring Alerts System

**Architecture**:
- **WEEK Mode**: Daily alerts from start date through Friday of same week (skips weekends)
- **MONTH Mode**: Daily alerts from start date through last day of month (skips weekends)
- **Parent-Child**: First alert is parent (`parentId` = own `id`), subsequent alerts link via `parentId`

**Key Functions** (`lib/recurring-alerts.ts`):
- `calculateRecurringAlertDates(config)` - Returns array of trigger dates
- `calculateEndDate(startDate, mode)` - Determines end date based on mode
- `generateRecurringAlertsData(config)` - Creates Prisma batch insert data
- `isWeekday(date)` / `getNextWeekday(date)` - Weekend handling

**Implementation**:
1. User creates diary with recurring mode in `pages/diaries/new.vue`
2. `server/api/alerts.post.ts` calls `generateRecurringAlertsData()`
3. Batch creates all alert instances via `prisma.alert.createMany()`
4. Updates first alert's `parentId` to its own `id`

**Edge Cases**:
- If start date is Saturday/Sunday, alerts begin Monday
- WEEK mode always ends on Friday of same week
- MONTH mode always ends on last day of same month
- Time zone handling: All dates stored in UTC, trigger time preserved

---

### 6. Stock Seasonality Analyzer

**Architecture**: Client-side only tool, no server dependencies

**Data Source**: `lib/stockSeasonality.ts` contains static historical data (1950-present S&P 500)

**Key Features**:
- Monthly performance data with average returns
- Best/worst months identification (Nov, Dec, Apr, Jul vs Sep, Feb, Aug)
- Period analysis: Strong period (Nov-Apr) vs weak period (May-Oct)
- Volatility assessment (5-tier system)
- Investment recommendations based on seasonal patterns
- Export to markdown (EN/ZH-TW/ZH-CN)

**Public Access**: Page sets `requiresAuth: false` in `definePageMeta`

**i18n Integration**: All labels/descriptions use i18n keys:
- `tools.seasonality.months.{jan,feb,...}.characteristics`
- `tools.seasonality.months.{jan,feb,...}.reasons.{0,1,2}`

---

### 7. PWA Configuration

**Design Principle**: PWA as mobile app shell, NOT offline-first application

**Key Features**:
- ✅ Installable to home screen (Android/desktop Chrome)
- ✅ Auto-update via Service Worker
- ✅ Runtime caching for static assets/fonts
- ✅ API routes are NEVER cached (NetworkOnly)

**Core Files**:
- `composables/useAppPWA.ts` - Centralized PWA state management
- `components/PWAInstallPrompt.vue` - Install banner with 7-day dismiss logic
- `components/PWAUpdatePrompt.vue` - Update notification
- `nuxt.config.ts` - PWA manifest + Workbox config

**Platform Differences**:
- iOS Safari: No `beforeinstallprompt` support (users must use Share → Add to Home Screen)
- Android/Chrome: Native install prompt available

---

### 8. i18n Strategy

**Locales**: English (en), Traditional Chinese (zh-TW), Simplified Chinese (zh-CN)

**Configuration**:
- Strategy: `no_prefix` (no locale in URL)
- Detection: Browser language with cookie fallback
- Lazy loading: Translation files loaded on demand

**Usage**:
```vue
<template>
  <h1>{{ $t('common.welcome') }}</h1>
</template>
```

**Translation Files**: `i18n/locales/{en,zh-TW,zh-CN}.json`

---

### 9. Testing Strategy

**Test Types**:
- **Unit Tests**: `tests/unit/` - Individual functions/components
- **Integration Tests**: `tests/integration/` - Multi-component workflows
- **API Tests**: `tests/api/` - Server endpoint testing

**Key Test Files**:
- `tests/unit/lib/prisma-runtime-contract.test.ts` - Ensures Prisma isolation
- `tests/unit/pwa-regressions.test.ts` - PWA cache behavior
- `tests/integration/auth-flow.test.ts` - Complete auth workflow
- `tests/integration/diary-workflow.test.ts` - Diary CRUD operations

**Running Tests**:
```bash
npm test                # All tests
npm run test:watch      # Watch mode
npm run test:coverage   # Coverage report
```

---

### 10. Environment Variables

**Required**:
```bash
DATABASE_URL="mysql://user:pass@host:3306/invest_diary"
JWT_SECRET="your-32-character-random-secret"  # Generate: openssl rand -base64 32
```

**Optional**:
```bash
NUXT_PUBLIC_APP_NAME="投資日記"
NUXT_PUBLIC_SITE_URL="https://your-domain.com"  # Required for production SEO/sitemap
SCHEDULER_ENABLED="true"  # Set on ONE instance only in multi-instance deployments
```

**Security**: Never commit `.env` file. Use `.env.example` as template.

---

### 11. Deployment

**Docker (Recommended)**:
```bash
docker-compose up -d     # Start all services
docker-compose logs -f   # View logs
docker-compose down      # Stop services
```

**Manual**:
```bash
npm run build
node .output/server/index.mjs
```

**Pre-deployment Checklist**:
1. Set `JWT_SECRET` to secure random value
2. Configure `DATABASE_URL` for production MySQL
3. Set `NUXT_PUBLIC_SITE_URL` for SEO/sitemap
4. Run `npm run health:full` to validate
5. Ensure MySQL migrations are applied: `npx prisma migrate deploy`

**Docker Files**:
- `Dockerfile` - Multi-stage build (builder + runtime)
- `docker-compose.yml` - Service orchestration
- `docker-entrypoint.sh` - Startup script (DB wait + migrations)

---

### 12. File Structure Conventions

**Server API Routes** (`server/api/`):
- RESTful naming: `[resource].get.ts`, `[resource].post.ts`, `[resource]/[id].put.ts`
- Dynamic routes: `[id].get.ts`, `[slug].get.ts`
- Nested resources: `admin/users/[id]/role.put.ts`

**Pages** (`pages/`):
- File-based routing: `pages/diaries/[id]/edit.vue` → `/diaries/:id/edit`
- Protected pages: Use `definePageMeta({ middleware: 'auth' })`
- Public pages: Use `definePageMeta({ requiresAuth: false })`

**Composables** (`composables/`):
- Naming: `use[Feature].ts` (e.g., `useAuth.ts`, `useToast.ts`)
- Auto-imported by Nuxt

**Lib** (`lib/`):
- Shared utilities and business logic
- `prisma.ts` - Prisma client singleton (CRITICAL - see section 1)
- `jwt.ts` - JWT utilities
- `recurring-alerts.ts` - Alert calculation logic
- `stockSeasonality.ts` - Seasonality data and analysis

---

### 13. Common Pitfalls

1. **Prisma Import**: Never `import { PrismaClient }` directly - always use `import prisma from '~/lib/prisma'`

2. **Decimal Types**: Never runtime import `Decimal` from Prisma - use `import type { Prisma }` for types only

3. **API Caching**: Never cache `/api/**` routes in PWA - always use `NetworkOnly`

4. **Dynamic Routes**: Always implement fallback slug parsing (params → router → path)

5. **Auth Middleware**: Runs on ALL `/api/**` routes - check `event.context.user` for auth state

6. **BigInt Serialization**: Use `server/plugins/bigint.ts` to handle BigInt JSON serialization

7. **Vite Cache**: Clear `node_modules/.cache/vite` if Prisma errors occur in dev

8. **Time Zones**: All dates stored in UTC, user timezone in `User.timezone` field

---

### 14. Performance Optimizations

**SWR Caching**: Nitro route rules enable stale-while-revalidate for blog routes:
```typescript
nitro: {
  routeRules: {
    '/api/blog/**': {
      headers: { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=900' }
    }
  }
}
```

**Image Optimization**: `@nuxt/image` with IPX provider, WebP format, responsive sizes

**Database Indexes**: Composite indexes on frequently queried columns (see `prisma/schema.prisma`)

**PWA Caching**: Static assets cached with `CacheFirst`, fonts with 30-day expiry

---

### 15. Security Considerations

**Authentication**:
- JWT tokens in httpOnly cookies (not localStorage)
- Refresh token rotation on use
- Token versioning for instant invalidation
- CSRF protection via SameSite cookies

**Database**:
- Parameterized queries via Prisma (SQL injection protection)
- Cascade deletes for data integrity
- User-scoped queries (always filter by `userId`)

**Input Validation**:
- Zod schemas for API request validation
- DOMPurify for markdown sanitization
- Rate limiting on auth endpoints

**Environment**:
- Secrets in environment variables (never in code)
- `.env` excluded from git
- Production uses secure random JWT_SECRET

---

## Additional Documentation

- **DEPLOYMENT.md** - Detailed deployment guide (Docker, manual, production checklist)
- **IMPROVEMENTS.md** - Planned features and enhancement roadmap
- **docs/TESTING.md** - Testing guide and best practices
- **docs/HEALTH_CHECK.md** - Health check system documentation
- **README.md** - Project overview and quick start guide

---

## gstack

gstack 是一個強大的無頭瀏覽器測試與站點驗證工具集。用於所有網頁瀏覽相關任務。

### 重要規則
- **永遠使用 `/browse` skill 進行網頁瀏覽**，不要直接使用 `mcp__chrome-devtools__*` 或 `mcp__claude-in-chrome__*` tools
- gstack 提供更強大、更可靠的控制能力和更好的錯誤處理

### 可用 Skills

**核心測試與驗證:**
- `/browse` - 無頭瀏覽器導航、元素交互、狀態驗證、截圖
- `/qa` - 完整的 QA 測試流程
- `/qa-only` - 僅執行測試不自動修復

**代碼審查:**
- `/review` - 代碼審查
- `/plan-ceo-review` - CEO 級別審查計畫
- `/plan-eng-review` - 工程審查計畫
- `/plan-devex-review` - 開發者體驗審查計畫
- `/plan-design-review` - 設計審查計畫

**設計工具:**
- `/design-consultation` - 設計諮詢
- `/design-shotgun` - 快速設計迭代
- `/design-html` - HTML 設計轉換
- `/design-review` - 設計審查

**部署與發布:**
- `/ship` - 準備發布
- `/land-and-deploy` - 部署流程
- `/canary` - 金絲雀發布
- `/setup-deploy` - 部署設置

**開發流程:**
- `/autoplan` - 自動計畫生成
- `/investigate` - 問題調查
- `/retro` - 回顧會議
- `/office-hours` - 辦公時間

**工具與實用程序:**
- `/connect-chrome` - 連接 Chrome
- `/setup-browser-cookies` - 設置瀏覽器 cookies
- `/benchmark` - 性能基準測試
- `/codex` - 代碼生成
- `/cso` - 安全辦公室
- `/learn` - 學習文檔
- `/freeze` / `/unfreeze` - 凍結/解凍代碼
- `/careful` - 謹慎操作模式
- `/guard` - 保護模式
- `/document-release` - 發布文檔
- `/gstack-upgrade` - gstack 升級

### 使用方式
直接使用 skill 指令，例如：
```
/browse https://example.com
/qa https://localhost:3000
/design-review
```

## Design System
Always read DESIGN.md before making any visual or UI decisions.
All font choices, colors, spacing, and aesthetic direction are defined there.
Do not deviate without explicit user approval.
In QA mode, flag any code that doesn't match DESIGN.md.
