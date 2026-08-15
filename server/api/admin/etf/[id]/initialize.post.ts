/**
 * Admin: Initialize historical data for ETF
 * Fetches 5 years of monthly data from Yahoo Finance
 */

import { logger } from '~/lib/logger'
import { handleApiError } from '~/server/utils/error-handler'
import { parsePositiveBigIntParam } from '~/server/utils/validation'
import { serialize } from '~/server/utils/serialize'
import { initializeAdminEtf } from '~/server/utils/etf-admin-queries'

export default defineEventHandler(async (event) => {
  const log = logger.admin.withRequestId(event.context.requestId)

  try {
    const etfId = parsePositiveBigIntParam(event, 'id')
    const result = await initializeAdminEtf(etfId)

    return serialize({
      success: true,
      ...result,
    })
  } catch (error) {
    handleApiError(error, log)
  }
})
