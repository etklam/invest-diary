import type { DiaryInput } from '~/types/diary'

export type AuthoringTransactionType = 'BUY' | 'SELL'

/** The normalized shape used by the diary authoring UI. */
export interface DiaryAuthoringTransaction {
  id?: string
  symbol: string
  type: AuthoringTransactionType
  quantity: number
  price: number
  trade_date: string
  notes?: string
  strategy?: string
  emotion?: string
}

export interface DiaryAuthoringAlert {
  id?: string
  message: string
  trigger_at: string
  recurring_mode?: '' | 'WEEK' | 'MONTH'
}

export interface DiaryAuthoringForm {
  date: string
  title: string
  content: string
  thesis: string
  risk: string
  execution: string
  reviewDueAt: string
  stockSymbols: string[]
  transactions: DiaryAuthoringTransaction[]
  alerts: DiaryAuthoringAlert[]
}

/**
 * Optional client-side ledger context. The UI must treat `available: false`
 * as unknown rather than as an empty portfolio.
 */
export interface DiaryAuthoringLedgerContext {
  available: boolean
  holdings?: Record<string, number>
}

export type DiaryAuthoringPayload = DiaryInput & {
  transactions: Array<{
    id?: string
    symbol: string
    type: AuthoringTransactionType
    quantity: number
    price: number
    trade_date: string
    notes?: string
    strategy?: string
    emotion?: string
  }>
  alerts: Array<{
    id?: string
    message: string
    trigger_at: string
    recurring_mode?: 'WEEK' | 'MONTH'
  }>
}
