import prisma from '~/lib/prisma'
import { logger } from '~/lib/logger'
import { Errors } from '~/lib/errors/factory'
import { requireUser } from '~/server/utils/auth'
import { parsePositiveBigIntParam } from '~/server/utils/validation'
import { findDiaryForUser } from '~/server/utils/diary-read'
import { handleApiError } from '~/server/utils/error-handler'
import { serialize } from '~/server/utils/serialize'

const VALID_REVIEW_STATUSES = ['none', 'pending', 'reviewed'] as const
type ReviewStatus = (typeof VALID_REVIEW_STATUSES)[number]

export default defineEventHandler(async (event) => {
  const log = logger.diary.withRequestId(event.context.requestId)
  const user = requireUser(event)
  const userId = BigInt(user.id)

  const diaryId = parsePositiveBigIntParam(event, 'id')

  try {
    const body = await readBody(event)
    const reviewStatus: string | undefined = body?.reviewStatus

    if (!reviewStatus || !VALID_REVIEW_STATUSES.includes(reviewStatus as ReviewStatus)) {
      throw Errors.validationError([{
        field: 'reviewStatus',
        message: `reviewStatus must be one of: ${VALID_REVIEW_STATUSES.join(', ')}`,
        value: reviewStatus,
      }])
    }

    // Ownership check
    await findDiaryForUser(diaryId, userId)

    // Build update data
    const updateData: Record<string, unknown> = { reviewStatus }

    // Auto-set reviewedAt when marking as reviewed
    if (reviewStatus === 'reviewed') {
      updateData.reviewedAt = new Date()
    } else if (reviewStatus === 'none' || reviewStatus === 'pending') {
      // Clear reviewedAt when reverting status
      updateData.reviewedAt = null
    }

    const diary = await prisma.diary.update({
      where: { id: diaryId },
      data: updateData,
      include: {
        transactions: true,
        alerts: true,
      },
    })

    log.info('Diary review status updated', {
      diaryId: String(diaryId),
      reviewStatus,
      userId: user.id,
    })

    return serialize(diary)
  } catch (error) {
    handleApiError(error, log)
  }
})
