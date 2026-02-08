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

  const { title, content, date, transactions, alerts } = body

  try {
    // Update diary and handle transactions and alerts
    // For transactions/alerts, we'll delete existing ones and create new ones for simplicity
    const diary = await prisma.$transaction(async (tx) => {
      // Delete existing transactions and alerts
      await tx.transaction.deleteMany({
        where: {
          diaryId: BigInt(id),
        },
      })
      await tx.alert.deleteMany({
        where: {
          diaryId: BigInt(id),
        },
      })

      // Update diary and create new transactions and alerts
      return await tx.diary.update({
        where: {
          id: BigInt(id),
        },
        data: {
          title,
          content,
          date: date ? new Date(date) : undefined,
          transactions: {
            create: transactions?.map((tx: any) => ({
              symbol: tx.symbol,
              type: tx.type,
              quantity: tx.quantity,
              price: tx.price,
              tradeDate: new Date(tx.trade_date || tx.tradeDate),
            })),
          },
          alerts: {
            create: alerts?.map((a: any) => ({
              message: a.message,
              triggerAt: new Date(a.trigger_at || a.triggerAt),
            })),
          },
        },
        include: {
          transactions: true,
          alerts: true,
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
