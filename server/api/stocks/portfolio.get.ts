import { logger } from '~/lib/logger'
import { fetchQuotesBounded } from '~/lib/market-data/quote'
import { calculateHoldings } from '~/lib/position-state'
import {
  computePortfolioAggregations,
  type HoldingViewInput,
  type PortfolioValuationResponse,
} from '~/lib/stocks-view'
import { requireUser } from '~/server/utils/auth'
import { handleApiError } from '~/server/utils/error-handler'
import { readPortfolioTransactions } from '~/server/utils/transaction-read'

/**
 * Owner-scoped Portfolio projection. Quote failures are data quality, not a
 * reason to discard the Transaction-derived holdings.
 */
export default defineEventHandler(async (event): Promise<PortfolioValuationResponse | void> => {
  const log = logger.stocks.withRequestId(event.context.requestId)
  const user = requireUser(event)

  try {
    const transactions = await readPortfolioTransactions(BigInt(user.id))
    const holdings = calculateHoldings(transactions) as HoldingViewInput[]
    const { quotes, errors: quoteErrors } = await fetchQuotesBounded(
      holdings.map(holding => holding.symbol),
    )

    const enrichedHoldings = holdings.map((holding) => {
      const quote = quotes.get(holding.symbol)
      return quote
        ? {
            ...holding,
            price: quote.regularMarketPrice,
            dayChange: quote.change,
            dayChangePercent: quote.changePercent,
            quoteAsOf: quote.lastUpdateTime,
          }
        : holding
    })
    const firstQuote = quotes.values().next().value

    return {
      holdings: enrichedHoldings,
      valuation: computePortfolioAggregations(enrichedHoldings),
      quoteErrors,
      marketState: firstQuote?.marketState ?? null,
    }
  } catch (error) {
    handleApiError(error, log)
  }
})
