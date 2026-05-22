import prisma from '~/lib/prisma'
import { formatYmdInTimezone } from '~/lib/diary-date'
import { Errors } from '~/lib/errors/factory'
import { logger } from '~/lib/logger'
import { requireUser } from '~/server/utils/auth'
import { getPartnerSide, type PartnerLinkRecord } from '~/server/utils/partner'
import { serializeDiaryForPartnerView, serializePartnerLink } from '~/server/utils/partner-response'
import { handleApiError } from '~/server/utils/error-handler'
import { serialize } from '~/server/utils/serialize'

export default defineEventHandler(async (event) => {
  const log = logger.api.withRequestId(event.context.requestId)
  try {
    const user = requireUser(event)
    const currentUserId = BigInt(user.id)
    const query = getQuery(event)
    const requestedPartnerId = typeof query.partnerId === 'string' ? query.partnerId : undefined
    const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 60)

    const [viewer, links] = await Promise.all([
      prisma.user.findUnique({
        where: { id: currentUserId },
        select: {
          id: true,
          email: true,
          name: true,
          timezone: true,
        },
      }),
      prisma.partnerLink.findMany({
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
      }),
    ])

    if (!viewer) {
      throw Errors.userNotFound()
    }

    const serializedLinks = links.map((link: (typeof links)[number]) => serializePartnerLink(link as PartnerLinkRecord, user.id))
    const acceptedLinks = links.filter((link: (typeof links)[number]) => Boolean(link.acceptedAt))

    let selectedLink = acceptedLinks[0] as (typeof links)[number] | undefined
    if (requestedPartnerId) {
      selectedLink = acceptedLinks.find((link: (typeof acceptedLinks)[number]) =>
        getPartnerSide(link as PartnerLinkRecord, user.id).partner.id.toString() === requestedPartnerId,
      )

      if (!selectedLink) {
        const pendingLink = links.find((link: (typeof links)[number]) =>
          getPartnerSide(link as PartnerLinkRecord, user.id).partner.id.toString() === requestedPartnerId,
        )

        if (pendingLink) {
          throw Errors.partnerLinkPending()
        }

        throw Errors.partnerLinkNotFound()
      }
    }

    if (!selectedLink) {
      return serialize({
        owner: {
          id: viewer.id,
          email: viewer.email,
          name: viewer.name,
        },
        partner: null,
        selectedPartnerId: null,
        links: serializedLinks,
        compareDays: [],
      })
    }

    const side = getPartnerSide(selectedLink as PartnerLinkRecord, user.id)
    const timeZone = viewer.timezone || 'Asia/Taipei'

    const [ownerDiaries, partnerDiaries] = await Promise.all([
      prisma.diary.findMany({
        where: { userId: currentUserId },
        orderBy: { date: 'desc' },
        take: limit,
        select: {
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
        },
      }),
      side.partnerSharesDiaries
        ? prisma.diary.findMany({
            where: { userId: side.partner.id },
            orderBy: { date: 'desc' },
            take: limit,
            select: {
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
            },
          })
        : Promise.resolve([]),
    ])

    const ownerDatePairs = ownerDiaries.map((diary: (typeof ownerDiaries)[number]) => [formatYmdInTimezone(diary.date, timeZone), diary] as const)
    const partnerDatePairs = partnerDiaries.map((diary: (typeof partnerDiaries)[number]) => [formatYmdInTimezone(diary.date, timeZone), diary] as const)
    const ownerByDate = new Map(ownerDatePairs)
    const partnerByDate = new Map(partnerDatePairs)
    const compareDays = Array.from(new Set<string>([
      ...ownerDatePairs.map(([dateKey]: readonly [string, (typeof ownerDiaries)[number]]) => dateKey),
      ...partnerDatePairs.map(([dateKey]: readonly [string, (typeof partnerDiaries)[number]]) => dateKey),
    ]))
      .sort((left, right) => right.localeCompare(left))
      .slice(0, limit)
      .map((dateKey) => ({
        dateKey,
        ownerDiary: serializeDiaryForPartnerView(ownerByDate.get(dateKey) as any),
        partnerDiary: serializeDiaryForPartnerView(partnerByDate.get(dateKey) as any),
      }))

    return serialize({
      owner: {
        id: viewer.id,
        email: viewer.email,
        name: viewer.name,
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
