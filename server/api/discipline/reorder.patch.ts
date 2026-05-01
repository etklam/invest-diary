import { defineEventHandler, readBody, createError } from 'h3'
import prisma from '~/lib/prisma'
import { requireUser } from '~/server/utils/auth'
import { logger } from '~/lib/logger'

interface OrderItem {
  id: number
  order: number
}

export default defineEventHandler(async (event) => {
  const log = logger.discipline.withRequestId(event.context.requestId)
  try {
    const user = await requireUser(event)

    const body = await readBody<{ orders?: OrderItem[] }>(event)

    if (!body?.orders || !Array.isArray(body.orders)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Orders array is required'
      })
    }

    const { orders } = body

    // Verify all disciplines belong to the current user
    const disciplineIds = orders.map((item) => BigInt(item.id))
    const userId = BigInt(user.id)

    const existingDisciplines = await prisma.discipline.findMany({
      where: {
        id: { in: disciplineIds },
        userId
      },
      select: {
        id: true
      }
    })

    if (existingDisciplines.length !== orders.length) {
      throw createError({
        statusCode: 403,
        statusMessage: 'One or more disciplines not found or access denied'
      })
    }

    await prisma.$transaction(
      orders.map((item) => prisma.discipline.updateMany({
        where: {
          id: BigInt(item.id),
          userId,
        },
        data: {
          order: item.order,
        },
      }))
    )

    log.info('Discipline orders updated', { userId: String(user.id) })

    // Return updated list
    const disciplines = await prisma.discipline.findMany({
      where: { userId },
      orderBy: { order: 'asc' },
      select: {
        id: true,
        content: true,
        order: true,
        createdAt: true
      }
    })

    return disciplines
  } catch (err: any) {
    log.error('Reorder failed', { message: err?.message, code: err?.code })
    throw err
  }
})
