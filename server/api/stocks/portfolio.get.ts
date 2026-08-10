import { logger } from '~/lib/logger'
import { fetchQuote, type QuoteResponse } from '~/lib/yahoo-finance'
import { calculateHoldings } from '~/lib/position-state'
import {
  computePortfolioAggregations,
  type HoldingViewInput,
  type PortfolioValuationResponse,
} from '~/lib/stocks-view'
import {
  buildMarketQuoteCacheKey,
  getMarketDataCacheTtlSeconds,
  getOrSetCached,
} from '~/lib/market-data/cache'
import { requireUser } from '~/server/utils/auth'
import { handleApiError } from '~/server/utils/error-handler'
import { readPortfolioTransactions } from '~/server/utils/transaction-read'

const FETCH_CONCURRENCY = 3

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
    const queue = [...holdings]
    const quotes = new Map<string, QuoteResponse>()
    const quoteErrors: string[] = []
    const ttlSeconds = getMarketDataCacheTtlSeconds('quote')

    const workers = Array.from({ length: Math.min(FETCH_CONCURRENCY, queue.length) }, async () => {
      while (queue.length > 0) {
        const holding = queue.shift()
        if (!holding) break
        try {
          const quote = await getOrSetCached(
            buildMarketQuoteCacheKey(holding.symbol),
            ttlSeconds,
            () => fetchQuote(holding.symbol),
          )
          if (quote) quotes.set(holding.symbol, quote)
          else quoteErrors.push(holding.symbol)
        } catch (error) {
          quoteErrors.push(holding.symbol)
          log.warn('Portfolio quote unavailable', { symbol: holding.symbol, error })
        }
      }
    })
    await Promise.all(workers)

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
    const firstQuote = quotes.values().next().value as QuoteResponse | undefined

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
