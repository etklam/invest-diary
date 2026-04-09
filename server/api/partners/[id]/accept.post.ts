import prisma from '~/lib/prisma'
import { AppError, Errors } from '~/lib/errors/factory'
import { requireUser } from '~/server/utils/auth'
import { parsePositiveBigIntParam } from '~/server/utils/validation'
import { getPartnerSide, type PartnerLinkRecord } from '~/server/utils/partner'
import { serializePartnerLink } from '~/server/utils/partner-response'

export default defineEventHandler(async (event) => {
  try {
    const user = requireUser(event)
    const linkId = parsePositiveBigIntParam(event, 'id')

    const link = await prisma.partnerLink.findUnique({
      where: { id: linkId },
      include: {
        userA: {
          select: { id: true, email: true, name: true },
        },
        userB: {
          select: { id: true, email: true, name: true },
        },
      },
    })

    if (!link) {
      throw Errors.partnerLinkNotFound()
    }

    const side = getPartnerSide(link as PartnerLinkRecord, user.id)
    if (!side.pendingIncoming) {
      throw Errors.partnerLinkAccessDenied()
    }

    const accepted = await prisma.partnerLink.update({
      where: { id: linkId },
      data: { acceptedAt: new Date() },
      include: {
        userA: {
          select: { id: true, email: true, name: true },
        },
        userB: {
          select: { id: true, email: true, name: true },
        },
      },
    })

    return {
      link: serializePartnerLink(accepted as PartnerLinkRecord, user.id),
    }
  } catch (error) {
    if (error instanceof AppError) {
      throw error.toH3Error()
    }
    throw Errors.internalError(error).toH3Error()
  }
})
