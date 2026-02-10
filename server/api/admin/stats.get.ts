import adminMiddleware from '~/server/middleware/admin'
import prisma from '~/lib/prisma'

export default defineEventHandler(async (event) => {
  await adminMiddleware(event)

  try {
    // Get user counts by role
    const [totalUsers, adminUsers, regularUsers] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'ADMIN' } }),
      prisma.user.count({ where: { role: 'USER' } })
    ])

    // Get diary count
    const totalDiaries = await prisma.diary.count()

    // Get alert counts
    const [totalAlerts, activeAlerts, dismissedAlerts] = await Promise.all([
      prisma.alert.count(),
      prisma.alert.count({ where: { isDismissed: false } }),
      prisma.alert.count({ where: { isDismissed: true } })
    ])

    // Get transaction counts by type
    const [totalTransactions, buyTransactions, sellTransactions] = await Promise.all([
      prisma.transaction.count(),
      prisma.transaction.count({ where: { type: 'BUY' } }),
      prisma.transaction.count({ where: { type: 'SELL' } })
    ])

    // Get recent activity
    const recentUsers = await prisma.user.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true
      }
    })

    const recentDiaries = await prisma.diary.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true
          }
        }
      }
    })

    console.log('[ADMIN] Get system stats', { userId: event.context.user?.id })

    return {
      success: true,
      data: {
        users: {
          total: totalUsers,
          admin: adminUsers,
          regular: regularUsers
        },
        diaries: {
          total: totalDiaries
        },
        alerts: {
          total: totalAlerts,
          active: activeAlerts,
          dismissed: dismissedAlerts
        },
        transactions: {
          total: totalTransactions,
          buy: buyTransactions,
          sell: sellTransactions
        },
        recentActivity: {
          users: recentUsers,
          diaries: recentDiaries
        }
      }
    }
  } catch (error) {
    console.error('[ADMIN] Get stats error:', error)
    throw error
  }
})
