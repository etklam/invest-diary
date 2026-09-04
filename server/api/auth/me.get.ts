import { requireUser } from '~/server/utils/auth'
import { serialize } from '~/server/utils/serialize'
import { handleApiError } from '~/server/utils/error-handler'
import { logger } from '~/lib/logger'
import { getUserProfile } from '~/server/utils/user-queries'
import { authUserResponseSchema } from '~/lib/contracts/auth'

export default defineEventHandler(async (event) => {
  const log = logger.auth.withRequestId(event.context.requestId)
  try {
    const auth = requireUser(event)

    const user = await getUserProfile(BigInt(auth.id))

    return authUserResponseSchema.parse(serialize({ ok: true, data: user }))
  } catch (error) {
    handleApiError(error, log)
  }
})
