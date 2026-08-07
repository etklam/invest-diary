// Diary-related shared types

import type { Prisma } from '@prisma/client'
import type { SerializedId } from './common'

export const DEFAULT_TAGS = [
  { key: 'profit', labelKey: 'tags.profit', color: 'green' },
  { key: 'loss', labelKey: 'tags.loss', color: 'red' },
  { key: 'watch', labelKey: 'tags.watch', color: 'blue' },
  { key: 'hold', labelKey: 'tags.hold', color: 'gray' },
  { key: 'learning', labelKey: 'tags.learning', color: 'purple' },
  { key: 'mistake', labelKey: 'tags.mistake', color: 'orange' },
] as const

export type TagKey = typeof DEFAULT_TAGS[number]['key']

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
  reviewDueAt?: string | Date
  reviewStatus?: string
  reviewedAt?: string | Date
}

// Prisma-like return shape used by APIs
export interface Diary {
  id: SerializedId
  userId: SerializedId
  title: string
  content: string | null
  tags?: string[]
  tagsString?: string | null
  createdVia?: 'WEB' | 'API_KEY' | 'TELEGRAM_BOT'
  createdByLabel?: string | null
  date: Date
  createdAt: Date
  updatedAt: Date
  transactions?: TransactionInput[]
  alerts?: AlertInput[]
  // Structured review fields
  thesis?: string | null
  risk?: string | null
  execution?: string | null
  reviewDueAt?: Date | null
  reviewStatus?: string | null
  reviewedAt?: Date | null
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
