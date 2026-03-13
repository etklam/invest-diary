/**
 * ETF Analysis API
 * Returns detailed analysis for a specific ETF symbol
 */

import { analyzeEtf } from '~/lib/etf-analyzer'
import { fetchMonthlyData, fetchQuote } from '~/lib/yahoo-finance'
import { rateLimiters } from '~/lib/rate-limiter'
import prisma from '~/lib/prisma'

export default defineEventHandler(async (event) => {
  const symbol = getRouterParam(event, 'symbol')
  if (!symbol) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing symbol',
    })
  }

  // Rate limiting
  const ip = getRequestIP(event) || 'unknown'
  try {
    await rateLimiters.generalApi(ip)
  } catch {
    throw createError({
      statusCode: 429,
      statusMessage: 'Too many requests. Please try again later.',
    })
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
        ? await fetchQuote(etf.symbol).catch(() => null)
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
    fetchMonthlyData(normalizedSymbol, 5),
    fetchQuote(normalizedSymbol).catch(() => null),
  ])

  if (monthlyData.length === 0) {
    throw createError({
      statusCode: 404,
      statusMessage: 'ETF not found',
    })
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
