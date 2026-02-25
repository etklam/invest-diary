import prisma from '../../lib/prisma'
import { generateRecurringAlertsData } from '~/lib/recurring-alerts'

export default defineEventHandler(async (event) => {
  const userId = event.context.user?.id

  if (!userId) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }

  const body = await readBody(event)

  // Support both single and recurring alerts
  if (!body.diary_id || !body.message) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing required fields',
    })
  }

  try {
    // Verify diary ownership
    const diary = await prisma.diary.findFirst({
      where: {
        id: BigInt(body.diary_id),
        userId: userId
      },
      include: {
        alerts: true
      }
    })

    if (!diary) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Diary not found',
      })
    }

    // Single alert (original logic)
    if (!body.recurring_mode) {
      const alert = await prisma.alert.create({
        data: {
          diaryId: BigInt(body.diary_id),
          message: body.message,
          triggerAt: new Date(body.trigger_at),
        },
      })
      console.log('[API] Single alert created:', alert.id, 'for user:', userId)
      return alert
    }

    // Recurring alert: batch create
    const triggerDate = new Date(body.trigger_at)
    const alertsData = generateRecurringAlertsData({
      startDate: triggerDate,
      triggerTime: triggerDate.toTimeString().slice(0, 5),
      mode: body.recurring_mode,
      message: body.message,
      diaryId: BigInt(body.diary_id),
    })

    // Use transaction for batch creation
    const result = await prisma.$transaction(async (tx) => {
      // Create all alerts
      await tx.alert.createMany({
        data: alertsData,
      })

      // Get the newly created alerts
      const allAlerts = await tx.alert.findMany({
        where: {
          diaryId: BigInt(body.diary_id),
          triggerAt: { gte: triggerDate }
        },
        orderBy: { triggerAt: 'asc' }
      })

      if (allAlerts.length === 0) {
        return []
      }

      // Update parentId: first alert is the parent, others point to it
      const parentId = allAlerts[0]!.id
      await tx.alert.updateMany({
        where: {
          id: { in: allAlerts.map(a => a.id) }
        },
        data: { parentId }
      })

      return allAlerts
    })

    console.log('[API] Recurring alerts created:', result.length, 'for user:', userId)
    return result[0] ?? null // Return the parent alert

  } catch (error) {
    console.error('Error creating alert:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to create alert',
    })
  }
})
