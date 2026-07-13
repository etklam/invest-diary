import type { DiaryAuthoringLedgerContext, DiaryAuthoringTransaction } from './types'

export type LedgerInputTransaction = Pick<DiaryAuthoringTransaction, 'symbol' | 'type'> & {
  quantity: unknown
  id?: string | number | bigint
  tradeDate?: Date | string
  trade_date?: Date | string
  price?: unknown
}

export type HoldingsInput = Map<string, number> | Record<string, number> | undefined

export interface LedgerValidationIssue {
  index: number
  symbol: string
  message: string
}

const EPSILON = 0.0001

function quantityOf(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  if (typeof value === 'bigint') return Number(value)
  if (value && typeof value === 'object' && 'toNumber' in value) {
    const toNumber = (value as { toNumber?: () => number }).toNumber
    if (typeof toNumber === 'function') return Number(toNumber())
  }
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : 0
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
export function validateTransactionLedger(
  initialHoldings: HoldingsInput,
  transactions: LedgerInputTransaction[],
): LedgerValidationIssue | null {
  const holdings = normalizedHoldings(initialHoldings)

  for (const { transaction, index } of orderedTransactions(transactions)) {
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
      return { index, symbol, message: `股票 ${symbol} 沒有持股可賣，請先添加買入記錄` }
    }
    if (quantity > current + EPSILON) {
      return {
        index,
        symbol,
        message: `股票 ${symbol} 賣出數量 (${quantity}) 超過持股數量 (${current})`,
      }
    }

    const remaining = current - quantity
    if (remaining <= EPSILON) holdings.delete(symbol)
    else holdings.set(symbol, remaining)
  }

  return null
}

/**
 * Client-side UX validation. Unknown baseline means unknown holdings, not an
 * empty portfolio; SELL rows are therefore left to the server authority.
 */
export function validateDiaryDraft(
  transactions: LedgerInputTransaction[],
  context: DiaryAuthoringLedgerContext = { available: false },
): LedgerValidationIssue | null {
  if (!context.available) return null
  return validateTransactionLedger(context.holdings ?? {}, transactions)
}

export function holdingBeforeTransaction(
  transactions: LedgerInputTransaction[],
  targetIndex: number,
  context: DiaryAuthoringLedgerContext = { available: false },
): number {
  if (!context.available) return 0
  const holdings = normalizedHoldings(context.holdings)
  for (const entry of orderedTransactions(transactions)) {
    if (entry.index === targetIndex) break
    const symbol = entry.transaction.symbol?.trim().toUpperCase()
    if (!symbol) continue
    const quantity = quantityOf(entry.transaction.quantity)
    const current = holdings.get(symbol) ?? 0
    if (entry.transaction.type === 'BUY') holdings.set(symbol, current + quantity)
    else if (entry.transaction.type === 'SELL') holdings.set(symbol, current - quantity)
  }
  const target = transactions[targetIndex]?.symbol?.trim().toUpperCase()
  return target ? Math.max(0, holdings.get(target) ?? 0) : 0
}
