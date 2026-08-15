/**
 * Admin: Delete ETF
 * Cascade deletes all related prices, alerts, and watchlist entries
 */

import { logger } from '~/lib/logger'
import { handleApiError } from '~/server/utils/error-handler'
import { parsePositiveBigIntParam } from '~/server/utils/validation'
import { serialize } from '~/server/utils/serialize'
import { deleteAdminEtf } from '~/server/utils/etf-admin-queries'

export default defineEventHandler(async (event) => {
  const log = logger.admin.withRequestId(event.context.requestId)

  try {
    const etfId = parsePositiveBigIntParam(event, 'id')
    const result = await deleteAdminEtf(etfId)

    return serialize({
      success: true,
      ...result,
    })
  } catch (error) {
    handleApiError(error, log)
  }
})
