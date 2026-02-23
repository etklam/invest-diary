// ❌ 不要從 prisma runtime 匯入（會被 Vite client bundle）
// ✅ 僅用於型別，改用 Prisma namespace
import type { Prisma } from '@prisma/client'

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
 * 平均成本 = (買入總成本 - 賣出總成本) / (買入總數量 - 賣出總數量)
 *
 * 效能優化：只接受計算所需的欄位，避免載入完整的 Transaction 類型
 */
export function calculateHoldings(transactions: TransactionForHolding[]): Holding[] {
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
 * 格式化日期為本地字串（支援時區）
 * @param date 日期
 * @param timezone 時區（可選），預設為 Asia/Taipei
 */
export function formatDate(date: Date | string, timezone?: string): string {
  const tz = timezone || 'Asia/Taipei'
  return new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: tz
  }).format(new Date(date))
}

/**
 * 格式化簡短日期 (年/月/日)（支援時區）
 * @param date 日期
 * @param timezone 時區（可選），預設為 Asia/Taipei
 */
export function formatShortDate(date: Date | string, timezone?: string): string {
  const tz = timezone || 'Asia/Taipei'
  const dateObj = new Date(date)

  // Use Intl.DateTimeFormat for timezone support
  const formatter = new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: tz
  })

  // Format and replace slashes to get consistent format
  return formatter.format(dateObj).replace(/\//g, '/')
}

/**
 * 格式化日期帶星期 (年/月/日 (週X))（支援時區）
 * @param date 日期
 * @param timezone 時區（可選），預設為 Asia/Taipei
 */
export function formatDateWithWeekday(date: Date | string, timezone?: string): string {
  const tz = timezone || 'Asia/Taipei'
  const dateObj = new Date(date)

  // Get formatted date
  const formattedDate = formatShortDate(date, tz)

  // Get weekday from the date (weekday is not timezone-dependent)
  const weekdays = ['日', '一', '二', '三', '四', '五', '六']
  const weekday = weekdays[dateObj.getDay()]

  return `${formattedDate} (${weekday})`
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
