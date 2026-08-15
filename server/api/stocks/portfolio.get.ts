import { logger } from '~/lib/logger'
import type { PortfolioValuationResponse } from '~/lib/stocks-view'
import { requireUser } from '~/server/utils/auth'
import { handleApiError } from '~/server/utils/error-handler'
import { loadValuedHoldings } from '~/server/utils/portfolio-read'

/**
 * Owner-scoped Portfolio projection. Quote failures are data quality, not a
 * reason to discard the Transaction-derived holdings.
 */
export default defineEventHandler(async (event): Promise<PortfolioValuationResponse | void> => {
  const log = logger.stocks.withRequestId(event.context.requestId)
  const user = requireUser(event)

  try {
    const { holdings, valuation, quoteErrors, marketState } = await loadValuedHoldings(BigInt(user.id))
    return { holdings, valuation, quoteErrors, marketState }
  } catch (error) {
    handleApiError(error, log)
  }
})
