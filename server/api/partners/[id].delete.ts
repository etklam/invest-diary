import prisma from '~/lib/prisma'
import { logger } from '~/lib/logger'
import { Errors } from '~/lib/errors/factory'
import { requireUser } from '~/server/utils/auth'
import { parsePositiveBigIntParam } from '~/server/utils/validation'
import { assertPartnerParticipant } from '~/server/utils/partner'
import { handleApiError } from '~/server/utils/error-handler'

export default defineEventHandler(async (event) => {
  const log = logger.api.withRequestId(event.context.requestId)
  try {
    const user = requireUser(event)
    const linkId = parsePositiveBigIntParam(event, 'id')

    const link = await prisma.partnerLink.findUnique({
      where: { id: linkId },
      select: {
        id: true,
        userAId: true,
        userBId: true,
      },
    })

    if (!link) {
      throw Errors.partnerLinkNotFound()
    }

    assertPartnerParticipant(link, user.id)

    await prisma.partnerLink.delete({
      where: { id: linkId },
    })

    return { success: true }
  } catch (error) {
    handleApiError(error, log)
  }
})
