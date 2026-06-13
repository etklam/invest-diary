/**
 * ETF Analysis API
 * Returns detailed analysis for a specific ETF symbol
 */

import { analyzeEtf } from '~/lib/etf-analyzer'
import { fetchMonthlyData, fetchQuote } from '~/lib/yahoo-finance'
import { rateLimiters } from '~/lib/rate-limiter'
import prisma from '~/lib/prisma'
import { logger } from '~/lib/logger'
import { Errors } from '~/lib/errors/factory'
import {
  buildMarketHistoricalCacheKey,
  buildMarketQuoteCacheKey,
  getMarketDataCacheTtlSeconds,
  getOrSetCached,
} from '~/lib/market-data/cache'

export default defineEventHandler(async (event) => {
  const log = logger.etf.withRequestId(event.context.requestId)
  const symbol = getRouterParam(event, 'symbol')
  if (!symbol) {
    throw Errors.validationError([{ field: 'symbol', message: 'Missing symbol' }]).toH3Error()
  }

  // Rate limiting
  const ip = getRequestIP(event) || 'unknown'
  try {
    await rateLimiters.generalApi(ip)
  } catch {
    throw Errors.rateLimited().toH3Error()
  }

  const normalizedSymbol = symbol.toUpperCase()

  // First attempt: use DB seed/history if available.
  try {
    const etf = await prisma.etf.findUnique({
      where: { symbol: normalizedSymbol },
      include: {
        prices: {
          orderBy: { date: 'desc' },
          take: 60,
        },
      },
    })

    if (etf) {
      const quote = etf.prices.length > 0
        ? await getOrSetCached(
            buildMarketQuoteCacheKey(etf.symbol),
            getMarketDataCacheTtlSeconds('quote'),
            () => fetchQuote(etf.symbol),
          ).catch(() => null)
        : null

      const prices = etf.prices.map((p: any) => ({
        date: p.date,
        open: p.open,
        high: p.high,
        low: p.low,
        close: p.close,
        adjClose: p.adjClose,
      }))

      return analyzeEtf(etf.symbol, etf.name, prices, quote)
    }
  } catch {
    // Continue with Yahoo fallback when DB is unavailable.
  }

  // Fallback: on-demand analysis from Yahoo monthly data,
  // so the tool still works without admin seeding.
  const [monthlyData, quote] = await Promise.all([
    getOrSetCached(
      buildMarketHistoricalCacheKey(normalizedSymbol, 'monthly-5y'),
      getMarketDataCacheTtlSeconds('historical'),
      () => fetchMonthlyData(normalizedSymbol, 5),
    ),
    getOrSetCached(
      buildMarketQuoteCacheKey(normalizedSymbol),
      getMarketDataCacheTtlSeconds('quote'),
      () => fetchQuote(normalizedSymbol),
    ).catch(() => null),
  ])

  if (monthlyData.length === 0) {
    throw Errors.etfNotFound(normalizedSymbol).toH3Error()
  }

  const prices = monthlyData.map(d => ({
    date: new Date(d.timestamp * 1000),
    open: d.open ?? 0,
    high: d.high ?? 0,
    low: d.low ?? 0,
    close: d.close ?? 0,
    adjClose: d.adjClose ?? d.close ?? 0,
  }))

  return analyzeEtf(normalizedSymbol, null, prices, quote)
})
