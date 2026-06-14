import { defineEventHandler } from 'h3'
import { requireUser } from '~/server/utils/auth'
import { logger } from '~/lib/logger'
import { serialize } from '~/server/utils/serialize'
import { handleApiError } from '~/server/utils/error-handler'
import { createDiscipline } from '~/server/utils/discipline-queries'

export default defineEventHandler(async (event) => {
  const log = logger.discipline.withRequestId(event.context.requestId)
  try {
    const user = await requireUser(event)
    const body = await readBody(event)

    const discipline = await createDiscipline(BigInt(user.id), body)

    log.info('Discipline created', { disciplineId: String(discipline.id), order: discipline.order, userId: String(user.id) })
    return serialize(discipline)
  } catch (error) {
    handleApiError(error, log)
  }
})
