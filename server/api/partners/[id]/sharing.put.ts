import { z } from 'zod'
import prisma from '~/lib/prisma'
import { logger } from '~/lib/logger'
import { Errors } from '~/lib/errors/factory'
import { requireUser } from '~/server/utils/auth'
import { parsePositiveBigIntParam } from '~/server/utils/validation'
import { getPartnerSide, type PartnerLinkRecord } from '~/server/utils/partner'
import { serializePartnerLink } from '~/server/utils/partner-response'
import { handleApiError } from '~/server/utils/error-handler'

const sharingSchema = z.object({
  shareDiaries: z.boolean(),
})

export default defineEventHandler(async (event) => {
  const log = logger.api.withRequestId(event.context.requestId)
  try {
    const user = requireUser(event)
    const linkId = parsePositiveBigIntParam(event, 'id')
    const body = await readBody(event)
    const validated = sharingSchema.parse(body)

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
    if (!side.accepted) {
      throw Errors.partnerLinkPending()
    }

    const updated = await prisma.partnerLink.update({
      where: { id: linkId },
      data: {
        [side.shareField]: validated.shareDiaries,
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

    return {
      link: serializePartnerLink(updated as PartnerLinkRecord, user.id),
    }
  } catch (error) {
    handleApiError(error, log)
  }
})
