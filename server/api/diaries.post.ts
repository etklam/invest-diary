import prisma from '../../lib/prisma'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body.title) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Title is required',
    })
  }

  const { title, content, date, transactions, alerts } = body

  try {
    const diary = await prisma.diary.create({
      data: {
        title,
        content,
        date: date ? new Date(date) : new Date(),
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

    return diary
  } catch (error) {
    console.error('Error creating diary:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to create diary',
    })
  }
})
