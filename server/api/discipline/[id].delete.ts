import { defineEventHandler, createError } from 'h3'
import prisma from '~/lib/prisma'
import { requireUser } from '~/server/utils/auth'
import { parsePositiveBigIntParam } from '~/server/utils/validation'

export default defineEventHandler(async (event) => {
  try {
    const user = await requireUser(event)

    const id = parsePositiveBigIntParam(event, 'id')

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
