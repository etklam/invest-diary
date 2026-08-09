/**
 * lib/trade-analytics.ts
 * 集中式交易績效分析引擎
 *
 * 設計原則：
 * - 純函數，無副作用，無 DB 依賴
 * - 使用平均成本法（與 calculateHoldings() 一致）
 * - 所有除法運算前先做零值保護
 * - Decimal 在輸入層轉 number，避免 Prisma runtime 依賴
 */

// ─── 輸入類型 ────────────────────────────────────────────────────────────────

export interface RawTransaction {
  id: string | bigint | number
  symbol: string
  type: 'BUY' | 'SELL'
  /** 可接受 Prisma Decimal（已有 toString/valueOf）或 number */
  quantity: { valueOf(): number } | number
  price: { valueOf(): number } | number
  tradeDate: Date | string
  strategy?: string | null
  emotion?: string | null
}

// ─── 輸出類型 ────────────────────────────────────────────────────────────────

/** 一筆已配對（已關閉）的交易：一次 SELL 對應到的平均成本 */
export interface ClosedTrade {
  id: string
  symbol: string
  sellDate: Date
  sellQuantity: number
  sellPrice: number
  avgCostBasis: number      // 賣出時的平均成本
  realizedPnL: number       // 已實現損益（稅前）
  realizedPnLPct: number    // 已實現損益百分比
  strategy: string | null
  emotion: string | null
}

export interface WinRateResult {
  wins: number
  losses: number
  breakEven: number
  total: number
  winRate: number           // 0–100，N/A 時為 null
}

export interface DrawdownResult {
  maxDrawdownPct: number    // 0–100（正值表示虧損幅度）
  peakValue: number
  troughValue: number
}

export interface SharpeResult {
  sharpe: number | null     // null = 零波動（無法計算）
  avgReturn: number
  stdDev: number
}

export type GroupPeriod = 'month' | 'quarter' | 'year'

export interface PeriodStats {
  period: string            // e.g. "2024-03", "2024-Q1", "2024"
  realizedPnL: number
  tradeCount: number
  winCount: number
  winRate: number           // 0–100
}

// ─── 輔助函數 ────────────────────────────────────────────────────────────────

import {
  normalizeSymbol,
  toDate,
  createPosition,
  applyBuy,
  isPositionClosed,
} from '~/lib/position-state'
import type { SymbolPosition } from '~/lib/position-state'

function toNum(v: { valueOf(): number } | number): number {
  return typeof v === 'number' ? v : Number(v.valueOf())
}

function periodKey(date: Date, period: GroupPeriod): string {
  const y = date.getUTCFullYear()
  const m = date.getUTCMonth() + 1 // 1-12
  if (period === 'year') return `${y}`
  if (period === 'quarter') return `${y}-Q${Math.ceil(m / 3)}`
  return `${y}-${String(m).padStart(2, '0')}`
}

// ─── 核心函數 ────────────────────────────────────────────────────────────────

/**
 * matchTrades
 * 使用平均成本法，將 SELL 交易配對到對應的 BUY 批次，
 * 計算每筆 SELL 的已實現損益。
 *
 * 演算法：
 * 1. 按 tradeDate 升序排序（同日同記錄，以原始順序為次排序）
 * 2. 遇到 BUY → 更新該 symbol 的平均成本和持倉數量
 * 3. 遇到 SELL → 計算 (賣價 - 平均成本) × 數量 為已實現損益
 * 4. SELL 超過持倉數量時，只計算可配對的部分
 */
export function matchTrades(transactions: RawTransaction[]): ClosedTrade[] {
  if (!transactions.length) return []

  const sorted = [...transactions].sort((a, b) => {
    return toDate(a.tradeDate).getTime() - toDate(b.tradeDate).getTime()
  })

  const symbolState = new Map<string, SymbolPosition>()
  const symbolMeta = new Map<string, { strategy: string | null; emotion: string | null }>()
  const closed: ClosedTrade[] = []

  for (const tx of sorted) {
    const sym = normalizeSymbol(tx.symbol)
    const qty = toNum(tx.quantity)
    const price = toNum(tx.price)
    const pos = symbolState.get(sym) ?? createPosition()

    if (tx.type === 'BUY') {
      applyBuy(pos, qty, price)
      symbolState.set(sym, pos)
      const existingMeta = symbolMeta.get(sym) ?? { strategy: null, emotion: null }
      symbolMeta.set(sym, {
        strategy: tx.strategy?.trim() || existingMeta.strategy,
        emotion: tx.emotion?.trim() || existingMeta.emotion,
      })
    } else if (tx.type === 'SELL') {
      if (pos.totalQuantity <= 0) {
        // 無持倉卻賣出（資料問題），跳過
        continue
      }

      const avgCost = pos.totalCost / pos.totalQuantity
      // 只計算有持倉的部分
      const matchedQty = Math.min(qty, pos.totalQuantity)
      const costBasis = matchedQty * avgCost
      const proceeds = matchedQty * price
      const realizedPnL = proceeds - costBasis
      const realizedPnLPct = costBasis > 0 ? (realizedPnL / costBasis) * 100 : 0
      const existingMeta = symbolMeta.get(sym) ?? { strategy: null, emotion: null }

      closed.push({
        id: String(tx.id),
        symbol: sym,
        sellDate: toDate(tx.tradeDate),
        sellQuantity: matchedQty,
        sellPrice: price,
        avgCostBasis: avgCost,
        realizedPnL,
        realizedPnLPct,
        strategy: tx.strategy?.trim() || existingMeta.strategy,
        emotion: tx.emotion?.trim() || existingMeta.emotion,
      })

      // 更新持倉（matchTrades 容忍截斷，不拋錯）
      pos.totalQuantity -= matchedQty
      pos.totalCost -= matchedQty * avgCost
      if (isPositionClosed(pos)) {
        symbolState.delete(sym)
        symbolMeta.delete(sym)
      } else {
        symbolState.set(sym, pos)
      }
    }
  }

  return closed
}

/**
 * calcWinRate
 * 計算勝率。以 realizedPnL > 0 為「贏」，< 0 為「輸」，= 0 為「平手」。
 *
 * 邊界：空陣列時 winRate = 0（不除以零）。
 */
export function calcWinRate(trades: ClosedTrade[]): WinRateResult {
  const wins = trades.filter((t) => t.realizedPnL > 0).length
  const losses = trades.filter((t) => t.realizedPnL < 0).length
  const breakEven = trades.filter((t) => t.realizedPnL === 0).length
  const total = trades.length
  const winRate = total > 0 ? (wins / total) * 100 : 0

  return { wins, losses, breakEven, total, winRate }
}

/**
 * calcMaxDrawdown
 * 計算資金曲線的最大回撤百分比。
 *
 * 輸入：時間序列的資產淨值（equity curve）。
 * 回傳：最大回撤百分比（正值，例如 25.3 表示最多跌了 25.3%）。
 *
 * 邊界：空陣列或單一元素 → drawdown = 0。
 */
export function calcMaxDrawdown(equityCurve: number[]): DrawdownResult {
  if (equityCurve.length < 2) {
    const first = equityCurve[0] ?? 0
    return { maxDrawdownPct: 0, peakValue: first, troughValue: first }
  }

  let peak: number = equityCurve[0]!
  let maxDrawdownPct = 0
  let peakValue: number = equityCurve[0]!
  let troughValue: number = equityCurve[0]!

  for (const value of equityCurve) {
    if (value > peak) {
      peak = value
    }
    const drawdown = peak > 0 ? ((peak - value) / peak) * 100 : 0
    if (drawdown > maxDrawdownPct) {
      maxDrawdownPct = drawdown
      peakValue = peak
      troughValue = value
    }
  }

  return { maxDrawdownPct, peakValue, troughValue }
}

/**
 * calcSharpe
 * 計算夏普比率（年化）。
 *
 * @param returns - 每期收益率陣列（百分比，例如 [2.1, -1.3, 0.8]）
 * @param riskFreeRate - 無風險利率（年化百分比，預設 0）
 * @param periodsPerYear - 每年幾期（日頻=252，月頻=12，預設 12）
 *
 * 邊界：收益率標準差 = 0 → sharpe = null。
 */
export function calcSharpe(
  returns: number[],
  riskFreeRate = 0,
  periodsPerYear = 12
): SharpeResult {
  if (returns.length === 0) {
    return { sharpe: null, avgReturn: 0, stdDev: 0 }
  }

  const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length
  const periodRiskFree = riskFreeRate / periodsPerYear

  const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
  const stdDev = Math.sqrt(variance)

  if (stdDev < 1e-10) {
    return { sharpe: null, avgReturn, stdDev: 0 }
  }

  const sharpe = ((avgReturn - periodRiskFree) / stdDev) * Math.sqrt(periodsPerYear)

  return { sharpe, avgReturn, stdDev }
}

/**
 * groupByPeriod
 * 將已關閉的交易按時間段分群。
 */
export function groupByPeriod(
  trades: ClosedTrade[],
  period: GroupPeriod
): Map<string, ClosedTrade[]> {
  const result = new Map<string, ClosedTrade[]>()

  for (const trade of trades) {
    const key = periodKey(trade.sellDate, period)
    const existing = result.get(key) ?? []
    existing.push(trade)
    result.set(key, existing)
  }

  return result
}

/**
 * calcPeriodStats
 * 將分群後的交易計算每期統計摘要，按時間升序返回。
 */
export function calcPeriodStats(
  grouped: Map<string, ClosedTrade[]>
): PeriodStats[] {
  const result: PeriodStats[] = []

  for (const [period, trades] of grouped) {
    const realizedPnL = trades.reduce((sum, t) => sum + t.realizedPnL, 0)
    const winCount = trades.filter((t) => t.realizedPnL > 0).length
    const winRate = trades.length > 0 ? (winCount / trades.length) * 100 : 0

    result.push({
      period,
      realizedPnL,
      tradeCount: trades.length,
      winCount,
      winRate,
    })
  }

  // 按時間升序排序（lexicographic 對 "2024-01", "2024-Q1", "2024" 格式都有效）
  return result.sort((a, b) => a.period.localeCompare(b.period))
}

/**
 * buildEquityCurve
 * 從已關閉的交易建立資金曲線（累積損益）。
 * 用於 calcMaxDrawdown 的輸入。
 *
 * @param initialCapital - 初始資本（預設 100，只看相對變化）
 */
export function buildEquityCurve(
  trades: ClosedTrade[],
  initialCapital = 100
): number[] {
  if (!trades.length) return [initialCapital]

  // 按日期升序排序
  const sorted = [...trades].sort((a, b) => a.sellDate.getTime() - b.sellDate.getTime())

  let equity = initialCapital
  const curve: number[] = [equity]

  for (const trade of sorted) {
    // 相對於初始資本的損益增量
    equity += trade.realizedPnL
    curve.push(equity)
  }

  return curve
}

/**
 * buildEquityCurveWithDates
 * 同 buildEquityCurve，但每個點帶上日期，方便前端圖表 X 軸使用。
 * cumPnL = 累積已實現損益（不含初始資本偏移，從 0 開始）
 */
export interface EquityCurvePoint {
  date: string    // ISO date string (YYYY-MM-DD)
  cumPnL: number  // 累積損益（從第一筆交易起算，初始為 0）
}

export function buildEquityCurveWithDates(
  trades: ClosedTrade[]
): EquityCurvePoint[] {
  if (!trades.length) return []

  const sorted = [...trades].sort((a, b) => a.sellDate.getTime() - b.sellDate.getTime())

  let cumPnL = 0
  return sorted.map((trade) => {
    cumPnL += trade.realizedPnL
    return {
      date: trade.sellDate.toISOString().slice(0, 10),
      cumPnL: Math.round(cumPnL * 100) / 100,
    }
  })
}
