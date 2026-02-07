import prisma from '../../../lib/prisma'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'ID is required',
    })
  }

  if (!body.title) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Title is required',
    })
  }

  const { title, content, transactions } = body

  try {
    // Update diary and handle transactions
    // For transactions, we'll delete existing ones and create new ones for simplicity
    // In a more complex app, we might want to update existing ones
    const diary = await prisma.$transaction(async (tx) => {
      // Delete existing transactions
      await tx.transaction.deleteMany({
        where: {
          diaryId: BigInt(id),
        },
      })

      // Update diary and create new transactions
      return await tx.diary.update({
        where: {
          id: BigInt(id),
        },
        data: {
          title,
          content,
          transactions: {
            create: transactions?.map((tx: any) => ({
              symbol: tx.symbol,
              type: tx.type,
              quantity: tx.quantity,
              price: tx.price,
              tradeDate: new Date(tx.trade_date || tx.tradeDate),
            })),
          },
        },
        include: {
          transactions: true,
        },
      })
    })

    return diary
  } catch (error) {
    console.error('Error updating diary:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to update diary',
    })
  }
})
