/**
 * Create stock price alert
 */

import { requireUser } from '~/server/utils/auth'
import { serialize } from '~/server/utils/serialize'
import { createPriceAlert } from '~/server/utils/price-alert-queries'

export default defineEventHandler(async (event) => {
  const user = requireUser(event)

  try {
    const body = await readBody(event)
    const alert = await createPriceAlert(user.id, body)

    return serialize({
      id: alert.id,
      symbol: alert.symbol,
      type: alert.type,
      threshold: Number(alert.threshold),
      message: alert.message,
      isTriggered: alert.isTriggered,
      createdAt: alert.createdAt,
    })
  } catch (error) {
    const { handleApiError } = await import('~/server/utils/error-handler')
    handleApiError(error)
  }
})
