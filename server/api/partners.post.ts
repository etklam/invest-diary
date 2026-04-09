import { z } from 'zod'
import prisma from '~/lib/prisma'
import { AppError, Errors } from '~/lib/errors/factory'
import { logger } from '~/lib/logger'
import { requireUser } from '~/server/utils/auth'
import { normalizeInput } from '~/server/utils/validation'
import { orderPartnerUserIds, type PartnerLinkRecord } from '~/server/utils/partner'
import { serializePartnerLink } from '~/server/utils/partner-response'

const createPartnerSchema = z.object({
  partnerEmail: z.string()
    .transform((value) => normalizeInput(value).toLowerCase())
    .pipe(z.string().email('Invalid email format')),
})

export default defineEventHandler(async (event) => {
  const log = logger.api.withRequestId(event.context.requestId)

  try {
    const user = requireUser(event)
    const body = await readBody(event)
    const validated = createPartnerSchema.parse(body)
    const currentUserId = BigInt(user.id)

    const partnerUser = await prisma.user.findUnique({
      where: { email: validated.partnerEmail },
      select: { id: true, email: true, name: true },
    })

    if (!partnerUser) {
      throw Errors.userNotFound()
    }

    const ordered = orderPartnerUserIds(currentUserId, partnerUser.id)
    const existing = await prisma.partnerLink.findUnique({
      where: {
        userAId_userBId: ordered,
      },
    })

    if (existing) {
      throw Errors.partnerLinkAlreadyExists()
    }

    const link = await prisma.partnerLink.create({
      data: {
        ...ordered,
        initiatedByUserId: currentUserId,
      },
      include: {
        userA: {
          select: { id: true, email: true, name: true },
        },
        userB: {
          select: { id: true, email: true, name: true },
        },
      },
    })

    log.info('Partner link created', {
      userId: user.id,
      partnerUserId: partnerUser.id.toString(),
      linkId: link.id.toString(),
    })

    return {
      link: serializePartnerLink(link as PartnerLinkRecord, user.id),
    }
  } catch (error) {
    if (error instanceof AppError) {
      throw error.toH3Error()
    }
    if (error instanceof z.ZodError) {
      throw Errors.validationError(error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }))).toH3Error()
    }
    throw Errors.internalError(error).toH3Error()
  }
})
