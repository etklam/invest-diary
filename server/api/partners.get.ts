import prisma from '~/lib/prisma'
import { requireUser } from '~/server/utils/auth'
import { serializePartnerLink } from '~/server/utils/partner-response'
import type { PartnerLinkRecord } from '~/server/utils/partner'

export default defineEventHandler(async (event) => {
  const user = requireUser(event)
  const currentUserId = BigInt(user.id)

  const links = await prisma.partnerLink.findMany({
    where: {
      OR: [
        { userAId: currentUserId },
        { userBId: currentUserId },
      ],
    },
    include: {
      userA: {
        select: { id: true, email: true, name: true },
      },
      userB: {
        select: { id: true, email: true, name: true },
      },
    },
    orderBy: [
      { acceptedAt: 'desc' },
      { updatedAt: 'desc' },
    ],
  })

  return {
    links: links.map((link: (typeof links)[number]) => serializePartnerLink(link as PartnerLinkRecord, user.id)),
  }
})
