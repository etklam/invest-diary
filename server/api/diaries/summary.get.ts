import prisma from '~/lib/prisma'
import { logger } from '~/lib/logger'
import { requireUser } from '~/server/utils/auth'
import { handleApiError } from '~/server/utils/error-handler'
import { serialize } from '~/server/utils/serialize'
import { getDiarySummaryForUser } from '~/server/utils/diary-summary'

export default defineEventHandler(async (event) => {
  const log = logger.diary.withRequestId(event.context.requestId)

  try {
    const user = requireUser(event)
    const userRecord = await prisma.user.findUnique({
      where: { id: BigInt(user.id) },
      select: { timezone: true },
    })

    const summary = await getDiarySummaryForUser(
      BigInt(user.id),
      userRecord?.timezone ?? 'Asia/Taipei',
    )

    return serialize(summary)
  } catch (error) {
    handleApiError(error, log)
  }
})
