import { z } from 'zod'
import { logger } from '~/lib/logger'
import { requireUser } from '~/server/utils/auth'
import { parsePositiveBigIntParam } from '~/server/utils/validation'
import { updatePartnerSharing } from '~/server/utils/partner'
import { serializePartnerLink } from '~/server/utils/partner-response'
import type { PartnerLinkRecord } from '~/types/partner'
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

    const updated = await updatePartnerSharing(linkId, user.id, validated)

    return serialize({
      link: serializePartnerLink(updated as PartnerLinkRecord, user.id),
    })
  } catch (error) {
    handleApiError(error, log)
  }
})
