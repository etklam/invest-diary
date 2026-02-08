import prisma from '~/lib/prisma'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const dateStr = query.date as string

  if (!dateStr) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Date parameter is required',
    })
  }

  console.log('Checking diary for date:', dateStr)

  try {
    // Parse the date and get start/end of day
    const date = new Date(dateStr)
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)

    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)

    // Find diary within the date range
    const diary = await prisma.diary.findFirst({
      where: {
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        transactions: true,
        alerts: true,
      },
    })

    console.log('Found diary:', diary ? 'Yes' : 'No')
    return diary || null
  } catch (error) {
    console.error('Error checking diary by date:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to check diary by date',
    })
  }
})
