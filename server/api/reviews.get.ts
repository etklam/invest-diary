import prisma from '~/lib/prisma'
import { logger } from '~/lib/logger'
import { requireUser } from '~/server/utils/auth'
import { handleApiError } from '~/server/utils/error-handler'
import { serialize } from '~/server/utils/serialize'
import { buildReviewBuckets } from '~/server/utils/diary-read'

export default defineEventHandler(async (event) => {
  const log = logger.diary.withRequestId(event.context.requestId)

  try {
    const user = requireUser(event)
    const userId = BigInt(user.id)

    // ponytail: tz lookup stays inline — only this endpoint needs user tz on
    // the read side, and buildReviewBuckets takes tz as an explicit arg so the
    // date-math module stays pure and testable.
    const persistedUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { timezone: true },
    })
    const timeZone = persistedUser?.timezone || 'Asia/Taipei'

    const buckets = await buildReviewBuckets(userId, timeZone)

    return serialize(buckets)
  } catch (error) {
    handleApiError(error, log)
  }
})
