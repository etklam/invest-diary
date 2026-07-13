import { requireUser } from '~/server/utils/auth'
import { getPartnerSide } from '~/lib/partners/policy'
import { buildCompareDays } from '~/server/utils/partner-compare'
import { loadCompareContext } from '~/server/utils/partner-queries'
import { serializePartnerLink } from '~/server/utils/partner-response'
import { handleApiError } from '~/server/utils/error-handler'
import { serialize } from '~/server/utils/serialize'
import { logger } from '~/lib/logger'
import type { PartnerLinkRecord } from '~/types/partner'

export default defineEventHandler(async (event) => {
  const log = logger.api.withRequestId(event.context.requestId)
  try {
    const user = requireUser(event)
    const query = getQuery(event)
    const requestedPartnerId = typeof query.partnerId === 'string' ? query.partnerId : undefined
    const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 60)

    const ctx = await loadCompareContext(BigInt(user.id), {
      partnerId: requestedPartnerId,
      limit,
    })

    const serializedLinks = ctx.links.map((link) =>
      serializePartnerLink(link, user.id),
    )

    if (!ctx.selectedLink) {
      return serialize({
        owner: {
          id: ctx.viewer.id,
          email: ctx.viewer.email,
          name: ctx.viewer.name,
        },
        partner: null,
        selectedPartnerId: null,
        links: serializedLinks,
        compareDays: [],
      })
    }

    const side = getPartnerSide(ctx.selectedLink as PartnerLinkRecord, user.id)
    const timeZone = ctx.viewer.timezone || 'Asia/Taipei'

    const compareDays = buildCompareDays(
      ctx.ownerDiaries as any[],
      ctx.partnerDiaries as any[],
      timeZone,
      limit,
    )

    return serialize({
      owner: {
        id: ctx.viewer.id,
        email: ctx.viewer.email,
        name: ctx.viewer.name,
      },
      partner: {
        id: side.partner.id,
        email: side.partner.email,
        name: side.partner.name,
      },
      selectedPartnerId: side.partner.id,
      links: serializedLinks,
      compareDays,
    })
  } catch (error) {
    handleApiError(error, log)
  }
})
