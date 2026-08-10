import { toUtcNoonDate } from '~/lib/dates/normalize'
import type { DiaryAuthoringForm, DiaryAuthoringPayload } from './types'

function finiteNumber(value: unknown, field: string): number {
  const numberValue = Number(value)
  if (!Number.isFinite(numberValue) || numberValue <= 0) {
    throw new Error(`${field} must be a finite number greater than 0`)
  }
  return numberValue
}

function apiDateTime(value: string | Date, field: string): string {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) throw new Error(`${field} must be a valid date`)
  return date.toISOString()
}

export function buildDiaryAuthoringPayload(form: DiaryAuthoringForm): DiaryAuthoringPayload {
  return {
    title: form.title,
    content: form.content,
    thesis: form.thesis || undefined,
    risk: form.risk || undefined,
    execution: form.execution || undefined,
    reviewDueAt: form.reviewDueAt ? toUtcNoonDate(form.reviewDueAt).toISOString() : null,
    stockSymbols: form.stockSymbols,
    date: toUtcNoonDate(form.date).toISOString(),
    transactions: form.transactions.map((transaction) => ({
      ...(transaction.id ? { id: transaction.id } : {}),
      symbol: transaction.symbol.trim().toUpperCase(),
      type: transaction.type,
      quantity: finiteNumber(transaction.quantity, 'quantity'),
      price: finiteNumber(transaction.price, 'price'),
      trade_date: apiDateTime(transaction.trade_date, 'trade_date'),
      ...(transaction.notes ? { notes: transaction.notes } : {}),
      ...(transaction.strategy ? { strategy: transaction.strategy } : {}),
      ...(transaction.emotion ? { emotion: transaction.emotion } : {}),
    })),
    alerts: form.alerts.map((alert) => ({
      ...(alert.id ? { id: alert.id } : {}),
      message: alert.message,
      trigger_at: toUtcNoonDate(alert.trigger_at).toISOString(),
      ...(alert.recurring_mode ? { recurring_mode: alert.recurring_mode } : {}),
    })),
  }
}
