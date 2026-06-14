import prisma from '~/lib/prisma'
import { logger } from '~/lib/logger'
import { requireUser } from '~/server/utils/auth'
import { parsePositiveBigIntParam } from '~/server/utils/validation'
import { findDiaryForUser } from '~/server/utils/diary-read'
import { handleApiError } from '~/server/utils/error-handler'
import { serialize } from '~/server/utils/serialize'
import { z } from 'zod'

const VALID_REVIEW_STATUSES = ['none', 'pending', 'reviewed'] as const

const reviewUpdateSchema = z.object({
  reviewStatus: z.enum(VALID_REVIEW_STATUSES),
  reviewedAt: z.string().datetime().optional(),
  reviewDueAt: z.string().datetime().nullable().optional(),
})

export default defineEventHandler(async (event) => {
  const log = logger.diary.withRequestId(event.context.requestId)
  const user = requireUser(event)
  const userId = BigInt(user.id)

  const diaryId = parsePositiveBigIntParam(event, 'id')

  try {
    const body = reviewUpdateSchema.parse(await readBody(event))

    // Ownership check
    await findDiaryForUser(diaryId, userId)

    // Build update data
    const updateData: Record<string, unknown> = { reviewStatus: body.reviewStatus }

    if (body.reviewDueAt !== undefined) {
      updateData.reviewDueAt = body.reviewDueAt ? new Date(body.reviewDueAt) : null
    }

    // Auto-set reviewedAt when marking as reviewed
    if (body.reviewStatus === 'reviewed') {
      updateData.reviewedAt = body.reviewedAt ? new Date(body.reviewedAt) : new Date()
    } else if (body.reviewStatus === 'none' || body.reviewStatus === 'pending') {
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
      reviewStatus: body.reviewStatus,
      userId: user.id,
    })

    return serialize(diary)
  } catch (error) {
    handleApiError(error, log)
  }
})
