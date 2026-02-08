import type { Transaction } from '@prisma/client'

export interface Holding {
  symbol: string
  quantity: number
  avgCost: number
  totalCost: number
}

/**
 * 從交易記錄計算持股資訊
 * 平均成本 = (買入總成本 - 賣出總成本) / (買入總數量 - 賣出總數量)
 */
export function calculateHoldings(transactions: Transaction[]): Holding[] {
  const symbolMap = new Map<string, {
    totalQuantity: number
    totalCost: number
  }>()

  // 先按日期排序交易記錄
  // Handle both Date objects and ISO strings
  const sortedTransactions = [...transactions].sort((a, b) => {
    const dateA = a.tradeDate instanceof Date ? a.tradeDate : new Date(a.tradeDate)
    const dateB = b.tradeDate instanceof Date ? b.tradeDate : new Date(b.tradeDate)
    return dateA.getTime() - dateB.getTime()
  })

  for (const tx of sortedTransactions) {
    const existing = symbolMap.get(tx.symbol) || { totalQuantity: 0, totalCost: 0 }

    if (tx.type === 'BUY') {
      existing.totalQuantity += Number(tx.quantity)
      existing.totalCost += Number(tx.quantity) * Number(tx.price)
    } else if (tx.type === 'SELL') {
      // 賣出時，按照先進先出（FIFO）計算成本
      // 簡化計算：賣出總數量 * 平均成本
      const avgCost = existing.totalQuantity > 0 ? existing.totalCost / existing.totalQuantity : 0
      const sellCost = Number(tx.quantity) * avgCost
      existing.totalQuantity -= Number(tx.quantity)
      existing.totalCost -= sellCost
    }

    // 如果數量為0，從 map 中移除
    if (existing.totalQuantity <= 0.0001) {
      symbolMap.delete(tx.symbol)
    } else {
      symbolMap.set(tx.symbol, existing)
    }
  }

  // 轉換為陣列並計算平均成本
  return Array.from(symbolMap.entries()).map(([symbol, data]) => ({
    symbol,
    quantity: data.totalQuantity,
    avgCost: data.totalQuantity > 0 ? data.totalCost / data.totalQuantity : 0,
    totalCost: data.totalCost
  }))
}

/**
 * 取得特定股票的持股資訊
 */
export function getHoldingBySymbol(transactions: Transaction[], symbol: string): Holding | null {
  const holdings = calculateHoldings(transactions.filter(tx => tx.symbol === symbol))
  return holdings.length > 0 ? holdings[0] : null
}

/**
 * 格式化日期為本地字串
 */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

/**
 * 格式化金額
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('zh-TW', {
    style: 'currency',
    currency: 'TWD',
    minimumFractionDigits: 2
  }).format(amount)
}
