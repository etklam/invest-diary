import prisma from '~/lib/prisma'
import {
  marketStateSnapshotQuerySchema,
  toMarketStateSnapshotResponse,
} from '~/lib/contracts/market'
import { Errors } from '~/lib/errors/factory'
import { handleApiError } from '~/server/utils/error-handler'
import { logger } from '~/lib/logger'
import { getLatestBreadthSnapshot, getRegimeGuidance } from '~/server/utils/market-state-queries'

export default defineEventHandler(async (event) => {
  const log = logger.api.withRequestId(event.context.requestId)
  try {
    marketStateSnapshotQuerySchema.parse(getQuery(event) ?? {})
    const snapshot = await getLatestBreadthSnapshot(prisma)

    if (!snapshot) {
      throw Errors.notFound('Market state snapshot not found').toH3Error()
    }

    const { regime, ...rest } = snapshot

    return toMarketStateSnapshotResponse({
      ...rest,
      marketState: regime,
      ...getRegimeGuidance(regime),
    })
  } catch (error) {
    handleApiError(error, log)
  }
})
