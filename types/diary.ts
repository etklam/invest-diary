// Diary-related shared types

import type { Prisma } from '@prisma/client'
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

// ---- API / Domain Types (backward compatible) ----

export interface TransactionInput {
  id?: bigint | string | number  // pre-serialization input — accepts raw DB ID for updates
  symbol: string
  type: 'BUY' | 'SELL'
  quantity: Prisma.Decimal | number | string
  price: Prisma.Decimal | number | string
  tradeDate?: Date | string
  trade_date?: Date | string
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

export interface DiaryInput {
  title: string
  content?: string
  tags?: string[]
  date?: string | Date
  transactions?: TransactionInput[]
  alerts?: AlertInput[]
  // Structured review fields
  thesis?: string
  risk?: string
  execution?: string
  reviewDueAt?: string | Date | null
}

// Prisma-like return shape used by APIs
export interface Diary {
  id: SerializedId
  userId: SerializedId
  title: string
  content: string | null
  tags?: string[]
  tagsString?: string | null
  // TELEGRAM_BOT is retained for historical rows; new writes only use WEB/API_KEY.
  createdVia?: 'WEB' | 'API_KEY' | 'TELEGRAM_BOT'
  createdByLabel?: string | null
  date: Date
  createdAt: Date
  updatedAt: Date
  transactions?: TransactionInput[]
  alerts?: AlertInput[]
  tradePlans?: TradePlan[]
  tradePlanSummary?: {
    total: number
    statuses: Array<{ status: TradePlanStatus; count: number }>
  }
  // Structured review fields
  thesis?: string | null
  risk?: string | null
  execution?: string | null
  reviewDueAt?: Date | null
  reviewStatus?: ReviewStatus | null
  reviewedAt?: Date | null
  reviewOutcome?: ReviewOutcome | null
  reviewSummary?: string | null
  reviewLearning?: string | null
  reviewAdjustment?: string | null
}

export interface DiariesApiResponse {
  data: Diary[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

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

export interface DiaryAlert {
  id: SerializedId
  message: string
  triggerAt: Date | string
  isDismissed?: boolean
}

export interface DiaryGroup {
  period: string
  periodLabel: string
  diaries: Diary[]
}
