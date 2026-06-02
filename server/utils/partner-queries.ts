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

export async function findPartnerUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
    select: PARTICIPANT_SELECT,
  })
}

export async function findPartnerLinkByUserPair(userAId: bigint, userBId: bigint) {
  return prisma.partnerLink.findUnique({
    where: {
      userAId_userBId: { userAId, userBId },
    },
    include: LINK_INCLUDE,
  })
}

export async function findPartnerLinkBetweenUsers(userId: bigint, partnerUserId: bigint) {
  return prisma.partnerLink.findFirst({
    where: {
      OR: [
        { userAId: userId, userBId: partnerUserId },
        { userAId: partnerUserId, userBId: userId },
      ],
    },
    include: LINK_INCLUDE,
  })
}

export async function createPartnerLinkRecord(userAId: bigint, userBId: bigint, initiatedByUserId: bigint) {
  return prisma.partnerLink.create({
    data: { userAId, userBId, initiatedByUserId },
    include: LINK_INCLUDE,
  })
}

export async function updatePartnerLinkRecord(linkId: bigint, data: Record<string, boolean | Date>) {
  return prisma.partnerLink.update({
    where: { id: linkId },
    data,
    include: LINK_INCLUDE,
  })
}

export async function deletePartnerLinkRecord(linkId: bigint) {
  return prisma.partnerLink.delete({
    where: { id: linkId },
  })
}
