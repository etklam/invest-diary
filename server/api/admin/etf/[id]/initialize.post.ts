/**
 * Admin: Initialize historical data for ETF
 * Fetches 5 years of monthly data from Yahoo Finance
 */

import { requireUser } from '~/server/utils/auth'
import adminMiddleware from '~/server/middleware/admin'
import { fetchMonthlyData } from '~/lib/yahoo-finance'
import prisma from '~/lib/prisma'
import { parsePositiveBigIntParam } from '~/server/utils/validation'
import { logger } from '~/lib/logger'

export default defineEventHandler(async (event) => {
  const log = logger.admin.withRequestId(event.context.requestId)
  requireUser(event)
  await adminMiddleware(event)

  const etfId = parsePositiveBigIntParam(event, 'id')

  // Check if ETF exists
  const etf = await prisma.etf.findUnique({
    where: { id: etfId },
  })

  if (!etf) {
    throw createError({
      statusCode: 404,
      statusMessage: 'ETF not found',
    })
  }

  try {
    // Fetch 5 years of monthly data from Yahoo Finance
    const monthlyData = await fetchMonthlyData(etf.symbol, 5)

    // Prepare data for batch insert
    const prices = monthlyData
      .filter(d => d.close !== null)
      .map(d => ({
        etfId,
        date: new Date(d.timestamp * 1000),
        open: d.open ?? 0,
        high: d.high ?? 0,
        low: d.low ?? 0,
        close: d.close ?? 0,
        adjClose: d.adjClose ?? d.close ?? 0,
        volume: d.volume ?? null,
      }))

    if (prices.length === 0) {
      throw createError({
        statusCode: 502,
        statusMessage: 'No historical data available from Yahoo Finance',
      })
    }
    const firstPrice = prices.at(0)
    const lastPrice = prices.at(-1)
    if (!firstPrice || !lastPrice) {
      throw createError({
        statusCode: 502,
        statusMessage: 'No historical data available from Yahoo Finance',
      })
    }

    // Batch insert with skipDuplicates
    const result = await prisma.etfPrice.createMany({
      data: prices,
      skipDuplicates: true,
    })

    return {
      success: true,
      added: result.count,
      total: prices.length,
      symbol: etf.symbol,
      dateRange: {
        from: new Date(firstPrice.date).toISOString().split('T')[0],
        to: new Date(lastPrice.date).toISOString().split('T')[0],
      },
    }
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }
    throw createError({
      statusCode: 502,
      statusMessage: 'Failed to fetch historical data from Yahoo Finance',
    })
  }
})
