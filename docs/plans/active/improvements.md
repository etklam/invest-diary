# 投資日記系統改善建議

## Context

This Nuxt 3 investment diary application has solid foundations but has several areas for improvement identified through comprehensive codebase analysis. The application handles user authentication, diary management with Markdown, stock transaction tracking, and alert systems.

**Key Issues Prompting This Review:**
- Technical debt accumulation (type safety, code duplication)
- Security vulnerabilities (XSS, missing CSP)
- Incomplete test coverage
- Developer experience gaps (no linting, formatting)
- UI/UX and accessibility improvements needed

---

## Priority 1: Security & Critical Issues (High Priority)

### 1.1 Fix XSS Vulnerabilities
**Files:** `components/DiaryEditor.vue`, all pages rendering user content

**Issue:** User markdown content not sanitized before rendering

**Solution:**
```typescript
// Install dompurify
npm install dompurify @types/dompurify

// In components or server route
import DOMPurify from 'dompurify'

const sanitizedContent = DOMPurify.sanitize(markdownContent)
```

### 1.2 Add Content Security Policy Headers
**File:** `nuxt.config.ts`

**Solution:**
```typescript
export default defineNuxtConfig({
  routeRules: {
    '/**': {
      headers: {
        'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
      }
    }
  }
})
```

### 1.3 Remove All `any` Types (Type Safety)
**Files:**
- `composables/useAuth.ts` (8 instances)
- `server/api/diaries.post.ts`
- `server/api/diaries.get.ts`

**Solution:** Create proper type definitions:
```typescript
// types/api.ts
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

export interface AuthUser {
  id: string
  email: string
  name?: string
  expectedMonthlyTrades: number
  expectedProfit: number
  expectedAvgHolding: number
}

export type TransactionType = 'BUY' | 'SELL'
```

### 1.4 Add Rate Limiting on Auth Endpoints
**Files:** `server/api/auth/login.post.ts`, `server/api/auth/register.post.ts`

**Solution:**
```typescript
// Implement IP-based rate limiting
const rateLimit = new Map<string, { count: number; resetTime: number }>()

export default defineEventHandler(async (event) => {
  const ip = getRequestHeader(event, 'x-forwarded-for') || 'unknown'
  // Check and enforce rate limit
})
```

---

## Priority 2: Developer Experience (High Priority)

### 2.1 Add ESLint and Prettier
**New Files:** `.eslintrc.js`, `.prettierrc`, `.editorconfig`

**Solution:**
```bash
npm install -D eslint @nuxt/eslint-config prettier eslint-config-prettier
```

**`.eslintrc.js`:**
```javascript
module.exports = {
  extends: ['@nuxt/eslint-config', 'prettier'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': 'error',
    'vue/multi-word-component-names': 'off'
  }
}
```

**Add to package.json:**
```json
{
  "scripts": {
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write .",
    "type-check": "nuxi typecheck"
  }
}
```

### 2.2 Update .gitignore
**File:** `.gitignore`

**Add:**
```
# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Testing
coverage/
.nyc_output/

# Logs
*.log
npm-debug.log*

# Temp
*.tmp
*.temp
```

### 2.3 Add JSDoc Comments
**Files:** `lib/utils.ts`, all composables, API routes

**Example:**
```typescript
/**
 * 從交易記錄計算持股資訊（使用平均成本法）
 * @param transactions - 交易記錄陣列
 * @returns 持股資訊陣列，包含 symbol, quantity, avgCost, totalCost
 * @example
 * const holdings = calculateHoldings(transactions)
 * // [{ symbol: '2330.TW', quantity: 10, avgCost: 500, totalCost: 5000 }]
 */
export function calculateHoldings(transactions: Transaction[]): Holding[]
```

### 2.4 Add VS Code Debug Configuration
**New File:** `.vscode/launch.json`

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Nuxt",
      "program": "${workspaceFolder}/node_modules/nuxi/dist/bin/nuxt.mjs",
      "args": ["dev"]
    }
  ]
}
```

---

## Priority 3: Testing Coverage (High Priority)

### 3.1 Complete API Integration Tests
**File:** `tests/api/diaries.test.ts`

**Current State:** All tests are placeholders (`expect(true).toBe(true)`)

**Solution:** Implement actual API tests using `@nuxt/test-utils`:
```typescript
import { describe, it, expect } from 'vitest'
import { $fetch, setup } from '@nuxt/test-utils'

describe('/api/diaries', () => {
  setup({
    server: true,
    browser: false
  })

  it('POST /api/diaries creates a new diary', async () => {
    const response = await $fetch('/api/diaries', {
      method: 'POST',
      body: {
        title: 'Test Diary',
        content: '# Test Content',
        date: '2024-01-01'
      }
    })

    expect(response).toHaveProperty('id')
    expect(response.title).toBe('Test Diary')
  })
})
```

### 3.2 Add Authentication Tests
**New File:** `tests/api/auth.test.ts`

**Test:**
- User registration
- Login with valid credentials
- Login with invalid credentials
- Logout functionality
- Protected route access

### 3.3 Add Component Tests
**New Files:**
- `tests/components/DiaryEditor.test.ts`
- `tests/components/TransactionInput.test.ts`
- `tests/components/HoldingsDisplay.test.ts`

---

## Priority 4: Code Quality & Architecture (Medium Priority)

### 4.1 Extract Error Handling Middleware
**New File:** `server/middleware/error-handler.ts`

```typescript
export const createApiError = (statusCode: number, message: string, data?: unknown) => {
  return createError({
    statusCode,
    statusMessage: message,
    data
  })
}

export const handleApiError = (error: unknown) => {
  console.error('API Error:', error)
  if (error instanceof Error) {
    return createApiError(500, error.message)
  }
  return createApiError(500, 'Unknown error')
}
```

### 4.2 Centralize Validation Schemas
**New File:** `server/validation/schemas.ts`

```typescript
import { z } from 'zod'

export const transactionSchema = z.object({
  symbol: z.string().min(1).max(20),
  type: z.enum(['BUY', 'SELL']),
  quantity: z.number().positive().max(1000000000),
  price: z.number().positive().max(1000000000),
  tradeDate: z.string().datetime()
})

export const diarySchema = z.object({
  title: z.string().min(1).max(255),
  content: z.string().optional(),
  date: z.string().datetime()
})
```

### 4.3 Split TransactionInput Component
**Current:** `components/TransactionInput.vue` (291 lines)

**Split Into:**
- `components/TransactionInput.vue` - Main component
- `components/TransactionForm.vue` - Form inputs
- `components/TransactionList.vue` - Display list
- `composables/useTransactions.ts` - Transaction logic

### 4.4 Remove Console.log Statements
**Files:** 16 API files with console.log

**Solution:** Replace with proper logging utility:
```typescript
// lib/logger.ts
const logger = {
  info: (message: string, meta?: unknown) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[INFO] ${message}`, meta)
    }
  },
  error: (message: string, error?: unknown) => {
    console.error(`[ERROR] ${message}`, error)
  }
}

export const logger = logger
```

---

## Priority 5: UI/UX & Accessibility (Medium Priority)

### 5.1 Add Missing Loading States
**Files:**
- `pages/settings/index.vue`
- `pages/diaries/new.vue` (for copy latest transactions)

**Solution:**
```vue
<template>
  <button
    @click="saveSettings"
    :disabled="isSaving"
    class="btn btn-primary"
  >
    <Icon v-if="isSaving" name="svg-spinners:180-ring" class="animate-spin" />
    <span v-else>儲存設定</span>
  </button>
</template>
```

### 5.2 Add ARIA Labels for Form Validation
**File:** `components/TransactionInput.vue`

**Solution:**
```vue
<template>
  <input
    v-model="symbol"
    aria-label="股票代碼"
    aria-describedby="symbol-error"
    :aria-invalid="!!errors.symbol"
  />
  <span id="symbol-error" role="alert">{{ errors.symbol }}</span>
</template>
```

### 5.3 Improve Keyboard Navigation
**File:** `components/UserMenu.vue`

**Solution:**
```vue
<script setup>
const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') closeDropdown()
  if (e.key === 'Enter' || e.key === ' ') {
    // Handle menu item activation
  }
}
</script>
```

### 5.4 Add Empty State for Alerts Page
**File:** `pages/alerts/index.vue`

**Solution:**
```vue
<div v-if="alerts.length === 0" class="empty-state">
  <Icon name="heroicons:bell" class="h-12 w-12 text-gray-400" />
  <h3>尚無提醒</h3>
  <p>建立第一個提醒來追蹤重要日期</p>
  <NuxtLink to="/diaries/new">新增提醒</NuxtLink>
</div>
```

---

## Priority 6: Performance & Optimization (Low Priority)

### 6.1 Add Memoization to Utilities
**File:** `lib/utils.ts`

**Solution:**
```typescript
import { memoize } from 'lodash-es'

export const memoizedFormatDate = memoize(formatDate)
export const memoizedFormatCurrency = memoize(formatCurrency)
```

### 6.2 Implement Lazy Loading for Markdown
**File:** Components using `MDC`

**Solution:**
```vue
<template>
  <LazyMDC :value="content" v-if="showMarkdown" />
  <button @click="showMarkdown = true" v-else>顯示內容</button>
</template>
```

### 6.3 Add Database Indexes
**File:** `prisma/schema.prisma` or migration

**Solution:**
```prisma
model Transaction {
  // ...
  @@index([symbol, tradeDate])
  @@index([diaryId])
}

model Diary {
  // ...
  @@index([userId, date])
}
```

---

## Priority 7: Documentation (Low Priority)

### 7.1 Create API Documentation
**New File:** `docs/API.md`

Include:
- All endpoints with methods
- Request/response schemas
- Authentication requirements
- Error codes

### 7.2 Create Contributing Guide
**New File:** `CONTRIBUTING.md`

Include:
- Development setup
- Code style guidelines
- Pull request process
- Testing requirements

### 7.3 Create Deployment Guide
**New File:** `docs/DEPLOYMENT.md`

Include:
- Production checklist
- Environment configuration
- Docker deployment
- Backup procedures

---

## Verification Plan

After implementing improvements:

1. **Run all tests:** `npm test`
2. **Run linter:** `npm run lint`
3. **Run type check:** `npm run type-check`
4. **Test security:** Try XSS payloads in diary content
5. **Test accessibility:** Use keyboard navigation throughout app
6. **Performance test:** Check bundle size and load times
7. **E2E test:** Create test diary, add transactions, view holdings

---

## Estimated Implementation Time

| Priority | Tasks | Time |
|----------|-------|------|
| 1 (Security) | 4 tasks | 2-3 days |
| 2 (Dev XP) | 4 tasks | 1-2 days |
| 3 (Testing) | 3 task groups | 3-4 days |
| 4 (Code Quality) | 4 tasks | 2-3 days |
| 5 (UI/UX) | 4 tasks | 1-2 days |
| 6 (Performance) | 3 tasks | 1 day |
| 7 (Documentation) | 3 tasks | 1 day |

**Total:** 11-16 days of focused development

---

## Key Files to Modify

**Critical:**
- `nuxt.config.ts` - Security headers, modules
- `composables/useAuth.ts` - Remove `any` types
- `components/TransactionInput.vue` - Split component
- `tests/api/*.test.ts` - Complete tests

**Important:**
- All API routes in `server/api/` - Error handling, validation
- `lib/utils.ts` - JSDoc, memoization
- `.gitignore` - Update
- `package.json` - Add scripts

**New Files:**
- `.eslintrc.js`, `.prettierrc`
- `types/api.ts`
- `server/validation/schemas.ts`
- `server/middleware/error-handler.ts`
- `docs/API.md`, `CONTRIBUTING.md`
