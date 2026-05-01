import { defineEventHandler, readBody, createError } from 'h3'
import prisma from '~/lib/prisma'
import { requireUser } from '~/server/utils/auth'
import { parsePositiveBigIntParam } from '~/server/utils/validation'
import { logger } from '~/lib/logger'
import { handleApiError } from '~/server/utils/error-handler'

export default defineEventHandler(async (event) => {
  const log = logger.discipline.withRequestId(event.context.requestId)
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

    log.info('Discipline updated', { disciplineId: String(discipline.id), userId: String(user.id) })
    return discipline
  } catch (error) {
    handleApiError(error, log)
  }
})
