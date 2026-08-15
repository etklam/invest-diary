import prisma from '~/lib/prisma'
import { calculateHoldings } from '~/lib/position-state'
import { evaluatePortfolioAttention } from '~/lib/portfolio-attention'
import { computePortfolioAggregations, concentration } from '~/lib/stocks-view'
import { fetchQuotesBounded } from '~/lib/market-data/quote'
import { requireUser } from '~/server/utils/auth'
import { handleApiError } from '~/server/utils/error-handler'
import { logger } from '~/lib/logger'
import { readPortfolioTransactions } from '~/server/utils/transaction-read'
import { listCurrentThesisProjections } from '~/server/utils/investment-thesis-queries'
import { serialize } from '~/server/utils/serialize'
import type { PortfolioAttentionResponse } from '~/types/portfolio-attention'

const MAX_ITEMS = 50
type AttentionDiaryRow = {
  id: bigint
  title: string
  reviewDueAt: Date | null
  reviewStatus: string | null
  stockContexts: Array<{ stock: { symbol: string } }>
}

export default defineEventHandler(async (event): Promise<PortfolioAttentionResponse> => {
  const log = logger.stocks.withRequestId(event.context.requestId)
  try {
    const user = requireUser(event)
    const userId = BigInt(user.id)
    const asOf = new Date()
    const holdings = calculateHoldings(await readPortfolioTransactions(userId))
    const { quotes } = await fetchQuotesBounded(holdings.map(holding => holding.symbol))

    const enrichedHoldings = holdings.map(holding => {
      const quote = quotes.get(holding.symbol)
      return quote ? { ...holding, price: quote.regularMarketPrice } : holding
    })
    const valuation = computePortfolioAggregations(enrichedHoldings)
    // Attention concentration is explicitly market-value basis, computed over
    // the priced subset — a missing quote excludes that holding from numerator
    // and denominator instead of nulling the whole portfolio.
    const concentrationBySymbol = concentration(enrichedHoldings, { basis: 'market_value' })

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
      holdings: holdings.map(holding => ({
        symbol: holding.symbol,
        quantity: holding.quantity,
        concentrationPct: concentrationBySymbol.get(holding.symbol) ?? null,
      })),
      theses: theses.map(thesis => ({
        symbol: thesis.stock.symbol,
        status: thesis.status,
        reviewDueAt: thesis.reviewDueAt,
        lastReviewedAt: thesis.lastReviewedAt,
        latestOutcome: thesis.latestReviewOutcome,
      })),
      diaryReviews: diaryReviews.map(review => ({
        id: String(review.id),
        title: review.title,
        reviewDueAt: review.reviewDueAt,
        reviewStatus: review.reviewStatus,
        symbol: review.stockContexts[0]?.stock.symbol ?? null,
      })),
    })
    return serialize({
      items,
      asOf: asOf.toISOString(),
      coverage: {
        valuationStatus: valuation.valuationStatus,
        complete: valuation.valuationStatus === 'complete' || valuation.valuationStatus === 'empty',
        priced: valuation.pricedPositionCount,
        total: valuation.totalHoldings,
      },
    })
  } catch (error) {
    handleApiError(error, log)
  }
})
