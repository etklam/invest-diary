interface Move4PctPrice {
  close: number
  previousClose: number
}

interface MovingAveragePrice {
  close: number
  sma: number
}

interface BreadthHistoryItem {
  up4Count: number
  down4Count: number
}

/** Minimum universe coverage for a breadth snapshot to be considered fresh. */
export const MARKET_BREADTH_MIN_COVERAGE_PCT = 90

function isFiniteNumber(value: number): boolean {
  return Number.isFinite(value)
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

// 計算單日漲跌幅超過 4% 的股票數量。
export function countMove4Pct(prices: Move4PctPrice[]): { up4Count: number; down4Count: number } {
  return prices.reduce(
    (counts, price) => {
      if (!isFiniteNumber(price.close) || !isFiniteNumber(price.previousClose) || price.previousClose <= 0) {
        return counts
      }

      const dailyReturn = price.close / price.previousClose - 1
      if (dailyReturn >= 0.04) counts.up4Count += 1
      if (dailyReturn <= -0.04) counts.down4Count += 1

      return counts
    },
    { up4Count: 0, down4Count: 0 },
  )
}

// 以 universeCount 為分母，計算收盤價高於均線的百分比。
export function calcAboveMaPct(prices: MovingAveragePrice[], universeCount: number): number {
  if (universeCount <= 0 || prices.length === 0) return 0

  const aboveCount = prices.filter(price =>
    isFiniteNumber(price.close) && isFiniteNumber(price.sma) && price.close > price.sma,
  ).length

  return clamp((aboveCount / universeCount) * 100, 0, 100)
}

// 計算最近 N 天 up4 總和 / down4 總和；down4 為 0 時用 1 保護除零。
export function calcRatioNDaily(breadthHistory: BreadthHistoryItem[], days: number): number {
  if (days <= 0 || breadthHistory.length === 0) return 0

  const recentHistory = breadthHistory.slice(-days)
  const totals = recentHistory.reduce(
    (sum, item) => ({
      up4Count: sum.up4Count + Math.max(item.up4Count, 0),
      down4Count: sum.down4Count + Math.max(item.down4Count, 0),
    }),
    { up4Count: 0, down4Count: 0 },
  )

  return totals.up4Count / Math.max(totals.down4Count, 1)
}
