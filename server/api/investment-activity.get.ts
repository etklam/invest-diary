import { z } from 'zod'
import { requireUser } from '~/server/utils/auth'
import { handleApiError } from '~/server/utils/error-handler'
import { logger } from '~/lib/logger'
import { readInvestmentActivityPage } from '~/server/utils/investment-activity'

const querySchema = z.object({
  symbol: z.string().trim().max(32).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().trim().max(512).optional(),
})

export default defineEventHandler(async (event) => {
  const log = logger.diary.withRequestId(event.context.requestId)
  try {
    const user = requireUser(event)
    const query = querySchema.parse(getQuery(event))
    return await readInvestmentActivityPage(BigInt(user.id), query)
  } catch (error) {
    handleApiError(error, log)
  }
})
