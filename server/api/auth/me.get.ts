export default defineEventHandler(async (event) => {
  // User is attached by middleware
  const userId = event.context.user?.id

  if (!userId) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }

  // Fetch full user data
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
    user
  }
})
