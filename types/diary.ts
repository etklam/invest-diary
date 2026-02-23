/**
 * Diary-related type definitions
 *
 * Centralized types for diary, alerts, transactions, and API responses.
 * Used across components, composables, and server API routes.
 */

/**
 * Diary alert/reminder
 */
export interface DiaryAlert {
  id: string
  message: string
  triggerAt: Date | string
  isDismissed: boolean
}

/**
 * Transaction type enum
 */
export type TransactionType = 'BUY' | 'SELL'

/**
 * Diary transaction record
 */
export interface DiaryTransaction {
  id: string
  symbol: string
  type: TransactionType
  quantity: number
  price: number
  tradeDate: Date | string
  diaryId?: string
}

/**
 * Full diary with all fields
 */
export interface Diary {
  id: string
  title: string
  content?: string
  date?: Date | string
  createdAt: Date | string
  updatedAt: Date | string
  userId?: string
  transactions?: DiaryTransaction[]
  alerts?: DiaryAlert[]
}

/**
 * Pagination metadata
 */
export interface PaginationResponse {
  page: number
  limit: number
  total: number
  totalPages: number
}

/**
 * API response wrapper for diaries list
 */
export interface DiariesApiResponse {
  data: Diary[]
  pagination: PaginationResponse
}

/**
 * Grouped diaries by period (year-month)
 */
export interface DiaryGroup {
  period: string // Format: "YYYY-MM"
  periodLabel: string // Localized label
  diaries: Diary[]
}

/**
 * Diary form input (for create/update)
 */
export interface DiaryInput {
  title: string
  content?: string
  date?: Date | string
  transactions?: DiaryTransactionInput[]
  alerts?: DiaryAlertInput[]
}

/**
 * Transaction input for create/update
 */
export interface DiaryTransactionInput {
  symbol: string
  type: TransactionType
  quantity: number
  price: number
  tradeDate: Date | string | string
  trade_date?: Date | string | string // Alternative field name
}

/**
 * Alert input for create/update
 */
export interface DiaryAlertInput {
  message: string
  triggerAt: Date | string | string
  trigger_at?: Date | string | string // Alternative field name
}
