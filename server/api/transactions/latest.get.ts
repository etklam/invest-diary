import { handleApiError } from '~/server/utils/error-handler'
import { logger } from '~/lib/logger'
import { requireUser } from '~/server/utils/auth'
import { serialize } from '~/server/utils/serialize'
import { findLatestDiaryForUser } from '~/server/utils/diary-read'

export default defineEventHandler(async (event) => {
  const log = logger.diary.withRequestId(event.context.requestId)
  const user = requireUser(event)

  try {
    const userId = BigInt(user.id)
    const latestDiary = await findLatestDiaryForUser(userId)

    if (!latestDiary) {
      return null
    }

    // ponytail: shape kept identical to the pre-refactor response — serialize
    // now wraps the payload explicitly instead of relying on the global
    // BigInt.prototype.toJSON safety net.
    return serialize({
      diary_id: latestDiary.id,
      diary_date: latestDiary.createdAt,
      transactions: latestDiary.transactions,
    })
  } catch (error) {
    handleApiError(error, log)
  }
})
