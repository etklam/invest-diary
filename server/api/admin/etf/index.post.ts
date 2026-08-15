/**
 * Admin: Create new ETF
 * Validates symbol against Yahoo Finance API before creating
 */

import { logger } from '~/lib/logger'
import { handleApiError } from '~/server/utils/error-handler'
import { serialize } from '~/server/utils/serialize'
import {
  AdminEtfCreateSchema,
  createAdminEtf,
} from '~/server/utils/etf-admin-queries'

export default defineEventHandler(async (event) => {
  const log = logger.admin.withRequestId(event.context.requestId)

  try {
    const input = AdminEtfCreateSchema.parse(await readBody(event))
    const etf = await createAdminEtf(input)

    return serialize({
      id: etf.id,
      symbol: etf.symbol,
      name: etf.name,
      createdAt: etf.createdAt,
    })
  } catch (error) {
    handleApiError(error, log)
  }
})
