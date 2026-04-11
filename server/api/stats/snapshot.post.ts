/**
 * POST /api/stats/snapshot
 *
 * 為當前用戶建立一筆持倉歷史快照：
 * 1. 計算當前持倉（所有未平倉的 BUY-SELL 匹配後的剩餘部位）
 * 2. 抓取每支持倉股票的最新報價 → 計算 totalMarketValue
 * 3. 抓取基準指數（預設 SPY）的最新報價
 * 4. 儲存至 portfolio_snapshots table（同一日期只能一筆，重複則覆蓋）
 *
 * Response:
 *   { id, snapshotDate, totalCost, totalMarketValue, benchmarkPrice, holdingsCount }
 */
import prisma from '~/lib/prisma'
import { Errors } from '~/lib/errors/factory'
import { logger } from '~/lib/logger'
import { requireUser } from '~/server/utils/auth'
import { calculateHoldings } from '~/lib/utils'
import { fetchQuote } from '~/lib/yahoo-finance'

const BENCHMARK_SYMBOL = 'SPY'

interface SnapshotRawTransactionRow {
  id: bigint
  symbol: string
  type: 'BUY' | 'SELL'
  quantity: { valueOf(): number } | number
  price: { valueOf(): number } | number
  tradeDate: Date
}

export default defineEventHandler(async (event) => {
  const log = logger.stocks.withRequestId(event.context.requestId)
  const user = requireUser(event)
  const userId = BigInt(user.id)

  try {
    // 1. 取得所有交易記錄
    const rawTxs = await prisma.transaction.findMany({
      where: {
        OR: [
          { userId },
          { diary: { userId } },
        ],
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

    // 2. 計算當前持倉（平均成本法）
    const holdings = calculateHoldings(
      rawTxs.map((tx: SnapshotRawTransactionRow) => ({
        ...tx,
        type: tx.type,
      }))
    )

    // 3. 抓取每支持倉的最新報價（平行請求）
    let totalMarketValue = 0
    const holdingDetails: {
      symbol: string
      quantity: number
      avgCost: number
      latestPrice: number
    }[] = []

    await Promise.all(
      holdings.map(async (h) => {
        try {
          const quote = await fetchQuote(h.symbol)
          const latestPrice = quote.regularMarketPrice
          totalMarketValue += h.quantity * latestPrice
          holdingDetails.push({
            symbol: h.symbol,
            quantity: h.quantity,
            avgCost: h.avgCost,
            latestPrice,
          })
        } catch {
          // 若某支股票報價失敗，用平均成本估算（保守估計）
          totalMarketValue += h.totalCost
          holdingDetails.push({
            symbol: h.symbol,
            quantity: h.quantity,
            avgCost: h.avgCost,
            latestPrice: h.avgCost,
          })
        }
      })
    )

    // 4. 抓取基準指數報價
    let benchmarkPrice = 0
    try {
      const benchmarkQuote = await fetchQuote(BENCHMARK_SYMBOL)
      benchmarkPrice = benchmarkQuote.regularMarketPrice
    } catch {
      // 若基準指數報價失敗，記錄 0（前端可過濾不顯示）
      log.warn?.('Benchmark quote fetch failed, storing 0', { symbol: BENCHMARK_SYMBOL })
    }

    // 5. 計算 totalCost（持倉成本總和）
    const totalCost = holdings.reduce((sum, h) => sum + h.totalCost, 0)

    // 6. 今日日期（不含時間，作為唯一鍵）
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)

    // 7. upsert 快照（同一天只保留最新的）
    const snapshot = await (prisma as any).portfolioSnapshot.upsert({
      where: {
        userId_snapshotDate: {
          userId,
          snapshotDate: today,
        },
      },
      update: {
        totalCost,
        totalMarketValue,
        holdingsJson: JSON.stringify(holdingDetails),
        benchmarkPrice,
      },
      create: {
        userId,
        snapshotDate: today,
        totalCost,
        totalMarketValue,
        holdingsJson: JSON.stringify(holdingDetails),
        benchmarkSymbol: BENCHMARK_SYMBOL,
        benchmarkPrice,
      },
    })

    log.debug('Portfolio snapshot saved', {
      userId: user.id,
      snapshotDate: today.toISOString().slice(0, 10),
      holdingsCount: holdingDetails.length,
      totalCost,
      totalMarketValue,
    })

    return {
      id: snapshot.id.toString(),
      snapshotDate: today.toISOString().slice(0, 10),
      totalCost,
      totalMarketValue,
      benchmarkSymbol: BENCHMARK_SYMBOL,
      benchmarkPrice,
      holdingsCount: holdingDetails.length,
    }
  } catch (error) {
    log.error('Failed to create portfolio snapshot', { userId: user.id, error: String(error) })
    throw Errors.internalError(error).toH3Error()
  }
})
