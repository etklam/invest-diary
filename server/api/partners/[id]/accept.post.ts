import { logger } from '~/lib/logger'
import { requireUser } from '~/server/utils/auth'
import { parsePositiveBigIntParam } from '~/server/utils/validation'
import { acceptPartnerLink } from '~/server/utils/partner'
import { serializePartnerLink } from '~/server/utils/partner-response'
import type { PartnerLinkRecord } from '~/types/partner'
import { handleApiError } from '~/server/utils/error-handler'
import { serialize } from '~/server/utils/serialize'

export default defineEventHandler(async (event) => {
  const log = logger.api.withRequestId(event.context.requestId)
  try {
    const user = requireUser(event)
    const linkId = parsePositiveBigIntParam(event, 'id')

    const accepted = await acceptPartnerLink(linkId, user.id)

    return serialize({
      link: serializePartnerLink(accepted as PartnerLinkRecord, user.id),
    })
  } catch (error) {
    handleApiError(error, log)
  }
})
