import { z } from 'zod'
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

const sharingSchema = z.object({
  shareDiaries: z.boolean().optional(),
  shareStockNotes: z.boolean().optional(),
}).refine(data => data.shareDiaries !== undefined || data.shareStockNotes !== undefined, {
  message: 'At least one of shareDiaries or shareStockNotes is required',
})

export default defineEventHandler(async (event) => {
  const log = logger.api.withRequestId(event.context.requestId)
  try {
    const user = requireUser(event)
    const linkId = parsePositiveBigIntParam(event, 'id')
    const body = await readBody(event)
    const validated = sharingSchema.parse(body)

    const link = await findPartnerLinkById(linkId)

    if (!link) {
      throw Errors.partnerLinkNotFound()
    }

    const side = getPartnerSide(link as PartnerLinkRecord, user.id)
    if (!side.accepted) {
      throw Errors.partnerLinkPending()
    }

    const updateData: Record<string, boolean> = {}
    if (validated.shareDiaries !== undefined) {
      updateData[side.diaryShareField] = validated.shareDiaries
    }
    if (validated.shareStockNotes !== undefined) {
      updateData[side.stockNotesShareField] = validated.shareStockNotes
    }

    const updated = await prisma.partnerLink.update({
      where: { id: linkId },
      data: updateData,
      include: LINK_INCLUDE,
    })

    return serialize({
      link: serializePartnerLink(updated as PartnerLinkRecord, user.id),
    })
  } catch (error) {
    handleApiError(error, log)
  }
})
