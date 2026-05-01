/**
 * GET /api/stats/drawdown
 *
 * 返回當前用戶的投資組合回撤狀態。比較所有 PortfolioSnapshot，
 * 計算從歷史峰值（最高總市值）到最新快照的回撤百分比。
 *
 * Query params:
 *   threshold?: number  回撤警報閾值（百分比，預設 10）
 *
 * Response:
 *   {
 *     hasAlert: boolean            // 是否超過閾值
 *     drawdownPct: number          // 當前回撤百分比
 *     peakValue: number            // 歷史最高總市值
 *     currentValue: number         // 當前總市值
 *     peakDate: string             // 峰值日期 (YYYY-MM-DD)
 *     currentDate: string          // 當前快照日期 (YYYY-MM-DD)
 *     benchmarkSymbol: string      // 基準指數代號
 *     snapshotCount: number        // 快照總數
 *     threshold: number            // 請求時的閾值
 *   }
 */
import { ErrorCodes } from '~/lib/errors/codes'
import { Errors } from '~/lib/errors/factory'
import { logger } from '~/lib/logger'
import { requireUser } from '~/server/utils/auth'
import { getDrawdownStatus } from '~/server/utils/drawdown-alerts'

export default defineEventHandler(async (event) => {
  const log = logger.api.withRequestId(event.context.requestId)
  const user = requireUser(event)
  const userId = BigInt(user.id)

  const query = getQuery(event)
  const threshold = Number(query.threshold)
  const thresholdPct = Number.isFinite(threshold) && threshold > 0 ? threshold : 10

  try {
    const status = await getDrawdownStatus(userId)

    if (!status) {
      return {
        hasAlert: false,
        drawdownPct: 0,
        peakValue: 0,
        currentValue: 0,
        peakDate: null,
        currentDate: null,
        benchmarkSymbol: 'SPY',
        snapshotCount: 0,
        threshold: thresholdPct,
        message: 'Not enough portfolio snapshots to calculate drawdown',
      }
    }

    const hasAlert = status.drawdownPct >= thresholdPct

    log.debug('Drawdown status returned', {
      userId: user.id,
      drawdownPct: status.drawdownPct,
      hasAlert,
    })

    return {
      hasAlert,
      ...status,
      threshold: thresholdPct,
      message: hasAlert
        ? `Portfolio drawdown of ${status.drawdownPct}% exceeds threshold of ${thresholdPct}%`
        : `Portfolio drawdown of ${status.drawdownPct}% is within threshold of ${thresholdPct}%`,
    }
  } catch (error) {
    log.error('Failed to get drawdown status', {
      userId: user.id,
      error: String(error),
    })
    throw Errors.internalError(error).toH3Error()
  }
})
