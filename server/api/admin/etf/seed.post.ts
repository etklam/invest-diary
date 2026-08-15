/**
 * Admin: Seed common ETFs
 * Adds popular ETFs without Yahoo validation
 */

import { logger } from '~/lib/logger'
import { handleApiError } from '~/server/utils/error-handler'
import { serialize } from '~/server/utils/serialize'
import { seedAdminEtfs } from '~/server/utils/etf-admin-queries'

export default defineEventHandler(async (event) => {
  const log = logger.admin.withRequestId(event.context.requestId)

  try {
    const result = await seedAdminEtfs()

    return serialize({
      success: true,
      ...result,
    })
  } catch (error) {
    handleApiError(error, log)
  }
})
