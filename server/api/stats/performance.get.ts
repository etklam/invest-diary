/**
 * GET /api/stats/performance
 *
 * 返回當前用戶的交易績效統計：
 * - 整體指標：勝率、總已實現損益、最大回撤、夏普比率
 * - 按月分群的損益時間序列（用於圖表）
 * - 最佳/最差的前 5 筆交易
 * - 按 symbol 彙總的績效
 *
 * Query params:
 *   period?: 'month' | 'quarter' | 'year'  (預設 'month')
 *   symbol?: string                          (可選，只分析指定股票)
 */
import prisma from '~/lib/prisma'
import { Errors } from '~/lib/errors/factory'
import { logger } from '~/lib/logger'
import { requireUser } from '~/server/utils/auth'
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

const VALID_PERIODS: GroupPeriod[] = ['month', 'quarter', 'year']

export default defineEventHandler(async (event) => {
  const log = logger.stocks.withRequestId(event.context.requestId)
  const user = requireUser(event)

  const query = getQuery(event)
  const period: GroupPeriod = VALID_PERIODS.includes(query.period as GroupPeriod)
    ? (query.period as GroupPeriod)
    : 'month'
  const symbolFilter = typeof query.symbol === 'string'
    ? query.symbol.trim().toUpperCase()
    : null

  try {
    // 單次查詢拿全部交易（個人投資者量級 100–1000 筆，記憶體計算足夠）
    // 優先用 userId 欄位（Phase 1-1 加的去正規化 FK），若為 null 則回退 diary JOIN
    const userId = BigInt(user.id)

    const rawTxs = await prisma.transaction.findMany({
      where: {
        OR: [
          { userId },
          { diary: { userId } },
        ],
        ...(symbolFilter ? { symbol: symbolFilter } : {}),
      },
      select: {
        id: true,
        symbol: true,
        type: true,
        quantity: true,
        price: true,
        tradeDate: true,
      },
      orderBy: { tradeDate: 'asc' },
    })

    if (!rawTxs.length) {
      return {
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
      }
    }

    // 核心計算
    const closedTrades = matchTrades(rawTxs.map((tx: typeof rawTxs[number]) => ({
      ...tx,
      id: tx.id.toString(),
      type: tx.type as 'BUY' | 'SELL',
    })))

    const winRateResult = calcWinRate(closedTrades)
    const equityCurve = buildEquityCurve(closedTrades)
    const drawdownResult = calcMaxDrawdown(equityCurve)
    const equityCurveWithDates = buildEquityCurveWithDates(closedTrades)

    // 月度收益率序列（用於夏普計算）
    const grouped = groupByPeriod(closedTrades, 'month')
    const periodStatsResult = calcPeriodStats(grouped)
    const monthlyReturns = periodStatsResult.map(p => p.realizedPnL)
    const sharpeResult = calcSharpe(monthlyReturns)

    // 分群統計（按請求的 period）
    const requestedGrouped = period === 'month' ? grouped : groupByPeriod(closedTrades, period)
    const requestedPeriodStats = period === 'month' ? periodStatsResult : calcPeriodStats(requestedGrouped)

    // 最佳 / 最差 5 筆
    const sortedByPnL = [...closedTrades].sort((a, b) => b.realizedPnL - a.realizedPnL)
    const topWins = sortedByPnL.slice(0, 5).filter(t => t.realizedPnL > 0)
    const topLosses = [...closedTrades]
      .sort((a, b) => a.realizedPnL - b.realizedPnL)
      .slice(0, 5)
      .filter(t => t.realizedPnL < 0)

    // 按 symbol 彙總
    const symbolMap = new Map<string, { realizedPnL: number; trades: ClosedTrade[] }>()
    for (const trade of closedTrades) {
      const existing = symbolMap.get(trade.symbol) ?? { realizedPnL: 0, trades: [] }
      existing.realizedPnL += trade.realizedPnL
      existing.trades.push(trade)
      symbolMap.set(trade.symbol, existing)
    }
    const symbolBreakdown = Array.from(symbolMap.entries())
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

    log.debug('Performance stats calculated', {
      userId: user.id,
      closedTrades: closedTrades.length,
      period,
    })

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
    }
  } catch (error) {
    log.error('Failed to calculate performance stats', { userId: user.id, error: String(error) })
    throw Errors.internalError(error).toH3Error()
  }
})

function formatTrade(t: ClosedTrade) {
  return {
    id: t.id,
    symbol: t.symbol,
    sellDate: t.sellDate,
    sellQuantity: t.sellQuantity,
    sellPrice: t.sellPrice,
    avgCostBasis: t.avgCostBasis,
    realizedPnL: t.realizedPnL,
    realizedPnLPct: t.realizedPnLPct,
  }
}
