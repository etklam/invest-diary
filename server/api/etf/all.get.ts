/**
 * All ETF Comparison API
 * Returns all ETFs with analysis data, supporting sorting by various fields
 */

import { analyzeEtf, type EtfAnalysis } from '~/lib/etf-analyzer'
import { fetchQuote } from '~/lib/yahoo-finance'
import { rateLimiters } from '~/lib/rate-limiter'
import prisma from '~/lib/prisma'
import { logger } from '~/lib/logger'
import { requireUser } from '~/server/utils/auth'

type SortField =
  | 'symbol'
  | 'currentPrice'
  | 'dailyChangePercent'
  | 'monthlyChangePercent'
  | 'quarterlyChangePercent'
  | 'ytdChangePercent'
  | 'ma20'
  | 'ma60'
  | 'trendScore'

const sortValueMap = {
  symbol: (row: EtfAnalysis) => row.symbol,
  currentPrice: (row: EtfAnalysis) => row.currentPrice,
  dailyChangePercent: (row: EtfAnalysis) => row.daily.changePercent,
  monthlyChangePercent: (row: EtfAnalysis) => row.monthly.previousMonth.changePercent,
  quarterlyChangePercent: (row: EtfAnalysis) => row.quarterly.changePercent,
  ytdChangePercent: (row: EtfAnalysis) => row.ytd.changePercent,
  ma20: (row: EtfAnalysis) => row.technical.ma20,
  ma60: (row: EtfAnalysis) => row.technical.ma60,
  trendScore: (row: EtfAnalysis) => ({ bearish: 0, neutral: 1, bullish: 2 }[row.technical.trend]),
} satisfies Record<SortField, (row: EtfAnalysis) => string | number>

export default defineEventHandler(async (event) => {
  const log = logger.etf.withRequestId(event.context.requestId)

  // Authentication: require valid user session
  const user = requireUser(event)

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

  const query = getQuery(event)
  const rawSort = typeof query.sort === 'string' ? query.sort : 'symbol'
  const rawOrder = typeof query.order === 'string' ? query.order : 'asc'

  const sortBy: SortField = rawSort in sortValueMap ? (rawSort as SortField) : 'symbol'
  const order: 'asc' | 'desc' = rawOrder === 'desc' ? 'desc' : 'asc'

  // Fetch all ETFs with their prices (last 60 for MA60 calculation).
  // Return empty list instead of 500 when DB is temporarily unavailable.
  const etfs = await prisma.etf.findMany({
    include: {
      prices: {
        orderBy: { date: 'desc' },
        take: 60,
      },
    },
  }).catch(() => [])

  // Analyze each ETF (fetch real-time quote for each)
  const results = await Promise.allSettled(
    etfs.map(async (etf: any) => {
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
    })
  )

  const analysisResults = results
    .filter((r): r is PromiseFulfilledResult<EtfAnalysis> => r.status === 'fulfilled')
    .map(r => r.value)

  // Sort results
  const getSortValue = sortValueMap[sortBy] || sortValueMap.symbol

  analysisResults.sort((a, b) => {
    const aVal = getSortValue(a)
    const bVal = getSortValue(b)

    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return order === 'asc'
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal)
    }

    return order === 'asc'
      ? Number(aVal) - Number(bVal)
      : Number(bVal) - Number(aVal)
  })

  return analysisResults
})
