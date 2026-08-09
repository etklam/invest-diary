import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockFindMany = vi.fn()
const mockFindUnique = vi.fn()
const mockUserFindUnique = vi.fn()
const mockDiaryFindMany = vi.fn()

vi.mock('~/lib/prisma', () => ({
  default: {
    partnerLink: {
      findMany: mockFindMany,
      findUnique: mockFindUnique,
    },
    user: {
      findUnique: mockUserFindUnique,
    },
    diary: {
      findMany: mockDiaryFindMany,
    },
  },
}))

describe('server/utils/partner-queries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  describe('findUserPartnerLinks', () => {
    it('calls prisma.partnerLink.findMany with correct WHERE, include, and orderBy', async () => {
      mockFindMany.mockResolvedValue([])

      const { findUserPartnerLinks } = await import('~/server/utils/partner-queries')

      const userId = 5n
      await findUserPartnerLinks(userId)

      expect(mockFindMany).toHaveBeenCalledTimes(1)
      expect(mockFindMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { userAId: userId },
            { userBId: userId },
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
    })

    it('returns the result from prisma.partnerLink.findMany', async () => {
      const fakeLinks = [
        { id: 1n, userAId: 5n, userBId: 10n },
        { id: 2n, userAId: 3n, userBId: 5n },
      ]
      mockFindMany.mockResolvedValue(fakeLinks)

      const { findUserPartnerLinks } = await import('~/server/utils/partner-queries')

      const result = await findUserPartnerLinks(5n)

      expect(result).toEqual(fakeLinks)
    })
  })

  describe('findPartnerLinkById', () => {
    it('calls prisma.partnerLink.findUnique with correct WHERE and include', async () => {
      mockFindUnique.mockResolvedValue(null)

      const { findPartnerLinkById } = await import('~/server/utils/partner-queries')

      const linkId = 42n
      await findPartnerLinkById(linkId)

      expect(mockFindUnique).toHaveBeenCalledTimes(1)
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { id: linkId },
        include: {
          userA: {
            select: { id: true, email: true, name: true },
          },
          userB: {
            select: { id: true, email: true, name: true },
          },
        },
      })
    })

    it('returns the result from prisma.partnerLink.findUnique', async () => {
      const fakeLink = { id: 42n, userAId: 5n, userBId: 10n }
      mockFindUnique.mockResolvedValue(fakeLink)

      const { findPartnerLinkById } = await import('~/server/utils/partner-queries')

      const result = await findPartnerLinkById(42n)

      expect(result).toEqual(fakeLink)
    })

    it('returns null when link is not found', async () => {
      mockFindUnique.mockResolvedValue(null)

      const { findPartnerLinkById } = await import('~/server/utils/partner-queries')

      const result = await findPartnerLinkById(999n)

      expect(result).toBeNull()
    })
  })

  describe('LINK_INCLUDE constant', () => {
    it('exports the shared include pattern with userA and userB', async () => {
      const { LINK_INCLUDE } = await import('~/server/utils/partner-queries')

      expect(LINK_INCLUDE).toEqual({
        userA: {
          select: { id: true, email: true, name: true },
        },
        userB: {
          select: { id: true, email: true, name: true },
        },
      })
    })
  })

  describe('PARTICIPANT_SELECT constant', () => {
    it('exports the shared select pattern for participant fields', async () => {
      const { PARTICIPANT_SELECT } = await import('~/server/utils/partner-queries')

      expect(PARTICIPANT_SELECT).toEqual({
        id: true,
        email: true,
        name: true,
      })
    })
  })

  it('keeps Pair View on an explicit allowlist that excludes private decision and review fields', async () => {
    const { COMPARE_DIARY_SELECT } = await import('~/server/utils/partner-queries')
    const selected = Object.keys(COMPARE_DIARY_SELECT)

    expect(selected).toEqual([
      'id', 'userId', 'title', 'content', 'tagsString', 'createdVia',
      'createdByLabel', 'date', 'createdAt', 'updatedAt',
    ])
    expect(selected).not.toEqual(expect.arrayContaining([
      'thesis', 'risk', 'execution', 'reviewDueAt', 'reviewStatus', 'reviewedAt',
      'reviewOutcome', 'reviewSummary', 'reviewLearning', 'reviewAdjustment',
    ]))
  })

  // ─── loadCompareContext ────────────────────────────────────────────────────

  describe('loadCompareContext', () => {
    const fakeViewer = {
      id: 5n,
      email: 'owner@example.com',
      name: 'Owner',
      timezone: 'Asia/Taipei',
    }

    const fakeAcceptedLink = {
      id: 11n,
      userAId: 5n,
      userBId: 7n,
      initiatedByUserId: 5n,
      acceptedAt: new Date('2026-04-09T00:00:00.000Z'),
      userASharesDiaries: true,
      userBSharesDiaries: true,
      userASharesStockNotes: false,
      userBSharesStockNotes: false,
      createdAt: new Date('2026-04-09T00:00:00.000Z'),
      updatedAt: new Date('2026-04-09T00:00:00.000Z'),
      userA: { id: 5n, email: 'owner@example.com', name: 'Owner' },
      userB: { id: 7n, email: 'partner@example.com', name: 'Partner' },
    }

    const fakePendingLink = {
      ...fakeAcceptedLink,
      id: 12n,
      acceptedAt: null,
      initiatedByUserId: 7n,
    }

    const fakeOwnerDiaries = [
      {
        id: 21n,
        userId: 5n,
        title: 'Owner diary',
        content: 'content',
        tagsString: 'watch',
        createdVia: 'WEB',
        createdByLabel: null,
        date: new Date('2026-04-09T12:00:00.000Z'),
        createdAt: new Date('2026-04-09T12:00:00.000Z'),
        updatedAt: new Date('2026-04-09T12:00:00.000Z'),
      },
    ]

    const fakePartnerDiaries = [
      {
        id: 22n,
        userId: 7n,
        title: 'Partner diary',
        content: 'content',
        tagsString: 'watch',
        createdVia: 'API_KEY',
        createdByLabel: 'OpenClaw',
        date: new Date('2026-04-09T12:00:00.000Z'),
        createdAt: new Date('2026-04-09T12:00:00.000Z'),
        updatedAt: new Date('2026-04-09T12:00:00.000Z'),
      },
    ]

    it('returns viewer, links, selectedLink, ownerDiaries, partnerDiaries on happy path', async () => {
      mockUserFindUnique.mockResolvedValue(fakeViewer)
      mockFindMany.mockResolvedValue([fakeAcceptedLink])
      mockDiaryFindMany
        .mockResolvedValueOnce(fakeOwnerDiaries)
        .mockResolvedValueOnce(fakePartnerDiaries)

      const { loadCompareContext } = await import('~/server/utils/partner-queries')

      const ctx = await loadCompareContext(5n)

      expect(ctx.viewer).toEqual(fakeViewer)
      expect(ctx.links).toHaveLength(1)
      expect(ctx.selectedLink).toEqual(fakeAcceptedLink)
      expect(ctx.ownerDiaries).toEqual(fakeOwnerDiaries)
      expect(ctx.partnerDiaries).toEqual(fakePartnerDiaries)
    })

    it('throws userNotFound when viewer does not exist', async () => {
      mockUserFindUnique.mockResolvedValue(null)

      const { loadCompareContext } = await import('~/server/utils/partner-queries')

      await expect(loadCompareContext(999n)).rejects.toMatchObject({
        statusCode: 404,
        code: 'USER_NOT_FOUND',
      })
    })

    it('returns null selectedLink when no accepted links exist and no partnerId specified', async () => {
      mockUserFindUnique.mockResolvedValue(fakeViewer)
      mockFindMany.mockResolvedValue([fakePendingLink])

      const { loadCompareContext } = await import('~/server/utils/partner-queries')

      const ctx = await loadCompareContext(5n)

      expect(ctx.selectedLink).toBeNull()
      expect(ctx.ownerDiaries).toEqual([])
      expect(ctx.partnerDiaries).toEqual([])
    })

    it('selects link matching partnerId among accepted links', async () => {
      const otherAcceptedLink = {
        ...fakeAcceptedLink,
        id: 13n,
        userBId: 9n,
        userB: { id: 9n, email: 'other@example.com', name: 'Other' },
      }
      mockUserFindUnique.mockResolvedValue(fakeViewer)
      mockFindMany.mockResolvedValue([otherAcceptedLink, fakeAcceptedLink])
      mockDiaryFindMany
        .mockResolvedValueOnce(fakeOwnerDiaries)
        .mockResolvedValueOnce(fakePartnerDiaries)

      const { loadCompareContext } = await import('~/server/utils/partner-queries')

      const ctx = await loadCompareContext(5n, { partnerId: '7' })

      expect(ctx.selectedLink).toEqual(fakeAcceptedLink)
    })

    it('throws partnerLinkPending when requested partnerId has a pending (non-accepted) link', async () => {
      mockUserFindUnique.mockResolvedValue(fakeViewer)
      mockFindMany.mockResolvedValue([fakePendingLink])

      const { loadCompareContext } = await import('~/server/utils/partner-queries')

      await expect(loadCompareContext(5n, { partnerId: '7' })).rejects.toMatchObject({
        statusCode: 409,
        code: 'PARTNER_LINK_PENDING',
      })
    })

    it('throws partnerLinkNotFound when requested partnerId has no link at all', async () => {
      mockUserFindUnique.mockResolvedValue(fakeViewer)
      mockFindMany.mockResolvedValue([fakeAcceptedLink])

      const { loadCompareContext } = await import('~/server/utils/partner-queries')

      await expect(loadCompareContext(5n, { partnerId: '999' })).rejects.toMatchObject({
        statusCode: 404,
        code: 'PARTNER_LINK_NOT_FOUND',
      })
    })

    it('returns empty partnerDiaries when partner has not enabled diary sharing', async () => {
      const unsharedLink = {
        ...fakeAcceptedLink,
        userBSharesDiaries: false,
      }
      mockUserFindUnique.mockResolvedValue(fakeViewer)
      mockFindMany.mockResolvedValue([unsharedLink])
      mockDiaryFindMany.mockResolvedValueOnce(fakeOwnerDiaries)

      const { loadCompareContext } = await import('~/server/utils/partner-queries')

      const ctx = await loadCompareContext(5n)

      expect(ctx.ownerDiaries).toEqual(fakeOwnerDiaries)
      expect(ctx.partnerDiaries).toEqual([])
    })

    it('passes limit option to diary queries', async () => {
      mockUserFindUnique.mockResolvedValue(fakeViewer)
      mockFindMany.mockResolvedValue([fakeAcceptedLink])
      mockDiaryFindMany
        .mockResolvedValueOnce(fakeOwnerDiaries)
        .mockResolvedValueOnce(fakePartnerDiaries)

      const { loadCompareContext } = await import('~/server/utils/partner-queries')

      await loadCompareContext(5n, { limit: 15 })

      const ownerCall = mockDiaryFindMany.mock.calls[0][0]
      expect(ownerCall.take).toBe(15)
    })

    it('clamps limit to minimum 1', async () => {
      mockUserFindUnique.mockResolvedValue(fakeViewer)
      mockFindMany.mockResolvedValue([fakeAcceptedLink])
      mockDiaryFindMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])

      const { loadCompareContext } = await import('~/server/utils/partner-queries')

      await loadCompareContext(5n, { limit: 0 })

      const ownerCall = mockDiaryFindMany.mock.calls[0][0]
      expect(ownerCall.take).toBe(1)
    })

    it('clamps limit to maximum 60', async () => {
      mockUserFindUnique.mockResolvedValue(fakeViewer)
      mockFindMany.mockResolvedValue([fakeAcceptedLink])
      mockDiaryFindMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])

      const { loadCompareContext } = await import('~/server/utils/partner-queries')

      await loadCompareContext(5n, { limit: 100 })

      const ownerCall = mockDiaryFindMany.mock.calls[0][0]
      expect(ownerCall.take).toBe(60)
    })

    it('defaults limit to 20 when not provided', async () => {
      mockUserFindUnique.mockResolvedValue(fakeViewer)
      mockFindMany.mockResolvedValue([fakeAcceptedLink])
      mockDiaryFindMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])

      const { loadCompareContext } = await import('~/server/utils/partner-queries')

      await loadCompareContext(5n)

      const ownerCall = mockDiaryFindMany.mock.calls[0][0]
      expect(ownerCall.take).toBe(20)
    })

    it('only queries partner diaries when partnerSharesDiaries is true', async () => {
      mockUserFindUnique.mockResolvedValue(fakeViewer)
      mockFindMany.mockResolvedValue([fakeAcceptedLink])
      mockDiaryFindMany
        .mockResolvedValueOnce(fakeOwnerDiaries)
        .mockResolvedValueOnce(fakePartnerDiaries)

      const { loadCompareContext } = await import('~/server/utils/partner-queries')

      await loadCompareContext(5n)

      expect(mockDiaryFindMany).toHaveBeenCalledTimes(2)
      const partnerCall = mockDiaryFindMany.mock.calls[1][0]
      expect(partnerCall.where.userId).toBe(7n)
    })

    it('does not query partner diaries when partnerSharesDiaries is false', async () => {
      const unsharedLink = {
        ...fakeAcceptedLink,
        userBSharesDiaries: false,
      }
      mockUserFindUnique.mockResolvedValue(fakeViewer)
      mockFindMany.mockResolvedValue([unsharedLink])
      mockDiaryFindMany.mockResolvedValueOnce(fakeOwnerDiaries)

      const { loadCompareContext } = await import('~/server/utils/partner-queries')

      await loadCompareContext(5n)

      expect(mockDiaryFindMany).toHaveBeenCalledTimes(1)
    })
  })
})
