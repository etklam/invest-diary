import { z } from 'zod'
import type { DiaryAuthoringTransaction } from './types'

export { DIARY_PAYLOAD_LIMITS } from '~/lib/contracts/diary/validation'
import { DIARY_PAYLOAD_LIMITS } from '~/lib/contracts/diary/validation'

export type LedgerInputTransaction = Pick<DiaryAuthoringTransaction, 'symbol' | 'type'> & {
  quantity: unknown
  id?: string | number | bigint
  tradeDate?: Date | string
  trade_date?: Date | string
  price?: unknown
}

/**
 * Hard caps for diary payloads. Enforced server-side on every diary
 * create/update (web + API-key agent paths); the 100-transaction cap matches
 * the agent API record precedent. Without them an oversized payload is an
 * authenticated DoS that also slows every subsequent unbounded ledger read.
 */
const diaryPayloadLimitsSchema = z.object({
  title: z.string().max(
    DIARY_PAYLOAD_LIMITS.title,
    `Title must be at most ${DIARY_PAYLOAD_LIMITS.title} characters`,
  ),
  content: z.string().max(
    DIARY_PAYLOAD_LIMITS.content,
    `Content must be at most ${DIARY_PAYLOAD_LIMITS.content} characters`,
  ),
  transactions: z.array(z.unknown()).max(
    DIARY_PAYLOAD_LIMITS.transactions,
    `A diary allows at most ${DIARY_PAYLOAD_LIMITS.transactions} transactions`,
  ),
  alerts: z.array(z.unknown()).max(
    DIARY_PAYLOAD_LIMITS.alerts,
    `A diary allows at most ${DIARY_PAYLOAD_LIMITS.alerts} alerts`,
  ),
})

/**
 * Reject oversized diary payloads before ledger math or persistence.
 * Returns the first violated limit as a validation detail, or null.
 */
export function validateDiaryPayloadLimits(payload: {
  title?: string | null
  content?: string | null
  transactions?: readonly unknown[] | null
  alerts?: readonly unknown[] | null
}): { field: string; message: string } | null {
  const parsed = diaryPayloadLimitsSchema.safeParse({
    title: payload.title ?? '',
    content: payload.content ?? '',
    transactions: payload.transactions ?? [],
    alerts: payload.alerts ?? [],
  })
  if (parsed.success) return null
  const issue = parsed.error.issues[0]
  if (!issue) return null
  return {
    field: String(issue.path[0] ?? 'payload'),
    message: issue.message,
  }
}

export type HoldingsInput = Map<string, number> | Record<string, number> | undefined

export interface LedgerValidationIssue {
  index: number
  symbol: string
  field?: 'quantity' | 'price'
  message: string
}

const EPSILON = 0.0001

function quantityOf(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  if (typeof value === 'bigint') return Number(value)
  if (value && typeof value === 'object' && 'toNumber' in value) {
    const toNumber = (value as { toNumber?: () => number }).toNumber
    if (typeof toNumber === 'function') return Number(toNumber.call(value))
  }
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : 0
}

function numberOf(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'bigint') {
    const numberValue = Number(value)
    return Number.isFinite(numberValue) ? numberValue : null
  }
  if (value && typeof value === 'object' && 'toNumber' in value) {
    const toNumber = (value as { toNumber?: () => number }).toNumber
    if (typeof toNumber === 'function') {
      const numberValue = Number(toNumber.call(value))
      return Number.isFinite(numberValue) ? numberValue : null
    }
  }

  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : null
}

/** Validate trusted-boundary transaction numbers before ledger arithmetic. */
export function validateTransactionValues(
  transactions: LedgerInputTransaction[],
  options: { requirePrice?: boolean } = {},
): LedgerValidationIssue | null {
  for (const { transaction, index } of transactions.map((transaction, index) => ({ transaction, index }))) {
    const symbol = transaction.symbol?.trim().toUpperCase() ?? ''
    const fields: Array<['quantity' | 'price', unknown]> = [['quantity', transaction.quantity]]
    if (options.requirePrice || transaction.price !== undefined) fields.push(['price', transaction.price])

    for (const [field, value] of fields) {
      const numberValue = numberOf(value)
      if (numberValue === null || numberValue <= 0) {
        return {
          index,
          symbol,
          field,
          message: `${field} must be a finite number greater than 0`,
        }
      }
    }
  }

  return null
}

function normalizedHoldings(initialHoldings: HoldingsInput): Map<string, number> {
  if (initialHoldings instanceof Map) {
    return new Map(Array.from(initialHoldings.entries()).map(([symbol, quantity]) => [
      symbol.trim().toUpperCase(), quantityOf(quantity),
    ]))
  }

  return new Map(Object.entries(initialHoldings ?? {}).map(([symbol, quantity]) => [
    symbol.trim().toUpperCase(), quantityOf(quantity),
  ]))
}

function orderedTransactions(transactions: LedgerInputTransaction[]) {
  return transactions
    .map((transaction, index) => ({ transaction, index }))
    .sort((a, b) => {
      const aTime = dateOf(a.transaction).getTime()
      const bTime = dateOf(b.transaction).getTime()
      const aSortable = Number.isNaN(aTime) ? Number.POSITIVE_INFINITY : aTime
      const bSortable = Number.isNaN(bTime) ? Number.POSITIVE_INFINITY : bTime
      return aSortable - bSortable || a.index - b.index
    })
}

function dateOf(transaction: LedgerInputTransaction): Date {
  const value = transaction.trade_date ?? transaction.tradeDate
  return value instanceof Date ? value : new Date(value ?? Number.NaN)
}

/** Apply a ledger in trade-date order and return the resulting holdings. */
export function calculateLedgerHoldings(
  initialHoldings: HoldingsInput,
  transactions: LedgerInputTransaction[],
): Map<string, number> {
  const valueError = validateTransactionValues(transactions)
  if (valueError) throw new Error(valueError.message)

  const holdings = normalizedHoldings(initialHoldings)

  for (const { transaction } of orderedTransactions(transactions)) {
    const symbol = transaction.symbol?.trim().toUpperCase()
    if (!symbol) continue

    const quantity = quantityOf(transaction.quantity)
    const current = holdings.get(symbol) ?? 0

    if (transaction.type === 'BUY') {
      holdings.set(symbol, current + quantity)
      continue
    }

    if (transaction.type !== 'SELL') continue
    if (current <= EPSILON) {
      throw new Error(`股票 ${symbol} 沒有持股可賣，請先添加買入記錄`)
    }
    if (quantity > current + EPSILON) {
      throw new Error(`股票 ${symbol} 賣出數量 (${quantity}) 超過持股數量 (${current})`)
    }

    const remaining = current - quantity
    if (remaining <= EPSILON) holdings.delete(symbol)
    else holdings.set(symbol, remaining)
  }

  return holdings
}

/** Return the first ledger issue, preserving the input row index for UI use. */
/**
 * Client-side UX validation. The client has no portfolio baseline, so SELL
 * rows are left to the server authority; only row values are checked here.
 */
export function validateDiaryDraft(
  transactions: LedgerInputTransaction[],
): LedgerValidationIssue | null {
  return validateTransactionValues(transactions)
}
