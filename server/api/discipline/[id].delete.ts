import { defineEventHandler } from 'h3'
import { requireUser } from '~/server/utils/auth'
import { parsePositiveBigIntParam } from '~/server/utils/validation'
import { logger } from '~/lib/logger'
import { handleApiError } from '~/server/utils/error-handler'
import { deleteDiscipline } from '~/server/utils/discipline-queries'

export default defineEventHandler(async (event) => {
  const log = logger.discipline.withRequestId(event.context.requestId)
  try {
    const user = requireUser(event)
    const id = parsePositiveBigIntParam(event, 'id')

    await deleteDiscipline(id, BigInt(user.id))

    log.info('Discipline deleted', { disciplineId: String(id), userId: String(user.id) })
    return { success: true }
  } catch (error) {
    handleApiError(error, log)
  }
})
