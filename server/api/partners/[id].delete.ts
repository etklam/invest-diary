import prisma from '~/lib/prisma'
import { AppError, Errors } from '~/lib/errors/factory'
import { requireUser } from '~/server/utils/auth'
import { parsePositiveBigIntParam } from '~/server/utils/validation'
import { assertPartnerParticipant } from '~/server/utils/partner'

export default defineEventHandler(async (event) => {
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
    if (error instanceof AppError) {
      throw error.toH3Error()
    }
    throw Errors.internalError(error).toH3Error()
  }
})
