/**
 * Create stock price alert
 */

import { requireUser } from '~/server/utils/auth'
import prisma from '~/lib/prisma'
import { Errors } from '~/lib/errors/factory'
import { serialize } from '~/server/utils/serialize'
import {
  isPriceAlertType,
  isSupportedPriceAlertType,
} from '~/server/utils/price-alert-condition'

export default defineEventHandler(async (event) => {
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

  if (!isPriceAlertType(type)) {
    throw Errors.validationError([{ field: 'type', message: 'Invalid alert type' }]).toH3Error()
  }

  if (!isSupportedPriceAlertType(type)) {
    throw Errors.validationError([{ field: 'type', message: 'Alert type is not supported yet' }]).toH3Error()
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

  return serialize({
    id: alert.id,
    symbol: alert.symbol,
    type: alert.type,
    threshold: Number(alert.threshold),
    message: alert.message,
    isTriggered: alert.isTriggered,
    createdAt: alert.createdAt,
  })
})
