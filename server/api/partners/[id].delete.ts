import { logger } from '~/lib/logger'
import { requireUser } from '~/server/utils/auth'
import { parsePositiveBigIntParam } from '~/server/utils/validation'
import { removePartnerLink } from '~/server/utils/partner'
import { handleApiError } from '~/server/utils/error-handler'

export default defineEventHandler(async (event) => {
  const log = logger.api.withRequestId(event.context.requestId)
  try {
    const user = requireUser(event)
    const linkId = parsePositiveBigIntParam(event, 'id')

    await removePartnerLink(linkId, user.id)

    return { success: true }
  } catch (error) {
    handleApiError(error, log)
  }
})
