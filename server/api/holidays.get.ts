import { z } from 'zod'

const querySchema = z.object({
  year: z.coerce.number().int().min(1900).max(2100),
  countryCode: z.string().length(2)
})

export default defineEventHandler(async (event) => {
  const userId = event.context.user?.id

  if (!userId) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
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
    throw createError({
      statusCode: 502,
      statusMessage: 'Failed to fetch holiday data'
    })
  }
})
