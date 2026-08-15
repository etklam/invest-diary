/**
 * Admin: Get all ETFs
 */

import { logger } from '~/lib/logger'
import { handleApiError } from '~/server/utils/error-handler'
import { serialize } from '~/server/utils/serialize'
import { listAdminEtfs } from '~/server/utils/etf-admin-queries'

type AdminEtfListItem = Awaited<ReturnType<typeof listAdminEtfs>>[number]

export default defineEventHandler(async (event) => {
  const log = logger.admin.withRequestId(event.context.requestId)

  try {
    const etfs = await listAdminEtfs()

    return serialize(etfs.map((etf: AdminEtfListItem) => ({
      id: etf.id,
      symbol: etf.symbol,
      name: etf.name,
      priceCount: etf._count.prices,
      watchlistCount: etf._count.watchlists,
      createdAt: etf.createdAt,
      updatedAt: etf.updatedAt,
    })))
  } catch (error) {
    handleApiError(error, log)
  }
})
