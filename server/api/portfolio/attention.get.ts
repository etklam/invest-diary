import prisma from '~/lib/prisma'
import { fetchQuote } from '~/lib/yahoo-finance'
import { calculateHoldings } from '~/lib/position-state'
import { evaluatePortfolioAttention } from '~/lib/portfolio-attention'
import { buildMarketQuoteCacheKey, getMarketDataCacheTtlSeconds, getOrSetCached } from '~/lib/market-data/cache'
import { requireUser } from '~/server/utils/auth'
import { handleApiError } from '~/server/utils/error-handler'
import { logger } from '~/lib/logger'
import { readPortfolioTransactions } from '~/server/utils/transaction-read'
import { listCurrentThesisProjections } from '~/server/utils/investment-thesis-queries'

const MAX_ITEMS = 50
type AttentionDiaryRow = {
  id: bigint
  title: string
  reviewDueAt: Date | null
  reviewStatus: string | null
  stockContexts: Array<{ stock: { symbol: string } }>
}

export default defineEventHandler(async (event) => {
  const log = logger.stocks.withRequestId(event.context.requestId)
  try {
    const user = requireUser(event)
    const userId = BigInt(user.id)
    const asOf = new Date()
    const holdings = calculateHoldings(await readPortfolioTransactions(userId))
    const quotes = new Map<string, { price: number }>()
    await Promise.all(holdings.map(async holding => {
      try {
        const quote = await getOrSetCached(
          buildMarketQuoteCacheKey(holding.symbol),
          getMarketDataCacheTtlSeconds('quote'),
          () => fetchQuote(holding.symbol),
        )
        if (quote?.regularMarketPrice != null) quotes.set(holding.symbol, { price: quote.regularMarketPrice })
      } catch (error) {
        log.warn('Attention quote unavailable', { symbol: holding.symbol, error })
      }
    }))

    const pricedValue = holdings.reduce((sum, holding) => {
      const quote = quotes.get(holding.symbol)
      return sum + (quote ? quote.price * holding.quantity : 0)
    }, 0)
    const completeCoverage = holdings.length === 0 || quotes.size === holdings.length
    const diaryReviews = await prisma.diary.findMany({
      where: { userId, reviewStatus: { not: 'reviewed' }, reviewDueAt: { not: null } },
      orderBy: [{ reviewDueAt: 'asc' }, { id: 'asc' }],
      take: 100,
      select: {
        id: true,
        title: true,
        reviewDueAt: true,
        reviewStatus: true,
        stockContexts: { select: { stock: { select: { symbol: true } } } },
      },
    }) as unknown as AttentionDiaryRow[]
    const theses = await listCurrentThesisProjections(userId)
    const items = evaluatePortfolioAttention({
      asOf,
      maxItems: MAX_ITEMS,
      holdings: holdings.map(holding => {
        const quote = quotes.get(holding.symbol)
        const marketValue = quote ? quote.price * holding.quantity : null
        return {
          symbol: holding.symbol,
          quantity: holding.quantity,
          concentrationPct: completeCoverage && pricedValue > 0 && marketValue !== null ? (marketValue / pricedValue) * 100 : null,
        }
      }),
      theses: theses.map(thesis => ({
        symbol: thesis.stock.symbol,
        status: thesis.status,
        reviewDueAt: thesis.reviewDueAt,
        latestOutcome: thesis.latestReviewOutcome,
      })),
      diaryReviews: diaryReviews.map(review => ({
        id: review.id.toString(),
        title: review.title,
        reviewDueAt: review.reviewDueAt,
        reviewStatus: review.reviewStatus,
        symbol: review.stockContexts[0]?.stock.symbol ?? null,
      })),
    })
    return { items, asOf: asOf.toISOString(), coverage: { complete: completeCoverage, priced: quotes.size, total: holdings.length } }
  } catch (error) {
    handleApiError(error, log)
  }
})
