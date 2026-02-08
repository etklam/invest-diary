import prisma from '~/lib/prisma'
import { calculateHoldings } from '~/lib/utils'

export default defineEventHandler(async (event) => {
  console.log('Fetching all holdings...')
  try {
    // Fetch all diaries with their transactions
    const diaries = await prisma.diary.findMany({
      include: {
        transactions: true,
      },
    })

    // Collect all transactions from all diaries
    const allTransactions = diaries.flatMap(diary => diary.transactions)

    // Calculate holdings using FIFO method
    const holdings = calculateHoldings(allTransactions)

    console.log('Calculated holdings:', holdings)
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
