import { defineEventHandler, readBody, createError } from 'h3'
import prisma from '~/lib/prisma'
import { requireUser } from '~/server/utils/auth'

interface OrderItem {
  id: number
  order: number
}

export default defineEventHandler(async (event) => {
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

    // Fast reorder: single SQL update using CASE WHEN to avoid deadlocks
    const ids = orders.map(o => BigInt(o.id))
    const cases = orders
      .map(o => `WHEN ${o.id} THEN ${o.order}`)
      .join(' ')

    await prisma.$executeRawUnsafe(`
      UPDATE disciplines
      SET display_order = CASE id
        ${cases}
      END
      WHERE id IN (${ids.join(',')}) AND user_id = ${userId}
    `)

    console.log('[discipline.reorder] updated orders for user:', user.id)

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
    console.error('[discipline.reorder] error', {
      message: err?.message,
      code: err?.code
    })
    throw err
  }
})
