import { defineEventHandler, readBody, createError } from 'h3'
import prisma from '~/lib/prisma'
import { requireUser } from '~/server/utils/auth'
import { parsePositiveBigIntParam } from '~/server/utils/validation'

export default defineEventHandler(async (event) => {
  try {
    const user = await requireUser(event)

    const id = parsePositiveBigIntParam(event, 'id')

    const body = await readBody<{ content?: string }>(event)

    if (!body?.content || !body.content.trim()) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Content is required'
      })
    }

    // Verify ownership first
    const existingDiscipline = await prisma.discipline.findFirst({
      where: {
        id,
        userId: user.id
      }
    })

    if (!existingDiscipline) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Discipline not found'
      })
    }

    // Update the discipline
    const discipline = await prisma.discipline.update({
      where: { id },
      data: {
        content: body.content.trim()
      },
      select: {
        id: true,
        content: true,
        order: true,
        createdAt: true
      }
    })

    console.log('[discipline.put] updated:', discipline.id, 'for user:', user.id)
    return discipline
  } catch (err: any) {
    console.error('[discipline.put] error', {
      message: err?.message,
      code: err?.code
    })
    throw err
  }
})
