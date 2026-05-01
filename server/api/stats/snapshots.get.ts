/**
 * GET /api/stats/snapshots
 *
 * 回傳當前用戶的持倉歷史快照列表，用於繪製持倉歷史趨勢圖。
 *
 * 計算邏輯：
 * - portfolioReturnPct：以第一筆快照的 totalCost 為基準，計算當前相對報酬率
 * - benchmarkReturnPct：以第一筆快照的 benchmarkPrice 為基準，計算基準指數相對漲幅
 *
 * Query params:
 *   limit?: number  最多回傳幾筆（預設 90，上限 365）
 *
 * Response:
 *   {
 *     snapshots: {
 *       id: string
 *       snapshotDate: string      // YYYY-MM-DD
 *       totalCost: number
 *       totalMarketValue: number
 *       unrealizedPnL: number     // totalMarketValue - totalCost
 *       portfolioReturnPct: number // (totalMarketValue - firstTotalCost) / firstTotalCost * 100
 *       benchmarkPrice: number
 *       benchmarkReturnPct: number // (benchmarkPrice - firstBenchmarkPrice) / firstBenchmarkPrice * 100
 *       holdingsCount: number
 *     }[]
 *     benchmarkSymbol: string
 *   }
 */
import prisma from '~/lib/prisma'
import { Errors } from '~/lib/errors/factory'
import { requireUser } from '~/server/utils/auth'
import { logger } from '~/lib/logger'

export default defineEventHandler(async (event) => {
  const log = logger.api.withRequestId(event.context.requestId)
  const user = requireUser(event)
  const userId = BigInt(user.id)

  const query = getQuery(event)
  const rawLimit = Number(query.limit)
  const limit = Number.isFinite(rawLimit) && rawLimit > 0
    ? Math.min(rawLimit, 365)
    : 90

  try {
    const rows = await (prisma as any).portfolioSnapshot.findMany({
      where: { userId },
      orderBy: { snapshotDate: 'asc' },
      take: limit,
    })

    if (!rows.length) {
      return { snapshots: [], benchmarkSymbol: 'SPY' }
    }

    // 以第一筆快照作為基準（index-based 報酬率計算）
    const firstTotalCost = Number(rows[0].totalCost)
    const firstBenchmarkPrice = Number(rows[0].benchmarkPrice)
    const benchmarkSymbol: string = rows[0].benchmarkSymbol ?? 'SPY'

    const snapshots = rows.map((row: {
      id: bigint
      snapshotDate: Date
      totalCost: { valueOf(): number } | number
      totalMarketValue: { valueOf(): number } | number
      benchmarkPrice: { valueOf(): number } | number
      holdingsJson: string
      benchmarkSymbol: string
    }) => {
      const totalCost = Number(row.totalCost)
      const totalMarketValue = Number(row.totalMarketValue)
      const benchmarkPrice = Number(row.benchmarkPrice)
      const unrealizedPnL = totalMarketValue - totalCost

      const portfolioReturnPct = firstTotalCost > 0
        ? ((totalMarketValue - firstTotalCost) / firstTotalCost) * 100
        : 0

      const benchmarkReturnPct = firstBenchmarkPrice > 0
        ? ((benchmarkPrice - firstBenchmarkPrice) / firstBenchmarkPrice) * 100
        : 0

      let holdingsCount = 0
      try {
        holdingsCount = JSON.parse(row.holdingsJson).length
      } catch { /* noop */ }

      return {
        id: row.id.toString(),
        snapshotDate: row.snapshotDate instanceof Date
          ? row.snapshotDate.toISOString().slice(0, 10)
          : String(row.snapshotDate).slice(0, 10),
        totalCost: Math.round(totalCost * 100) / 100,
        totalMarketValue: Math.round(totalMarketValue * 100) / 100,
        unrealizedPnL: Math.round(unrealizedPnL * 100) / 100,
        portfolioReturnPct: Math.round(portfolioReturnPct * 100) / 100,
        benchmarkPrice: Math.round(benchmarkPrice * 10000) / 10000,
        benchmarkReturnPct: Math.round(benchmarkReturnPct * 100) / 100,
        holdingsCount,
      }
    })

    return { snapshots, benchmarkSymbol }
  } catch (error) {
    throw Errors.internalError(error).toH3Error()
  }
})
