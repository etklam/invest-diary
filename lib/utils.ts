// ❌ 不要從 prisma runtime 匯入（會被 Vite client bundle）
// ✅ 僅用於型別，改用 Prisma namespace
import type { Prisma } from '@prisma/client'
import { computePositionState } from '~/lib/position-state'
import type { PositionStateInput } from '~/lib/position-state'
import {
  formatDate,
  formatShortDate,
  formatDateWithWeekday,
} from '~/lib/dates'

// ─── Re-exports ───────────────────────────────────────────────────────────────
// 日期格式化已移至 lib/dates/，此處保留向後相容的 re-export
export { formatDate, formatShortDate, formatDateWithWeekday }

export interface Holding {
  symbol: string
  quantity: number
  avgCost: number
  totalCost: number
}

// 最小化的交易記錄類型，只用於計算持股
export interface TransactionForHolding {
  symbol: string
  type: 'BUY' | 'SELL'
  quantity: Prisma.Decimal | number
  price: Prisma.Decimal | number
  tradeDate: Date | string
}

/**
 * 從交易記錄計算持股資訊
 * 委派給 computePositionState（平均成本法核心）
 */
export function calculateHoldings(transactions: TransactionForHolding[]): Holding[] {
  const inputs: PositionStateInput[] = transactions.map((tx) => ({
    symbol: tx.symbol,
    type: tx.type,
    quantity: Number(tx.quantity),
    price: Number(tx.price),
    tradeDate: tx.tradeDate,
  }))

  return computePositionState(inputs).map((pos) => ({
    symbol: pos.symbol,
    quantity: pos.totalQuantity,
    avgCost: pos.avgCost,
    totalCost: pos.totalCost,
  }))
}

// ─── Re-exports ───────────────────────────────────────────────────────────────
// 數字格式化已移至 lib/format.ts，此處保留向後相容的 re-export
export { formatCurrency } from '~/lib/format'
