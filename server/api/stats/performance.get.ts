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
import { computePerformanceStats, type PerformanceConfig } from '~/server/utils/performance-stats'
import type { GroupPeriod } from '~/lib/trade-analytics'

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

    const result = computePerformanceStats(rawTxs, { period } as PerformanceConfig)

    log.debug('Performance stats calculated', {
      userId: user.id,
      closedTrades: result.summary.totalClosedTrades,
      period,
    })

    return result
  } catch (error) {
    log.error('Failed to calculate performance stats', { userId: user.id, error: String(error) })
    throw Errors.internalError(error).toH3Error()
  }
})
