// Diary-related shared types

import type { Prisma } from '@prisma/client'
import { z } from 'zod'
import type { SerializedId } from './common'
import type { TradePlan, TradePlanStatus } from './trade-plan'

export const DEFAULT_TAGS = [
  { key: 'profit', labelKey: 'tags.profit', color: 'green' },
  { key: 'loss', labelKey: 'tags.loss', color: 'red' },
  { key: 'watch', labelKey: 'tags.watch', color: 'blue' },
  { key: 'hold', labelKey: 'tags.hold', color: 'gray' },
  { key: 'learning', labelKey: 'tags.learning', color: 'purple' },
  { key: 'mistake', labelKey: 'tags.mistake', color: 'orange' },
] as const

export type TagKey = typeof DEFAULT_TAGS[number]['key']

export const REVIEW_OUTCOMES = ['INTACT', 'PARTIAL', 'INVALIDATED', 'UNCLEAR'] as const
export type ReviewOutcome = typeof REVIEW_OUTCOMES[number]
export type ReviewStatus = 'none' | 'pending' | 'reviewed'

export const DIARY_SORT_FIELDS = ['date-desc', 'date-asc', 'title-asc', 'title-desc'] as const
export type DiarySortField = typeof DIARY_SORT_FIELDS[number]

export const DIARY_REVIEW_STATUSES = ['none', 'pending', 'reviewed'] as const

const diaryListPageSchema = z.preprocess((value) => {
  const page = Number(value)
  return Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1
}, z.number().int().min(1).describe('Invalid values silently fall back to page 1.'))

const diaryListLimitSchema = z.preprocess((value) => {
  const limit = Number(value)
  return Number.isFinite(limit) && limit >= 1 && limit <= 100 ? Math.floor(limit) : 20
}, z.number().int().min(1).max(100).describe('Invalid values silently fall back to limit 20; maximum is 100.'))

const diaryListSearchSchema = z.preprocess((value) => {
  if (value === undefined || value === null) return undefined
  const search = String(value).trim()
  return search ? search.slice(0, 500) : undefined
}, z.string().max(500).optional().describe('Trimmed and silently truncated to 500 characters.'))

const diaryListSortSchema = z.preprocess((value) => {
  return typeof value === 'string' && DIARY_SORT_FIELDS.includes(value as DiarySortField)
    ? value
    : undefined
}, z.enum(DIARY_SORT_FIELDS).optional().describe('Whitelist; invalid values use the default date-desc ordering.'))

const diaryListDateSchema = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must use YYYY-MM-DD format')
  .refine((value) => {
    const parts = value.split('-').map(Number)
    const year = parts[0]!
    const month = parts[1]!
    const day = parts[2]!
    const date = new Date(Date.UTC(year, month - 1, day))
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  }, 'Date must be a valid calendar date')

/**
 * Canonical GET /api/diaries query contract.
 *
 * This schema mirrors the existing handler's lax page/limit fallback and
 * search truncation. The handler still owns runtime parsing so formalization
 * does not change the endpoint's current behavior.
 */
export const diaryListParamsSchema = z.object({
  page: diaryListPageSchema.optional().default(1),
  limit: diaryListLimitSchema.optional().default(20),
  search: diaryListSearchSchema,
  sortBy: diaryListSortSchema,
  dateFrom: diaryListDateSchema.optional(),
  dateTo: diaryListDateSchema.optional(),
  reviewStatus: z.enum(DIARY_REVIEW_STATUSES).optional().describe('Allowed vocabulary: none, pending, reviewed.'),
})

export type DiaryListParams = z.infer<typeof diaryListParamsSchema>

// ---- Request types ----

export interface TransactionInput {
  id?: string | number
  symbol: string
  type: 'BUY' | 'SELL'
  quantity: number | string
  price: number | string
  tradeDate?: string
  trade_date?: string
  // 交易後填寫欄位（Phase 1 新增，柔性提示）
  notes?: string | null
  strategy?: string | null
  emotion?: string | null
}

export interface AlertInput {
  id?: bigint | string | number
  message: string
  triggerAt?: Date | string
  trigger_at?: Date | string
  recurringMode?: 'WEEK' | 'MONTH'
  recurring_mode?: 'WEEK' | 'MONTH'
}

export interface CreateDiaryRequest {
  title: string
  content?: string
  tags?: string[]
  date?: string
  transactions?: TransactionInput[]
  alerts?: AlertInput[]
  // Structured review fields
  thesis?: string
  risk?: string
  execution?: string
  reviewDueAt?: string | null
  /** Explicit owner-only Company context; Quick Note append unions these links. */
  stockSymbols?: string[]
}

export interface UpdateDiaryRequest {
  title: string
  content?: string
  tags?: string[]
  date?: string
  transactions?: TransactionInput[]
  alerts?: AlertInput[]
  thesis?: string
  risk?: string
  execution?: string
  reviewDueAt?: string | null
  stockSymbols?: string[]
}

// ---- Wire response types ----

export interface TransactionResponse {
  id: SerializedId
  diaryId?: SerializedId
  userId?: SerializedId
  symbol: string
  type: 'BUY' | 'SELL'
  quantity: string
  price: string
  tradeDate: string
  notes?: string | null
  strategy?: string | null
  emotion?: string | null
  createdAt?: string
}

export interface DiaryAlertResponse {
  id: SerializedId
  diaryId?: SerializedId
  message: string
  triggerAt: string
  isDismissed?: boolean
  recurringMode?: 'WEEK' | 'MONTH' | string | null
  parentId?: SerializedId | null
  instanceNumber?: number | null
  isPaused?: boolean
  createdAt?: string
}

export interface DiaryResponse {
  id: SerializedId
  userId: SerializedId
  title: string
  content: string | null
  tags: string[]
  tagsString: string | null
  // TELEGRAM_BOT is retained for historical rows; new writes only use WEB/API_KEY.
  createdVia: 'WEB' | 'API_KEY' | 'TELEGRAM_BOT'
  createdByLabel: string | null
  date: string
  createdAt: string
  updatedAt: string
  transactions?: TransactionResponse[]
  alerts?: DiaryAlertResponse[]
  tradePlans?: TradePlan[]
  tradePlanSummary?: {
    total: number
    statuses: Array<{ status: TradePlanStatus; count: number }>
  }
  // Structured review fields
  thesis?: string | null
  risk?: string | null
  execution?: string | null
  reviewDueAt?: string | null
  reviewStatus?: ReviewStatus | string | null
  reviewedAt?: string | null
  reviewOutcome?: ReviewOutcome | string | null
  reviewSummary?: string | null
  reviewLearning?: string | null
  reviewAdjustment?: string | null
  stockSymbols: string[]
  stockContexts?: Array<{ stock: { symbol: string } }>
}

export interface DiaryListResponse {
  data: DiaryResponse[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

/** @deprecated Use DiaryListResponse. */
export type DiariesApiResponse = DiaryListResponse

export interface DiaryActivityDay {
  date: string
  diaryId: SerializedId
  alertCount: number
  transactionCount: number
}

export interface PaginationResponse {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface DiaryGroup {
  period: string
  periodLabel: string
  diaries: DiaryResponse[]
}

// ---- Pre-serialization server records ----

export interface DiaryRecordTransaction {
  id: bigint
  diaryId: bigint
  userId: bigint
  symbol: string
  type: 'BUY' | 'SELL'
  quantity: Prisma.Decimal
  price: Prisma.Decimal
  tradeDate: Date
  notes: string | null
  strategy: string | null
  emotion: string | null
  createdAt: Date
}

export interface DiaryRecordAlert {
  id: bigint
  diaryId: bigint
  message: string
  triggerAt: Date
  isDismissed: boolean
  recurringMode: 'WEEK' | 'MONTH' | null
  parentId: bigint | null
  instanceNumber: number | null
  isPaused: boolean
  createdAt: Date
}

export interface DiaryRecord {
  id: bigint
  userId: bigint
  title: string
  content: string | null
  tagsString: string | null
  createdVia: 'WEB' | 'API_KEY' | 'TELEGRAM_BOT'
  createdByLabel: string | null
  date: Date
  createdAt: Date
  updatedAt: Date
  thesis: string | null
  risk: string | null
  execution: string | null
  reviewDueAt: Date | null
  reviewStatus: string | null
  reviewedAt: Date | null
  reviewOutcome: string | null
  reviewSummary: string | null
  reviewLearning: string | null
  reviewAdjustment: string | null
  transactions?: DiaryRecordTransaction[]
  alerts?: DiaryRecordAlert[]
  stockContexts?: Array<{ stock: { symbol: string } }>
  tags?: string[]
  stockSymbols?: string[]
}
