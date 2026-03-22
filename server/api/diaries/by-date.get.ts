import prisma from '~/lib/prisma'
import { getUtcDayRange } from '~/lib/diary-date'
import { attachDiaryTags } from '~/server/utils/diary-response'

export default defineEventHandler(async (event) => {
  const userId = event.context.user?.id

  if (!userId) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }

  const query = getQuery(event)
  const dateStr = query.date as string

  if (!dateStr) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Date parameter is required',
    })
  }

  console.log('Checking diary for date:', dateStr, 'user:', userId)

  try {
    // Normalize date search to UTC day range for timezone-stable matching
    const { startOfDayUtc, endOfDayUtc } = getUtcDayRange(dateStr)

    // Find diary within the date range for this user
    const diary = await prisma.diary.findFirst({
      where: {
        userId: userId,
        date: {
          gte: startOfDayUtc,
          lte: endOfDayUtc,
        },
      },
      include: {
        transactions: true,
        alerts: true,
      },
    })

    console.log('Found diary:', diary ? 'Yes' : 'No')
    return diary ? attachDiaryTags(diary) : null
  } catch (error) {
    console.error('Error checking diary by date:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to check diary by date',
    })
  }
})
