import { formatYmdInTimezone } from '~/lib/dates/format'
import { toDateTimeLocalValue } from '~/lib/dates/normalize'
import type {
  DiaryAuthoringAlert,
  DiaryAuthoringForm,
  DiaryAuthoringTransaction,
} from './types'

type Scalar = number | string | bigint | { toNumber?: () => number; toString: () => string } | null | undefined

export interface DiaryHydrationOptions {
  timeZone?: string
  fallbackDate?: string
}

export function toAuthoringNumber(value: Scalar, fallback = 0): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback
  if (typeof value === 'bigint') return Number(value)
  if (value && typeof value === 'object' && typeof value.toNumber === 'function') {
    const numberValue = value.toNumber()
    return Number.isFinite(numberValue) ? numberValue : fallback
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function asId(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined
  return String(value)
}

function asDateTimeLocal(value: unknown): string {
  if (value instanceof Date || typeof value === 'string' || typeof value === 'number') {
    return toDateTimeLocalValue(value instanceof Date ? value : new Date(value))
  }
  return toDateTimeLocalValue(new Date())
}

export function hydrateTransaction(transaction: Record<string, any>): DiaryAuthoringTransaction {
  return {
    ...(asId(transaction.id) ? { id: asId(transaction.id) } : {}),
    symbol: String(transaction.symbol ?? '').trim().toUpperCase(),
    type: transaction.type === 'SELL' ? 'SELL' : 'BUY',
    quantity: toAuthoringNumber(transaction.quantity),
    price: toAuthoringNumber(transaction.price),
    trade_date: asDateTimeLocal(transaction.trade_date ?? transaction.tradeDate),
    ...(transaction.notes != null ? { notes: String(transaction.notes) } : {}),
    ...(transaction.strategy != null ? { strategy: String(transaction.strategy) } : {}),
    ...(transaction.emotion != null ? { emotion: String(transaction.emotion) } : {}),
  }
}

export function hydrateAlert(
  alert: Record<string, any>,
  timeZone = 'UTC',
): DiaryAuthoringAlert {
  const triggerAt = alert.trigger_at ?? alert.triggerAt
  return {
    ...(asId(alert.id) ? { id: asId(alert.id) } : {}),
    message: String(alert.message ?? ''),
    trigger_at: triggerAt
      ? formatYmdInTimezone(triggerAt, timeZone)
      : formatYmdInTimezone(new Date(), timeZone),
    recurring_mode: alert.recurring_mode ?? alert.recurringMode ?? '',
  }
}

export function createEmptyDiaryAuthoringForm(date: string): DiaryAuthoringForm {
  return {
    date,
    title: '',
    content: '',
    thesis: '',
    risk: '',
    execution: '',
    reviewDueAt: '',
    stockSymbols: [],
    transactions: [],
    alerts: [],
  }
}

export function hydrateDiaryAuthoring(
  diary: Record<string, any>,
  options: DiaryHydrationOptions = {},
): DiaryAuthoringForm {
  const timeZone = options.timeZone ?? 'UTC'
  const date = diary.date
    ? formatYmdInTimezone(diary.date, timeZone)
    : (options.fallbackDate ?? formatYmdInTimezone(new Date(), timeZone))

  return {
    date,
    title: String(diary.title ?? ''),
    content: String(diary.content ?? ''),
    thesis: String(diary.thesis ?? ''),
    risk: String(diary.risk ?? ''),
    execution: String(diary.execution ?? ''),
    reviewDueAt: diary.reviewDueAt
      ? formatYmdInTimezone(diary.reviewDueAt, timeZone)
      : '',
    stockSymbols: Array.isArray(diary.stockSymbols)
      ? diary.stockSymbols.map((symbol: unknown) => String(symbol))
      : Array.isArray(diary.stockContexts)
        ? diary.stockContexts
            .map((context: Record<string, any>) => String(context.stock?.symbol ?? ''))
            .filter(Boolean)
        : [],
    transactions: Array.isArray(diary.transactions)
      ? diary.transactions.map((transaction: Record<string, any>) => hydrateTransaction(transaction))
      : [],
    alerts: Array.isArray(diary.alerts)
      ? diary.alerts.map((alert: Record<string, any>) => hydrateAlert(alert, timeZone))
      : [],
  }
}
