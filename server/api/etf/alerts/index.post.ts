/**
 * Create ETF price alert
 */

import { requireUser } from '~/server/utils/auth'
import type { AlertType } from '@prisma/client'
import prisma from '~/lib/prisma'
import { logger } from '~/lib/logger'

export default defineEventHandler(async (event) => {
  const log = logger.etf.withRequestId(event.context.requestId)
  const user = requireUser(event)

  const body = await readBody(event)
  const { symbol, type, threshold, message } = body

  if (!symbol || !type || threshold === undefined) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing required fields: symbol, type, threshold',
    })
  }

  const validTypes: AlertType[] = ['PRICE_ABOVE', 'PRICE_BELOW', 'CHANGE_PERCENT', 'MOVING_AVG']
  if (!validTypes.includes(type)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid alert type',
    })
  }

  const normalizedSymbol = symbol.toUpperCase().trim()

  // Find ETF
  const etf = await prisma.etf.findUnique({
    where: { symbol: normalizedSymbol },
  })

  if (!etf) {
    throw createError({
      statusCode: 404,
      statusMessage: 'ETF not found',
    })
  }

  // Create alert
  const alert = await prisma.etfAlert.create({
    data: {
      userId: user.id,
      etfId: etf.id,
      type,
      threshold: threshold.toString(),
      message: message || `${type} alert for ${normalizedSymbol} at ${threshold}`,
    },
  })

  return {
    id: alert.id.toString(),
    symbol: etf.symbol,
    type: alert.type,
    threshold: Number(alert.threshold),
    message: alert.message,
    isTriggered: alert.isTriggered,
  }
})
