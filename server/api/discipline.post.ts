import { defineEventHandler, readBody } from 'h3'
import prisma from '~/lib/prisma'
import { requireUser } from '~/server/utils/auth'
import { logger } from '~/lib/logger'
import { Errors } from '~/lib/errors/factory'
import { handleApiError } from '~/server/utils/error-handler'

export default defineEventHandler(async (event) => {
  const log = logger.discipline.withRequestId(event.context.requestId)
  try {
    const user = await requireUser(event)
    const body = await readBody<{ content?: string }>(event)

    if (!body?.content || !body.content.trim()) {
      throw Errors.validationError([{ field: 'content', message: 'Content is required' }]).toH3Error()
    }

    // Get the current max order value for the user
    const maxOrderDiscipline = await prisma.discipline.findFirst({
      where: { userId: user.id },
      orderBy: { order: 'desc' },
      select: { order: true }
    })

    const nextOrder = (maxOrderDiscipline?.order ?? -1) + 1

    const discipline = await prisma.discipline.create({
      data: {
        content: body.content.trim(),
        userId: user.id,
        order: nextOrder,
      },
      select: {
        id: true,
        content: true,
        order: true,
        createdAt: true,
      },
    })

    log.info('Discipline created', { disciplineId: String(discipline.id), order: discipline.order, userId: String(user.id) })
    return discipline
  } catch (error) {
    handleApiError(error, log)
  }
})
