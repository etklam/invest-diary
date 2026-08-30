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

export interface DiariesApiResponse {
  data: DiaryResponse[]
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
