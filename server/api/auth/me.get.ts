import { requireUser } from '~/server/utils/auth'
import { serialize } from '~/server/utils/serialize'
import { handleApiError } from '~/server/utils/error-handler'
import { logger } from '~/lib/logger'
import { getUserProfile } from '~/server/utils/user-queries'

export default defineEventHandler(async (event) => {
  const log = logger.auth.withRequestId(event.context.requestId)
  try {
    const auth = requireUser(event)

    const user = await getUserProfile(BigInt(auth.id))

    return serialize({ ok: true, data: user })
  } catch (error) {
    handleApiError(error, log)
  }
})
