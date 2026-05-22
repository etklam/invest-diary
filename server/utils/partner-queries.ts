import prisma from '~/lib/prisma'

export const PARTICIPANT_SELECT = {
  id: true,
  email: true,
  name: true,
} as const

export const LINK_INCLUDE = {
  userA: {
    select: PARTICIPANT_SELECT,
  },
  userB: {
    select: PARTICIPANT_SELECT,
  },
} as const

export async function findUserPartnerLinks(userId: bigint) {
  return prisma.partnerLink.findMany({
    where: {
      OR: [
        { userAId: userId },
        { userBId: userId },
      ],
    },
    include: LINK_INCLUDE,
    orderBy: [
      { acceptedAt: 'desc' },
      { updatedAt: 'desc' },
    ],
  })
}

export async function findPartnerLinkById(linkId: bigint) {
  return prisma.partnerLink.findUnique({
    where: { id: linkId },
    include: LINK_INCLUDE,
  })
}
