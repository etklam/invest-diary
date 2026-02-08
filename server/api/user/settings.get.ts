export default defineEventHandler(async (event) => {
  const userId = event.context.user?.id

  if (!userId) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      expectedMonthlyTrades: true,
      expectedProfit: true,
      expectedAvgHolding: true,
      createdAt: true
    }
  })

  if (!user) {
    throw createError({
      statusCode: 404,
      statusMessage: 'User not found'
    })
  }

  return {
    success: true,
    settings: {
      name: user.name,
      expectedMonthlyTrades: user.expectedMonthlyTrades,
      expectedProfit: user.expectedProfit,
      expectedAvgHolding: user.expectedAvgHolding
    }
  }
})
