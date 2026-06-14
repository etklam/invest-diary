import { defineEventHandler } from 'h3'
import { requireUser } from '~/server/utils/auth'
import { parsePositiveBigIntParam } from '~/server/utils/validation'
import { logger } from '~/lib/logger'
import { serialize } from '~/server/utils/serialize'
import { handleApiError } from '~/server/utils/error-handler'
import { updateDiscipline } from '~/server/utils/discipline-queries'

export default defineEventHandler(async (event) => {
  const log = logger.discipline.withRequestId(event.context.requestId)
  try {
    const user = requireUser(event)
    const id = parsePositiveBigIntParam(event, 'id')
    const body = await readBody(event)

    const discipline = await updateDiscipline(id, BigInt(user.id), body)

    log.info('Discipline updated', { disciplineId: String(discipline.id), userId: String(user.id) })
    return serialize(discipline)
  } catch (error) {
    handleApiError(error, log)
  }
})
