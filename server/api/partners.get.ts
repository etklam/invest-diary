import { requireUser } from '~/server/utils/auth'
import { serializePartnerLink } from '~/server/utils/partner-response'
import type { PartnerLinkRecord } from '~/server/utils/partner'
import { findUserPartnerLinks } from '~/server/utils/partner-queries'
import { serialize } from '~/server/utils/serialize'

export default defineEventHandler(async (event) => {
  const user = requireUser(event)
  const currentUserId = BigInt(user.id)

  const links = await findUserPartnerLinks(currentUserId)

  return serialize({
    links: links.map((link: (typeof links)[number]) => serializePartnerLink(link as PartnerLinkRecord, user.id)),
  })
})
