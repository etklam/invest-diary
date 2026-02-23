# 🎯 統一日誌系統 + 結構化錯誤處理設計方案

> 目標：在不破壞現有 API 的前提下，漸進式升級日誌與錯誤處理

---

## 📋 設計原則

1. **向後相容**：現有 API 回應格式不變
2. **漸進式遷移**：可以逐個 API 遷移，不需要一次性改完
3. **類型安全**：使用 TypeScript 確保錯誤代碼的一致性
4. **可觀察性**：支援 request ID 追蹤

---

## 🟢 Part 1: 統一日誌系統

### 1.1 現有問題

```typescript
// ❌ 現況：50+ 處使用 console.log/error
console.log('[Diaries] Fetching diaries with pagination...')
console.error('[Diaries] Error fetching diaries:', error)

// ❌ 格式不統一
console.log('[API] Diary created:', diary.id, 'for user:', userId)
console.log('[Blog] Post deleted:', id)
```

### 1.2 增強版 Logger 設計

```typescript
// lib/logger.ts (增強版)

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  userId?: string
  requestId?: string
  [key: string]: unknown
}

class Logger {
  private prefix: string
  private requestId?: string

  constructor(prefix: string, requestId?: string) {
    this.prefix = prefix
    this.requestId = requestId
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString()
    const parts = [timestamp, `[${this.prefix}]`, `[${level.toUpperCase()}]`]
    
    if (this.requestId) {
      parts.push(`[req:${this.requestId.slice(0, 8)}]`)
    }
    
    return parts.join(' ') + ` ${message}`
  }

  private log(level: LogLevel, message: string, context?: LogContext) {
    const isDev = process.env.NODE_ENV === 'development'
    
    if (level === 'debug' && !isDev) return

    const formatted = this.formatMessage(level, message, context)
    const args = context ? [formatted, context] : [formatted]

    switch (level) {
      case 'debug': console.debug(...args); break
      case 'info': console.info(...args); break
      case 'warn': console.warn(...args); break
      case 'error': console.error(...args); break
    }
  }

  debug(message: string, context?: LogContext) { this.log('debug', message, context) }
  info(message: string, context?: LogContext) { this.log('info', message, context) }
  warn(message: string, context?: LogContext) { this.log('warn', message, context) }
  error(message: string, context?: LogContext) { this.log('error', message, context) }

  // 建立帶 request ID 的子 logger
  withRequestId(requestId: string): Logger {
    return new Logger(this.prefix, requestId)
  }
}

// 預設 loggers（按模組分類）
export const logger = {
  api: createLogger('API'),
  auth: createLogger('Auth'),
  db: createLogger('DB'),
  ws: createLogger('WS'),
  alert: createLogger('Alert'),
  blog: createLogger('Blog'),
  admin: createLogger('ADMIN'),
  discipline: createLogger('Discipline'),
  stocks: createLogger('Stocks'),
}

export function createLogger(prefix: string): Logger {
  return new Logger(prefix)
}
```

### 1.3 Request ID Middleware

```typescript
// server/middleware/request-id.ts
import { randomUUID } from 'crypto'

export default defineEventHandler((event) => {
  const requestId = getHeader(event, 'x-request-id') || randomUUID()
  setHeader(event, 'x-request-id', requestId)
  event.context.requestId = requestId
})
```

### 1.4 使用範例

```typescript
// server/api/diaries.get.ts (遷移後)
import { logger } from '~/lib/logger'

export default defineEventHandler(async (event) => {
  const log = logger.api.withRequestId(event.context.requestId)
  
  log.info('Fetching diaries with pagination', { userId: event.context.user?.id })
  
  try {
    // ...
    log.info('Diaries fetched', { count: diaries.length })
    return { data: safeDiaries, pagination }
  } catch (error) {
    log.error('Failed to fetch diaries', { error: String(error) })
    throw createError({ statusCode: 500, statusMessage: 'Internal Server Error' })
  }
})
```

---

## 🔴 Part 2: 結構化錯誤處理

### 2.1 現有問題

```typescript
// ❌ 錯誤格式不一致
throw createError({ statusCode: 401, statusMessage: 'Invalid email or password' })
throw createError({ statusCode: 404, statusMessage: 'Diary not found' })
throw createError({ statusCode: 500, statusMessage: 'Failed to fetch diaries' })
```

### 2.2 錯誤代碼系統設計

```typescript
// lib/errors/codes.ts

/**
 * 錯誤代碼定義
 * 格式：MODULE_ACTION_REASON
 */
export const ErrorCodes = {
  // 認證相關 (AUTH_*)
  AUTH_LOGIN_INVALID_CREDENTIALS: 'AUTH_LOGIN_INVALID_CREDENTIALS',
  AUTH_LOGIN_ACCOUNT_DISABLED: 'AUTH_LOGIN_ACCOUNT_DISABLED',
  AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  AUTH_TOKEN_INVALID: 'AUTH_TOKEN_INVALID',
  AUTH_UNAUTHORIZED: 'AUTH_UNAUTHORIZED',
  
  // 日記相關 (DIARY_*)
  DIARY_NOT_FOUND: 'DIARY_NOT_FOUND',
  DIARY_ACCESS_DENIED: 'DIARY_ACCESS_DENIED',
  DIARY_ALREADY_EXISTS: 'DIARY_ALREADY_EXISTS',
  DIARY_CREATE_FAILED: 'DIARY_CREATE_FAILED',
  DIARY_UPDATE_FAILED: 'DIARY_UPDATE_FAILED',
  DIARY_DELETE_FAILED: 'DIARY_DELETE_FAILED',
  
  // 部落格相關 (BLOG_*)
  BLOG_NOT_FOUND: 'BLOG_NOT_FOUND',
  BLOG_SLUG_EXISTS: 'BLOG_SLUG_EXISTS',
  BLOG_CREATE_FAILED: 'BLOG_CREATE_FAILED',
  
  // 使用者相關 (USER_*)
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  USER_EMAIL_EXISTS: 'USER_EMAIL_EXISTS',
  USER_PASSWORD_WEAK: 'USER_PASSWORD_WEAK',
  
  // 系統相關 (SYS_*)
  SYS_INTERNAL_ERROR: 'SYS_INTERNAL_ERROR',
  SYS_DATABASE_ERROR: 'SYS_DATABASE_ERROR',
  SYS_VALIDATION_ERROR: 'SYS_VALIDATION_ERROR',
} as const

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes]
```

### 2.3 錯誤工廠函數

```typescript
// lib/errors/factory.ts

import { createError, H3Error } from 'h3'
import { ErrorCodes, ErrorCode } from './codes'

interface ErrorDetail {
  field?: string
  message?: string
  value?: unknown
}

interface AppErrorOptions {
  statusCode: number
  code: ErrorCode
  message: string
  details?: ErrorDetail[]
  cause?: unknown
}

export class AppError extends Error {
  statusCode: number
  code: ErrorCode
  details?: ErrorDetail[]
  
  constructor(options: AppErrorOptions) {
    super(options.message)
    this.statusCode = options.statusCode
    this.code = options.code
    this.details = options.details
    this.cause = options.cause
  }
  
  toH3Error(): H3Error {
    return createError({
      statusCode: this.statusCode,
      statusMessage: this.message,
      data: {
        code: this.code,
        details: this.details,
      }
    })
  }
}

// 預定義的錯誤工廠函數
export const Errors = {
  // 認證錯誤
  invalidCredentials: () => new AppError({
    statusCode: 401,
    code: ErrorCodes.AUTH_LOGIN_INVALID_CREDENTIALS,
    message: 'Invalid email or password',
  }),
  
  tokenExpired: () => new AppError({
    statusCode: 401,
    code: ErrorCodes.AUTH_TOKEN_EXPIRED,
    message: 'Token has expired',
  }),
  
  unauthorized: () => new AppError({
    statusCode: 401,
    code: ErrorCodes.AUTH_UNAUTHORIZED,
    message: 'Authentication required',
  }),
  
  // 日記錯誤
  diaryNotFound: (id: string) => new AppError({
    statusCode: 404,
    code: ErrorCodes.DIARY_NOT_FOUND,
    message: `Diary with id ${id} not found`,
  }),
  
  diaryAccessDenied: () => new AppError({
    statusCode: 403,
    code: ErrorCodes.DIARY_ACCESS_DENIED,
    message: 'You do not have access to this diary',
  }),
  
  diaryAlreadyExists: (date: string) => new AppError({
    statusCode: 409,
    code: ErrorCodes.DIARY_ALREADY_EXISTS,
    message: `Diary already exists for date ${date}`,
  }),
  
  // 系統錯誤
  internalError: (cause?: unknown) => new AppError({
    statusCode: 500,
    code: ErrorCodes.SYS_INTERNAL_ERROR,
    message: 'An unexpected error occurred',
    cause,
  }),
  
  validationError: (details: ErrorDetail[]) => new AppError({
    statusCode: 400,
    code: ErrorCodes.SYS_VALIDATION_ERROR,
    message: 'Validation failed',
    details,
  }),
}
```

### 2.4 API 回應格式

```typescript
// 成功回應（維持現有格式）
{
  data: [...],
  pagination: { page, limit, total, totalPages }
}

// 錯誤回應（新增 code 欄位）
{
  statusCode: 404,
  statusMessage: 'Diary not found',
  data: {
    code: 'DIARY_NOT_FOUND',
    details: null
  }
}
```

### 2.5 使用範例

```typescript
// server/api/diaries/[id].get.ts (遷移後)
import { Errors } from '~/lib/errors/factory'
import { logger } from '~/lib/logger'

export default defineEventHandler(async (event) => {
  const log = logger.api.withRequestId(event.context.requestId)
  const userId = event.context.user?.id
  
  if (!userId) {
    throw Errors.unauthorized().toH3Error()
  }
  
  const id = event.context.params?.id
  
  try {
    const diary = await prisma.diary.findUnique({ where: { id: BigInt(id) } })
    
    if (!diary) {
      throw Errors.diaryNotFound(id)
    }
    
    if (diary.userId.toString() !== userId) {
      throw Errors.diaryAccessDenied()
    }
    
    log.info('Diary fetched', { diaryId: id })
    return { data: diary }
    
  } catch (error) {
    if (error instanceof AppError) {
      log.warn(error.message, { code: error.code })
      throw error.toH3Error()
    }
    
    log.error('Unexpected error fetching diary', { error: String(error) })
    throw Errors.internalError(error).toH3Error()
  }
})
```

---

## 📁 檔案結構

```
lib/
├── logger.ts (增強版)
├── errors/
│   ├── codes.ts (錯誤代碼定義)
│   ├── factory.ts (錯誤工廠函數)
│   └── index.ts (匯出)
└── utils.ts

server/middleware/
├── auth.ts (現有)
├── admin.ts (現有)
└── request-id.ts (新增)
```

---

## 🚀 遷移策略

### Phase 1: 基礎建設（不影響現有程式碼）

1. ✅ 新增 `lib/errors/` 目錄和錯誤代碼系統
2. ✅ 增強 `lib/logger.ts`
3. ✅ 新增 `server/middleware/request-id.ts`

### Phase 2: 漸進式遷移 API

按優先級遷移：

| 優先級 | API | 原因 |
|--------|-----|------|
| P0 | `/api/auth/*` | 認證是核心功能 |
| P0 | `/api/diaries/*` | 主要業務邏輯 |
| P1 | `/api/alerts/*` | 預警系統 |
| P1 | `/api/blog/*` | 公開 API |
| P2 | `/api/admin/*` | 內部管理 |
| P2 | `/api/discipline/*` | 自律功能 |

### Phase 3: 清理

1. 移除所有 `console.log/error/warn`
2. 確保測試覆蓋率達標

---

## ✅ 驗收標準

1. **日誌系統**
   - [ ] 所有 API 使用統一的 logger
   - [ ] Production 環境不輸出 debug 日誌
   - [ ] 每個請求都有 request ID

2. **錯誤處理**
   - [ ] 所有錯誤都有對應的 error code
   - [ ] 前端可以根據 code 做對應處理
   - [ ] 錯誤訊息支援國際化（前端處理）

3. **向後相容**
   - [ ] 現有 API 回應格式不變
   - [ ] 現有測試全部通過

---

## 📊 預期效益

| 指標 | 現況 | 改進後 |
|------|------|--------|
| 日誌格式統一 | ❌ 50+ 處不一致 | ✅ 統一格式 |
| Request ID追蹤 | ❌ 無 | ✅ 每個請求都有 |
| 錯誤代碼 | ❌ 無 | ✅ 結構化 code |
| 前端錯誤處理 | ❌ 字串比對 | ✅ code 判斷 |
| 國際化支援 | ❌ 困難 | ✅ 前端根據 code翻譯 |

---

> 下一步：確認此設計方案後，可以開始實作 Phase 1 的基礎建設。
