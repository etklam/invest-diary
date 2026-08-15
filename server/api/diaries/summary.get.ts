import { logger } from '~/lib/logger'
import { requireUser } from '~/server/utils/auth'
import { handleApiError } from '~/server/utils/error-handler'
import { serialize } from '~/server/utils/serialize'
import { getDiarySummaryForUser } from '~/server/utils/diary-summary'
import { getUserTimezone } from '~/server/utils/user-queries'

export default defineEventHandler(async (event) => {
  const log = logger.diary.withRequestId(event.context.requestId)

  try {
    const user = requireUser(event)
    const userId = BigInt(user.id)
    const timezone = await getUserTimezone(userId)

    const summary = await getDiarySummaryForUser(
      userId,
      timezone,
    )

    return serialize(summary)
  } catch (error) {
    handleApiError(error, log)
  }
})
