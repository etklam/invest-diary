import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockFindUserPartnerLinks = vi.fn()

vi.mock('~/server/utils/partner-queries', () => ({
  findUserPartnerLinks: mockFindUserPartnerLinks,
}))

function makeLink(overrides: Partial<{
  acceptedAt: Date | null
  initiatedByUserId: bigint
  userBSharesDiaries: boolean
  userBSharesStockNotes: boolean
  partnerName: string | null
}> = {}) {
  return {
    id: 11n,
    userAId: 1n,
    userBId: 2n,
    initiatedByUserId: overrides.initiatedByUserId ?? 1n,
    acceptedAt: overrides.acceptedAt === undefined
      ? new Date('2026-01-01T00:00:00.000Z')
      : overrides.acceptedAt,
    userASharesDiaries: false,
    userBSharesDiaries: overrides.userBSharesDiaries ?? true,
    userASharesStockNotes: false,
    userBSharesStockNotes: overrides.userBSharesStockNotes ?? true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    userA: { id: 1n, email: 'owner@example.com', name: 'Owner' },
    userB: {
      id: 2n,
      email: 'partner@example.com',
      name: overrides.partnerName === undefined ? 'Partner' : overrides.partnerName,
    },
  }
}

describe('server/utils/partner sharing gate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('lists connected partners sharing the requested resource with their link', async () => {
    const link = makeLink({ partnerName: null })
    mockFindUserPartnerLinks.mockResolvedValue([link])

    const { listSharingPartners } = await import('~/server/utils/partner')

    await expect(listSharingPartners(1n, 'stockNotes')).resolves.toEqual([{
      partnerId: 2n,
      name: 'partner@example.com',
      link,
    }])
  })

  it.each([
    ['connected-but-not-sharing', makeLink({ userBSharesStockNotes: false })],
    ['pending link', makeLink({ acceptedAt: null, userBSharesStockNotes: true })],
    ['no link', null],
  ])('excludes %s from the sharing list', async (_caseName, link) => {
    mockFindUserPartnerLinks.mockResolvedValue(link ? [link] : [])

    const { listSharingPartners } = await import('~/server/utils/partner')

    await expect(listSharingPartners(1n, 'stockNotes')).resolves.toEqual([])
  })

  it('uses the diary sharing flag independently from stock-note sharing', async () => {
    const link = makeLink({ userBSharesDiaries: true, userBSharesStockNotes: false })
    mockFindUserPartnerLinks.mockResolvedValue([link])

    const { listSharingPartners } = await import('~/server/utils/partner')

    await expect(listSharingPartners(1n, 'diaries')).resolves.toHaveLength(1)
    await expect(listSharingPartners(1n, 'stockNotes')).resolves.toEqual([])
  })
})
