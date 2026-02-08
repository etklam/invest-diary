import prisma from '~/lib/prisma'
import { calculateHoldings } from '~/lib/utils'

export default defineEventHandler(async (event) => {
  const userId = event.context.user?.id

  if (!userId) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }

  console.log('Fetching all holdings for user:', userId)
  try {
    // Fetch all diaries with their transactions for this user
    const diaries = await prisma.diary.findMany({
      where: {
        userId: userId
      },
      include: {
        transactions: true,
      },
    })

    // Collect all transactions from all diaries
    const allTransactions = diaries.flatMap(diary => diary.transactions)

    // Calculate holdings using FIFO method
    const holdings = calculateHoldings(allTransactions)

    console.log('Calculated holdings:', holdings.length, 'symbols')
    return holdings
  } catch (error) {
    console.error('Error fetching holdings:', error)
    console.error('Error details:', JSON.stringify(error))
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch holdings',
    })
  }
})
