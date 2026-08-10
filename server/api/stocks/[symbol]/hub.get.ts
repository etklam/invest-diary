import { Errors } from '~/lib/errors/factory'
import { logger } from '~/lib/logger'
import { requireUser } from '~/server/utils/auth'
import { getCompanyHub } from '~/server/utils/company-hub-query'
import { handleApiError } from '~/server/utils/error-handler'

export default defineEventHandler(async (event) => {
  const log = logger.stocks.withRequestId(event.context.requestId)
  const user = requireUser(event)
  setHeader(event, 'Cache-Control', 'no-store')

  try {
    const symbol = decodeURIComponent(String(event.context.params?.symbol ?? ''))
    if (!symbol.trim()) throw Errors.validationError([{ field: 'symbol', message: 'symbol is required' }])
    return await getCompanyHub(BigInt(user.id), symbol)
  } catch (error) {
    handleApiError(error, log)
  }
})
