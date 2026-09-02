import prisma from '~/lib/prisma'
import {
  marketStateHistoryQuerySchema,
  toMarketStateHistoryResponse,
} from '~/lib/contracts/market'
import { handleApiError } from '~/server/utils/error-handler'
import { logger } from '~/lib/logger'
import { getBreadthHistory } from '~/server/utils/market-state-queries'

export default defineEventHandler(async (event) => {
  const log = logger.api.withRequestId(event.context.requestId)
  try {
    const { days } = marketStateHistoryQuerySchema.parse(getQuery(event) ?? {})
    const history = await getBreadthHistory(prisma, days)

    return toMarketStateHistoryResponse(history.map(({ regime, ...row }) => ({
      ...row,
      marketState: regime,
    })))
  } catch (error) {
    handleApiError(error, log)
  }
})
