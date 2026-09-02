import {
  investmentActivityQuerySchema,
  toInvestmentActivityResponse,
} from '~/lib/contracts/activity'
import { requireUser } from '~/server/utils/auth'
import { AppError, Errors } from '~/lib/errors/factory'
import { handleApiError } from '~/server/utils/error-handler'
import { logger } from '~/lib/logger'
import { InvalidActivityCursorError } from '~/lib/investment-activity'
import { readInvestmentActivityPage as readActivityPage } from '~/server/utils/investment-activity'

export default defineEventHandler(async (event) => {
  const log = logger.diary.withRequestId(event.context.requestId)
  try {
    const user = requireUser(event)
    const query = investmentActivityQuerySchema.parse(getQuery(event))
    const page = await readActivityPage(BigInt(user.id), {
      ...query,
      asOf: query.asOf ? new Date(query.asOf) : undefined,
    })
    return toInvestmentActivityResponse({ data: page.data, pagination: page.pagination })
  } catch (error) {
    if (error instanceof InvalidActivityCursorError) {
      handleApiError(Errors.invalidCursor(), log)
    }
    if (error instanceof AppError) {
      handleApiError(error, log)
    }
    handleApiError(error, log)
  }
})
