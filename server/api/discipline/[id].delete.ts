import { defineEventHandler } from 'h3'
import prisma from '~/lib/prisma'
import { requireUser } from '~/server/utils/auth'
import { parsePositiveBigIntParam } from '~/server/utils/validation'
import { logger } from '~/lib/logger'
import { Errors } from '~/lib/errors/factory'
import { handleApiError } from '~/server/utils/error-handler'

export default defineEventHandler(async (event) => {
  const log = logger.discipline.withRequestId(event.context.requestId)
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
      throw Errors.disciplineNotFound().toH3Error()
    }

    // Delete the discipline
    await prisma.discipline.delete({
      where: { id }
    })

    log.info('Discipline deleted', { disciplineId: String(id), userId: String(user.id) })
    return { success: true }
  } catch (error) {
    handleApiError(error, log)
  }
})
