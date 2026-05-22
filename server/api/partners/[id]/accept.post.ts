import prisma from '~/lib/prisma'
import { logger } from '~/lib/logger'
import { Errors } from '~/lib/errors/factory'
import { requireUser } from '~/server/utils/auth'
import { parsePositiveBigIntParam } from '~/server/utils/validation'
import { getPartnerSide, type PartnerLinkRecord } from '~/server/utils/partner'
import { findPartnerLinkById, LINK_INCLUDE } from '~/server/utils/partner-queries'
import { serializePartnerLink } from '~/server/utils/partner-response'
import { handleApiError } from '~/server/utils/error-handler'
import { serialize } from '~/server/utils/serialize'

export default defineEventHandler(async (event) => {
  const log = logger.api.withRequestId(event.context.requestId)
  try {
    const user = requireUser(event)
    const linkId = parsePositiveBigIntParam(event, 'id')

    const link = await findPartnerLinkById(linkId)

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
      include: LINK_INCLUDE,
    })

    return serialize({
      link: serializePartnerLink(accepted as PartnerLinkRecord, user.id),
    })
  } catch (error) {
    handleApiError(error, log)
  }
})
