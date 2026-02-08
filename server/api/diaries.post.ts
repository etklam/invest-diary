import prisma from '~/lib/prisma'

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
    // Check if diary already exists for this date
    const diaryDate = date ? new Date(date) : new Date()
    const startOfDay = new Date(diaryDate)
    startOfDay.setHours(0, 0, 0, 0)

    const endOfDay = new Date(diaryDate)
    endOfDay.setHours(23, 59, 59, 999)

    const existingDiary = await prisma.diary.findFirst({
      where: {
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    })

    if (existingDiary) {
      // Diary exists for this date, return 409 Conflict
      throw createError({
        statusCode: 409,
        statusMessage: `Diary already exists for this date`,
        data: {
          existingDiaryId: existingDiary.id.toString(),
          date: date,
        },
      })
    }

    const diary = await prisma.diary.create({
      data: {
        title,
        content,
        date: diaryDate,
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
  } catch (error: any) {
    console.error('Error creating diary:', error)
    // Re-throw if it's a 409 conflict
    if (error.statusCode === 409) {
      throw error
    }
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to create diary',
    })
  }
})
