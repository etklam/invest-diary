import { z } from 'zod'
import { logger } from '~/lib/logger'
import { Errors } from '~/lib/errors/factory'

const querySchema = z.object({
  year: z.coerce.number().int().min(1900).max(2100),
  countryCode: z.string().length(2)
})

export default defineEventHandler(async (event) => {
  const log = logger.api.withRequestId(event.context.requestId)
  const userId = event.context.user?.id

  if (!userId) {
    throw Errors.unauthorized().toH3Error()
  }

  const query = getQuery(event)
  const { year, countryCode } = querySchema.parse(query)

  try {
    const data = await $fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/${countryCode.toUpperCase()}`)
    return {
      success: true,
      data
    }
  } catch {
    throw Errors.externalServiceError('Failed to fetch holiday data').toH3Error()
  }
})
