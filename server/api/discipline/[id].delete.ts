import { defineEventHandler, getRouterParam, createError } from 'h3'
import prisma from '~/lib/prisma'
import { requireUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  try {
    const user = await requireUser(event)

    // Defensive ID parsing
    const rawId = getRouterParam(event, 'id')
    if (!rawId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'ID is required'
      })
    }

    const id = BigInt(rawId)

    // Verify ownership before deletion
    const discipline = await prisma.discipline.findFirst({
      where: {
        id,
        userId: user.id
      }
    })

    if (!discipline) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Discipline not found'
      })
    }

    // Delete the discipline
    await prisma.discipline.delete({
      where: { id }
    })

    console.log('[discipline.delete] deleted:', id, 'for user:', user.id)
    return { success: true }
  } catch (err: any) {
    console.error('[discipline.delete] error', {
      message: err?.message,
      code: err?.code
    })
    throw err
  }
})
