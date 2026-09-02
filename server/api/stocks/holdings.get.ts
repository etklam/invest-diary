import { handleApiError } from '~/server/utils/error-handler'
import { logger } from '~/lib/logger'
import { requireUser } from '~/server/utils/auth'
import { loadPortfolioHoldings } from '~/server/utils/portfolio-read'
import {
  toPortfolioHoldingsResponse,
  type PortfolioHoldingsResponse,
} from '~/lib/contracts/portfolio'

export default defineEventHandler(async (event): Promise<PortfolioHoldingsResponse | void> => {
  const log = logger.stocks.withRequestId(event.context.requestId)
  const user = requireUser(event)

  try {
    const holdings = await loadPortfolioHoldings(BigInt(user.id))

    log.debug('Calculated holdings', {
      userId: user.id,
      symbolCount: holdings.length,
    })
    return toPortfolioHoldingsResponse(holdings)
  } catch (error) {
    handleApiError(error, log)
  }
})
