// Diary-related shared types

import type { Prisma } from '@prisma/client'

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
  symbol: string
  type: 'BUY' | 'SELL'
  quantity: Prisma.Decimal | number
  price: Prisma.Decimal | number
  tradeDate?: Date | string
  trade_date?: Date | string
}

export interface AlertInput {
  message: string
  triggerAt?: Date | string
  trigger_at?: Date | string
}

export interface DiaryInput {
  title: string
  content?: string
  tags?: string[]
  date?: string | Date
  transactions?: TransactionInput[]
  alerts?: AlertInput[]
}

// Prisma-like return shape used by APIs
export interface Diary {
  id: bigint | string
  userId: bigint | string
  title: string
  content: string | null
  tags?: string[]
  tagsString?: string | null
  date: Date
  createdAt: Date
  updatedAt: Date
  transactions?: TransactionInput[]
  alerts?: AlertInput[]
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

export interface PaginationResponse {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface DiaryAlert {
  id: bigint | string
  message: string
  triggerAt: Date | string
  isDismissed?: boolean
}

export interface DiaryGroup {
  period: string
  periodLabel: string
  diaries: Diary[]
}
