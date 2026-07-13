import { z } from 'zod'
import { logger } from '~/lib/logger'
import { requireUser } from '~/server/utils/auth'
import { normalizeInput } from '~/server/utils/validation'
import { getPartnerSide } from '~/lib/partners/policy'
import { createPartnerLink } from '~/server/utils/partner'
import { serializePartnerLink } from '~/server/utils/partner-response'
import type { PartnerLinkRecord } from '~/types/partner'
import { handleApiError } from '~/server/utils/error-handler'

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
    const link = await createPartnerLink(user.id, validated.partnerEmail)

    log.info('Partner link created', {
      userId: user.id,
      partnerUserId: String(getPartnerSide(link as PartnerLinkRecord, user.id).partner.id),
      linkId: String(link.id),
    })

    return {
      link: serializePartnerLink(link as PartnerLinkRecord, user.id),
    }
  } catch (error) {
    handleApiError(error, log)
  }
})
