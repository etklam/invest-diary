import { logger } from '~/lib/logger'
import { requireUser } from '~/server/utils/auth'
import { getCompanyHub } from '~/server/utils/company-hub-query'
import { handleApiError } from '~/server/utils/error-handler'
import { parseSymbolParam } from '~/lib/stocks/symbols'
import { stockSymbolSchema } from '~/lib/contracts/stocks'

export default defineEventHandler(async (event) => {
  const log = logger.stocks.withRequestId(event.context.requestId)
  const user = requireUser(event)
  setHeader(event, 'Cache-Control', 'no-store')

  try {
    const symbol = stockSymbolSchema.parse(parseSymbolParam(event))
    return await getCompanyHub(BigInt(user.id), symbol)
  } catch (error) {
    handleApiError(error, log)
  }
})
