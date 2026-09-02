/**
 * Transaction read-side boundary.
 *
 * ADR-0001 makes Diary.userId the only ownership authority. Transaction.userId
 * is deliberately not selected or used for authorization; it is only a
 * denormalized copy maintained by the write path and migration.
 */
import type { Prisma } from '@prisma/client'
import prisma from '~/lib/prisma'
import { normalizeSymbol } from '~/lib/position-state'

export type TransactionReadType = 'BUY' | 'SELL'

/** Canonical transaction row consumed by portfolio and trade analytics. */
export interface TransactionReadRow {
  id: string
  symbol: string
  type: TransactionReadType
  quantity: number
  price: number
  tradeDate: Date
  strategy: string | null
  emotion: string | null
}

type TransactionProjectionRow = {
  id: bigint
  symbol: string
  type: string
  quantity: unknown
  price: unknown
  tradeDate: Date
  strategy?: string | null
  emotion?: string | null
}

/** Shared projection for portfolio/holding and trade matching reads. */
export const TRANSACTION_BASE_SELECT = {
  id: true,
  symbol: true,
  type: true,
  quantity: true,
  price: true,
  tradeDate: true,
} as const satisfies Prisma.TransactionSelect

/** Performance intentionally includes the strategy/emotion dimensions. */
export const TRANSACTION_PERFORMANCE_SELECT = {
  ...TRANSACTION_BASE_SELECT,
  strategy: true,
  emotion: true,
} as const satisfies Prisma.TransactionSelect

/** Stable ordering keeps same-date matching deterministic across DB reads. */
export const TRANSACTION_TRADE_DATE_ASC_ORDER = [
  { tradeDate: 'asc' },
  { id: 'asc' },
] as const satisfies Prisma.TransactionOrderByWithRelationInput[]

/** The relation is the only authorization predicate for every read below. */
export function transactionOwnershipWhere(userId: bigint): Prisma.TransactionWhereInput {
  return { diary: { userId } }
}

function normalizeSymbolFilter(symbol: string | null): string | null {
  if (!symbol?.trim()) return null
  return normalizeSymbol(symbol)
}

function decimalToNumber(value: unknown): number {
  if (typeof value === 'number') return value
  if (typeof value === 'bigint') return Number(value)

  if (value && typeof value === 'object' && 'toNumber' in value) {
    const toNumber = (value as { toNumber: () => number }).toNumber
    // Decimal.js methods depend on their receiver; calling the extracted
    // method loses `this` and returns NaN with the MariaDB adapter.
    if (typeof toNumber === 'function') return Number(toNumber.call(value))
  }

  return Number(value)
}

function bigintToString(value: bigint | number | string): string {
  return value.toString()
}

/**
 * Map Prisma scalar wrappers at the read boundary. This also makes data from
 * old rows (including NULL/mismatched user_id copies) safe to consume because
 * ownership has already been decided by the diary relation query.
 */
export function mapTransactionReadRow(row: {
  id: bigint | number | string
  symbol: string
  type: string
  quantity: unknown
  price: unknown
  tradeDate: Date
  strategy?: string | null
  emotion?: string | null
}): TransactionReadRow {
  return {
    id: bigintToString(row.id),
    symbol: normalizeSymbol(row.symbol),
    type: row.type as TransactionReadType,
    quantity: decimalToNumber(row.quantity),
    price: decimalToNumber(row.price),
    tradeDate: row.tradeDate,
    strategy: row.strategy ?? null,
    emotion: row.emotion ?? null,
  }
}

export interface TransactionReadOptions {
  symbol?: string | null
  withAttributes?: boolean
}

/** Read all owned transactions for portfolio and trade analytics. */
export async function readPortfolioTransactions(
  userId: bigint,
  options: TransactionReadOptions = {},
): Promise<TransactionReadRow[]> {
  const normalizedSymbol = normalizeSymbolFilter(options.symbol ?? null)
  const rows = await prisma.transaction.findMany({
    where: {
      ...transactionOwnershipWhere(userId),
      ...(normalizedSymbol ? { symbol: normalizedSymbol } : {}),
    },
    select: options.withAttributes ? TRANSACTION_PERFORMANCE_SELECT : TRANSACTION_BASE_SELECT,
    orderBy: TRANSACTION_TRADE_DATE_ASC_ORDER,
  }) as TransactionProjectionRow[]

  return rows.map(row => mapTransactionReadRow(row))
}
