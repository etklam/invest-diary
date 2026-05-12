/**
 * lib/position-state.ts
 * 平均成本法持倉狀態計算 — 純函數，無副作用
 *
 * 這是持股計算（calculateHoldings）和交易配對（matchTrades）共用的核心。
 *
 * 合約：
 * - 輸入按 tradeDate 自動排序
 * - Symbol 內部正規化（trim + uppercase）
 * - 超賣拋錯（無持倉賣出或賣出超過持倉）
 * - 持倉歸零時自動從結果移除
 */

export interface PositionStateInput {
  symbol: string
  type: 'BUY' | 'SELL'
  quantity: number
  price: number
  tradeDate: Date | string
}

export interface PositionState {
  symbol: string
  totalQuantity: number
  totalCost: number
  avgCost: number
}

// ─── 共享的正規化與排序 ──────────────────────────────────────────────────────

export function normalizeSymbol(raw: string): string {
  return raw.trim().toUpperCase()
}

export function toDate(v: Date | string): Date {
  return v instanceof Date ? v : new Date(v)
}

// ─── 共享的持倉操作（matchTrades 和 computePositionState 共用） ─────────────────

export interface SymbolPosition {
  totalQuantity: number
  totalCost: number
}

export function createPosition(): SymbolPosition {
  return { totalQuantity: 0, totalCost: 0 }
}

export function applyBuy(pos: SymbolPosition, qty: number, price: number): void {
  pos.totalQuantity += qty
  pos.totalCost += qty * price
}

export function applySell(pos: SymbolPosition, qty: number): number {
  if (pos.totalQuantity <= 0) {
    throw new Error(`Sell without holdings: attempting to sell ${qty} shares`)
  }
  if (qty > pos.totalQuantity) {
    throw new Error(
      `Sell exceeds holdings: holding ${pos.totalQuantity}, attempting to sell ${qty}`,
    )
  }
  const avgCost = pos.totalCost / pos.totalQuantity
  pos.totalQuantity -= qty
  pos.totalCost -= qty * avgCost
  return avgCost
}

export function isPositionClosed(pos: SymbolPosition): boolean {
  return pos.totalQuantity <= 0.0001
}

// ─── 批次計算（calculateHoldings 使用） ───────────────────────────────────────

export function computePositionState(transactions: PositionStateInput[]): PositionState[] {
  if (!transactions.length) return []

  const sorted = [...transactions].sort((a, b) => {
    return toDate(a.tradeDate).getTime() - toDate(b.tradeDate).getTime()
  })

  const symbolMap = new Map<string, SymbolPosition>()

  for (const tx of sorted) {
    const symbol = normalizeSymbol(tx.symbol)
    const pos = symbolMap.get(symbol) ?? createPosition()

    if (tx.type === 'BUY') {
      applyBuy(pos, tx.quantity, tx.price)
      symbolMap.set(symbol, pos)
    } else if (tx.type === 'SELL') {
      applySell(pos, tx.quantity)
      if (isPositionClosed(pos)) {
        symbolMap.delete(symbol)
      } else {
        symbolMap.set(symbol, pos)
      }
    }
  }

  return Array.from(symbolMap.entries()).map(([symbol, pos]) => ({
    symbol,
    totalQuantity: pos.totalQuantity,
    totalCost: pos.totalCost,
    avgCost: pos.totalCost / pos.totalQuantity,
  }))
}
