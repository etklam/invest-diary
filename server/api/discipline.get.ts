import { defineEventHandler } from 'h3'
import { requireUser } from '~/server/utils/auth'
import { logger } from '~/lib/logger'
import { serialize } from '~/server/utils/serialize'
import { handleApiError } from '~/server/utils/error-handler'
import { listDisciplines } from '~/server/utils/discipline-queries'

export default defineEventHandler(async (event) => {
  const log = logger.discipline.withRequestId(event.context.requestId)
  try {
    const user = await requireUser(event)

    const disciplines = await listDisciplines(BigInt(user.id))

    return serialize(disciplines)
  } catch (error) {
    handleApiError(error, log)
  }
})
