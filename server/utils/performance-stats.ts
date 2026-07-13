/**
 * server/utils/performance-stats.ts
 *
 * 純計算層：接收 Prisma 原始交易紀錄與設定，回傳完整的績效統計結果。
 * 無 DB、無 HTTP 依賴，方便單元測試。
 */

import {
  matchTrades,
  calcWinRate,
  calcMaxDrawdown,
  calcSharpe,
  groupByPeriod,
  calcPeriodStats,
  buildEquityCurve,
  buildEquityCurveWithDates,
  type GroupPeriod,
  type ClosedTrade,
} from '~/lib/trade-analytics'

// ─── 輸入型別 ──────────────────────────────────────────────────────────────────

export interface RawTransactionRecord {
  id: bigint | string | number
  symbol: string
  type: string
  quantity: { valueOf(): number } | number
  price: { valueOf(): number } | number
  tradeDate: Date
  strategy?: string | null
  emotion?: string | null
}

export interface PerformanceConfig {
  period: GroupPeriod
}

// ─── 輸出型別 ──────────────────────────────────────────────────────────────────

export interface FormattedTrade {
  id: string
  symbol: string
  sellDate: Date
  sellQuantity: number
  sellPrice: number
  avgCostBasis: number
  realizedPnL: number
  realizedPnLPct: number
  strategy: string | null
  emotion: string | null
}

export interface SymbolBreakdownEntry {
  symbol: string
  tradeCount: number
  realizedPnL: number
  winRate: number
}

export interface AttributeBreakdownEntry {
  name: string
  tradeCount: number
  realizedPnL: number
  winRate: number
}

export interface PerformanceSummary {
  totalClosedTrades: number
  totalRealizedPnL: number
  winRate: number
  wins: number
  losses: number
  maxDrawdownPct: number
  sharpe: number | null
}

export interface PerformanceResult {
  summary: PerformanceSummary
  periodStats: ReturnType<typeof calcPeriodStats>
  equityCurve: ReturnType<typeof buildEquityCurveWithDates>
  topWins: FormattedTrade[]
  topLosses: FormattedTrade[]
  symbolBreakdown: SymbolBreakdownEntry[]
  strategyBreakdown: AttributeBreakdownEntry[]
  emotionBreakdown: AttributeBreakdownEntry[]
  bestStrategy: AttributeBreakdownEntry | null
  worstStrategy: AttributeBreakdownEntry | null
}

// ─── 空結果 ────────────────────────────────────────────────────────────────────

const EMPTY_RESULT: PerformanceResult = {
  summary: {
    totalClosedTrades: 0,
    totalRealizedPnL: 0,
    winRate: 0,
    wins: 0,
    losses: 0,
    maxDrawdownPct: 0,
    sharpe: null,
  },
  periodStats: [],
  equityCurve: [],
  topWins: [],
  topLosses: [],
  symbolBreakdown: [],
  strategyBreakdown: [],
  emotionBreakdown: [],
  bestStrategy: null,
  worstStrategy: null,
}

// ─── Helper ────────────────────────────────────────────────────────────────────

function formatTrade(t: ClosedTrade): FormattedTrade {
  return {
    id: t.id,
    symbol: t.symbol,
    sellDate: t.sellDate,
    sellQuantity: t.sellQuantity,
    sellPrice: t.sellPrice,
    avgCostBasis: t.avgCostBasis,
    realizedPnL: t.realizedPnL,
    realizedPnLPct: t.realizedPnLPct,
    strategy: t.strategy,
    emotion: t.emotion,
  }
}

function buildAttributeBreakdown(
  closedTrades: ClosedTrade[],
  attribute: 'strategy' | 'emotion',
): AttributeBreakdownEntry[] {
  const groups = new Map<string, { realizedPnL: number; trades: ClosedTrade[] }>()

  for (const trade of closedTrades) {
    const name = trade[attribute]?.trim()
    if (!name) continue

    const existing = groups.get(name) ?? { realizedPnL: 0, trades: [] }
    existing.realizedPnL += trade.realizedPnL
    existing.trades.push(trade)
    groups.set(name, existing)
  }

  return Array.from(groups.entries())
    .map(([name, data]) => {
      const winRate = calcWinRate(data.trades)
      return {
        name,
        tradeCount: data.trades.length,
        realizedPnL: data.realizedPnL,
        winRate: winRate.winRate,
      }
    })
    .sort((a, b) => b.realizedPnL - a.realizedPnL || b.tradeCount - a.tradeCount || a.name.localeCompare(b.name))
}

// ─── 主函數 ────────────────────────────────────────────────────────────────────

export function computePerformanceStats(
  rawTxs: RawTransactionRecord[],
  config: PerformanceConfig,
): PerformanceResult {
  if (!rawTxs.length) return EMPTY_RESULT

  const closedTrades = matchTrades(
    rawTxs.map((tx) => ({
      ...tx,
      id: tx.id.toString(),
      type: tx.type as 'BUY' | 'SELL',
    })),
  )

  const winRateResult = calcWinRate(closedTrades)
  const equityCurve = buildEquityCurve(closedTrades)
  const drawdownResult = calcMaxDrawdown(equityCurve)
  const equityCurveWithDates = buildEquityCurveWithDates(closedTrades)

  const grouped = groupByPeriod(closedTrades, 'month')
  const periodStatsResult = calcPeriodStats(grouped)
  const monthlyReturns = periodStatsResult.map((p) => p.realizedPnL)
  const sharpeResult = calcSharpe(monthlyReturns)

  const requestedGrouped =
    config.period === 'month' ? grouped : groupByPeriod(closedTrades, config.period)
  const requestedPeriodStats =
    config.period === 'month'
      ? periodStatsResult
      : calcPeriodStats(requestedGrouped)

  const sortedByPnL = [...closedTrades].sort((a, b) => b.realizedPnL - a.realizedPnL)
  const topWins = sortedByPnL.slice(0, 5).filter((t) => t.realizedPnL > 0)
  const topLosses = [...closedTrades]
    .sort((a, b) => a.realizedPnL - b.realizedPnL)
    .slice(0, 5)
    .filter((t) => t.realizedPnL < 0)

  const symbolMap = new Map<string, { realizedPnL: number; trades: ClosedTrade[] }>()
  for (const trade of closedTrades) {
    const existing = symbolMap.get(trade.symbol) ?? { realizedPnL: 0, trades: [] }
    existing.realizedPnL += trade.realizedPnL
    existing.trades.push(trade)
    symbolMap.set(trade.symbol, existing)
  }
  const symbolBreakdown: SymbolBreakdownEntry[] = Array.from(symbolMap.entries())
    .map(([symbol, data]) => {
      const wr = calcWinRate(data.trades)
      return {
        symbol,
        tradeCount: data.trades.length,
        realizedPnL: data.realizedPnL,
        winRate: wr.winRate,
      }
    })
    .sort((a, b) => b.realizedPnL - a.realizedPnL)
  const strategyBreakdown = buildAttributeBreakdown(closedTrades, 'strategy')
  const emotionBreakdown = buildAttributeBreakdown(closedTrades, 'emotion')

  return {
    summary: {
      totalClosedTrades: closedTrades.length,
      totalRealizedPnL: closedTrades.reduce((s, t) => s + t.realizedPnL, 0),
      winRate: winRateResult.winRate,
      wins: winRateResult.wins,
      losses: winRateResult.losses,
      maxDrawdownPct: drawdownResult.maxDrawdownPct,
      sharpe: sharpeResult.sharpe,
    },
    periodStats: requestedPeriodStats,
    equityCurve: equityCurveWithDates,
    topWins: topWins.map(formatTrade),
    topLosses: topLosses.map(formatTrade),
    symbolBreakdown,
    strategyBreakdown,
    emotionBreakdown,
    bestStrategy: strategyBreakdown[0] ?? null,
    worstStrategy: strategyBreakdown.length
      ? [...strategyBreakdown].sort((a, b) => a.realizedPnL - b.realizedPnL || b.tradeCount - a.tradeCount || a.name.localeCompare(b.name))[0]!
      : null,
  }
}
