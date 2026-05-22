import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockFindMany = vi.fn()
const mockFindUnique = vi.fn()

vi.mock('~/lib/prisma', () => ({
  default: {
    partnerLink: {
      findMany: mockFindMany,
      findUnique: mockFindUnique,
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
})
