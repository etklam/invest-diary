import { requireUser } from '~/server/utils/auth'
import { parsePositiveBigIntParam } from '~/server/utils/validation'
import { handleApiError } from '~/server/utils/error-handler'
import { logger } from '~/lib/logger'
import { revokeApiKey } from '~/server/utils/api-key-queries'

export default defineEventHandler(async (event) => {
  const log = logger.api.withRequestId(event.context.requestId)
  try {
    const user = requireUser(event)
    const keyId = parsePositiveBigIntParam(event, 'id')

    await revokeApiKey(keyId, BigInt(user.id))

    return { success: true }
  } catch (error) {
    handleApiError(error, log)
  }
})
