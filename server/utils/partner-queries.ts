import prisma from '~/lib/prisma'
import { Errors } from '~/lib/errors/factory'
import { getPartnerLinkStatus, getPartnerSide } from '~/lib/partners/policy'
import type { PartnerLinkRecord } from '~/types/partner'

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

const COMPARE_DIARY_SELECT = {
  id: true,
  userId: true,
  title: true,
  content: true,
  tagsString: true,
  createdVia: true,
  createdByLabel: true,
  date: true,
  createdAt: true,
  updatedAt: true,
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

// ─── Compare Context ─────────────────────────────────────────────────────────
//
// Deep module that encapsulates the entire pre-buildCompareDays pipeline:
// viewer lookup, link selection (with pending/not-found error semantics),
// diary loading gated on partnerSharesDiaries permission.

export interface CompareContext {
  viewer: {
    id: bigint
    email: string
    name: string | null
    timezone: string | null
  }
  links: PartnerLinkRecord[]
  selectedLink: PartnerLinkRecord | null
  ownerDiaries: Record<string, unknown>[]
  partnerDiaries: Record<string, unknown>[]
}

function clampLimit(value: number | undefined): number {
  if (value === undefined || Number.isNaN(value)) return 20
  return Math.min(Math.max(value, 1), 60)
}

export async function loadCompareContext(
  viewerId: bigint,
  options?: { partnerId?: string, limit?: number },
): Promise<CompareContext> {
  const limit = clampLimit(options?.limit)

  const [viewer, links] = await Promise.all([
    prisma.user.findUnique({
      where: { id: viewerId },
      select: {
        id: true,
        email: true,
        name: true,
        timezone: true,
      },
    }),
    findUserPartnerLinks(viewerId),
  ])

  if (!viewer) {
    throw Errors.userNotFound()
  }

  const typedLinks = links as PartnerLinkRecord[]
  const acceptedLinks = typedLinks.filter(
    link => getPartnerLinkStatus(link, viewer.id) === 'connected',
  )

  let selectedLink: PartnerLinkRecord | null = acceptedLinks[0] ?? null

  if (options?.partnerId) {
    selectedLink = acceptedLinks.find(
      (link) => getPartnerSide(link, viewer.id.toString()).partner.id.toString() === options.partnerId,
    ) ?? null

    if (!selectedLink) {
      const pendingLink = typedLinks.find(
        (link) => getPartnerSide(link, viewer.id.toString()).partner.id.toString() === options.partnerId,
      )

      if (pendingLink) {
        throw Errors.partnerLinkPending()
      }

      throw Errors.partnerLinkNotFound()
    }
  }

  if (!selectedLink) {
    return {
      viewer,
      links: typedLinks,
      selectedLink: null,
      ownerDiaries: [],
      partnerDiaries: [],
    }
  }

  const side = getPartnerSide(selectedLink, viewer.id.toString())

  const [ownerDiaries, partnerDiaries] = await Promise.all([
    prisma.diary.findMany({
      where: { userId: viewerId },
      orderBy: { date: 'desc' },
      take: limit,
      select: COMPARE_DIARY_SELECT,
    }),
    side.partnerSharesDiaries
      ? prisma.diary.findMany({
          where: { userId: side.partner.id },
          orderBy: { date: 'desc' },
          take: limit,
          select: COMPARE_DIARY_SELECT,
        })
      : Promise.resolve([]),
  ])

  return {
    viewer,
    links: typedLinks,
    selectedLink,
    ownerDiaries: ownerDiaries as Record<string, unknown>[],
    partnerDiaries: partnerDiaries as Record<string, unknown>[],
  }
}
