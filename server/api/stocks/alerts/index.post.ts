/**
 * Create stock price alert
 */

import { requireUser } from '~/server/utils/auth'
import type { AlertType } from '@prisma/client'
import prisma from '~/lib/prisma'
import { logger } from '~/lib/logger'
import { Errors } from '~/lib/errors/factory'

export default defineEventHandler(async (event) => {
  const log = logger.stocks.withRequestId(event.context.requestId)
  const user = requireUser(event)

  const body = await readBody(event)
  const { symbol, type, threshold, message } = body

  if (!symbol || !type || threshold === undefined) {
    throw Errors.validationError([
      { field: 'symbol', message: 'Required' },
      { field: 'type', message: 'Required' },
      { field: 'threshold', message: 'Required' },
    ]).toH3Error()
  }

  const validTypes: AlertType[] = ['PRICE_ABOVE', 'PRICE_BELOW', 'CHANGE_PERCENT', 'MOVING_AVG']
  if (!validTypes.includes(type)) {
    throw Errors.validationError([{ field: 'type', message: 'Invalid alert type' }]).toH3Error()
  }

  const normalizedSymbol = symbol.toUpperCase().trim()

  if (normalizedSymbol.length === 0 || normalizedSymbol.length > 20) {
    throw Errors.validationError([{ field: 'symbol', message: 'Symbol must be between 1 and 20 characters' }]).toH3Error()
  }

  // Create alert
  const alert = await prisma.priceAlert.create({
    data: {
      userId: user.id,
      symbol: normalizedSymbol,
      type,
      threshold: threshold.toString(),
      message: message || `${type} alert for ${normalizedSymbol} at ${threshold}`,
    },
  })

  return {
    id: alert.id.toString(),
    symbol: alert.symbol,
    type: alert.type,
    threshold: Number(alert.threshold),
    message: alert.message,
    isTriggered: alert.isTriggered,
    createdAt: alert.createdAt,
  }
})
