/**
 * GET /api/stats/recent-trades
 *
 * 返回用戶最近 30 天的已關閉交易（已配對的 BUY/SELL），
 * 供 Quick Note reflection 模板選擇器使用。
 *
 * Query params:
 *   days?: number  (預設 30，最大 90)
 *   limit?: number (預設 50，最大 100)
 */
import { handleApiError } from '~/server/utils/error-handler'
import { logger } from '~/lib/logger'
import { requireUser } from '~/server/utils/auth'
import { matchTrades } from '~/lib/trade-analytics'
import { serialize } from '~/server/utils/serialize'
import { readPortfolioTransactions } from '~/server/utils/transaction-read'
import type { RecentClosedTradesResponse } from '~/types/quicknote'

export default defineEventHandler(async (event): Promise<RecentClosedTradesResponse> => {
  const log = logger.stocks.withRequestId(event.context.requestId)
  const user = requireUser(event)

  const query = getQuery(event)
  const daysRaw = Number(query.days)
  const days = Number.isFinite(daysRaw) && daysRaw > 0 ? Math.min(daysRaw, 90) : 30
  const limitRaw = Number(query.limit)
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 100) : 50

  try {
    const userId = BigInt(user.id)

    // 先抓「視窗期前所有 BUY」以正確計算平均成本，再過濾賣出日期
    // 策略：取所有交易，matchTrades，然後篩選 sellDate 在視窗內的
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)

    // 查詢所有交易（計算用，不限時間範圍）
    const rawTxs = await readPortfolioTransactions(userId)

    if (!rawTxs.length) {
      return serialize({ trades: [] })
    }

    const closedTrades = matchTrades(rawTxs)

    // 過濾視窗期內的賣出交易，並取最新的前 N 筆
    const recentTrades = closedTrades
      .filter(t => t.sellDate >= cutoff)
      .sort((a, b) => b.sellDate.getTime() - a.sellDate.getTime())
      .slice(0, limit)
      .map(t => ({
        id: t.id,
        symbol: t.symbol,
        sellDate: t.sellDate.toISOString(),
        sellQuantity: t.sellQuantity,
        realizedPnL: Math.round(t.realizedPnL * 100) / 100,
        realizedPnLPct: Math.round(t.realizedPnLPct * 100) / 100,
      }))

    log.debug('Recent closed trades fetched', {
      userId: user.id,
      days,
      count: recentTrades.length,
    })

    return serialize({ trades: recentTrades })
  } catch (error) {
    handleApiError(error, log)
  }
})
