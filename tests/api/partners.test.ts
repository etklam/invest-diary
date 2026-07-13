import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockGetQuery, mockReadBody } from '../vi-setup'

const mockUserFindUnique = vi.fn()
const mockPartnerLinkFindMany = vi.fn()
const mockPartnerLinkFindUnique = vi.fn()
const mockPartnerLinkCreate = vi.fn()
const mockPartnerLinkUpdate = vi.fn()
const mockPartnerLinkDelete = vi.fn()
const mockDiaryFindMany = vi.fn()
const mockApiLogInfo = vi.fn()
const mockApiWithRequestId = vi.fn(() => ({
  info: mockApiLogInfo,
  warn: vi.fn(),
  error: vi.fn(),
}))

vi.mock('~/lib/prisma', () => ({
  default: {
    user: {
      findUnique: mockUserFindUnique,
    },
    partnerLink: {
      findMany: mockPartnerLinkFindMany,
      findUnique: mockPartnerLinkFindUnique,
      create: mockPartnerLinkCreate,
      update: mockPartnerLinkUpdate,
      delete: mockPartnerLinkDelete,
    },
    diary: {
      findMany: mockDiaryFindMany,
    },
  },
}))

vi.mock('~/lib/logger', () => ({
  logger: {
    api: {
      withRequestId: mockApiWithRequestId,
    },
  },
}))

describe('Partner API routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetQuery.mockReturnValue({})
    mockReadBody.mockResolvedValue(null)
  })

  it('creates a pending partner link from email', async () => {
    mockReadBody.mockResolvedValue({
      partnerEmail: 'Partner@Example.com ',
    })
    mockUserFindUnique.mockResolvedValue({
      id: 7n,
      email: 'partner@example.com',
      name: 'AI Partner',
    })
    mockPartnerLinkCreate.mockResolvedValue({
      id: 9n,
      userAId: 5n,
      userBId: 7n,
      initiatedByUserId: 5n,
      acceptedAt: null,
      userASharesDiaries: false,
      userBSharesDiaries: false,
      createdAt: new Date('2026-04-09T00:00:00.000Z'),
      updatedAt: new Date('2026-04-09T00:00:00.000Z'),
      userA: { id: 5n, email: 'owner@example.com', name: 'Owner' },
      userB: { id: 7n, email: 'partner@example.com', name: 'AI Partner' },
    })

    const { default: handler } = await import('~/server/api/partners.post')

    const result = await handler({
      context: {
        user: { id: '5', email: 'owner@example.com', role: 'USER' },
        requestId: 'req-partner-create',
      },
    } as any)

    expect(mockPartnerLinkCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        userAId: 5n,
        userBId: 7n,
        initiatedByUserId: 5n,
      }),
    }))
    expect(result.link.partner.email).toBe('partner@example.com')
    expect(result.link.status).toBe('pending_outgoing')
    expect(result.link.pendingOutgoing).toBe(true)
  })

  it('allows only the receiving partner to accept a pending link', async () => {
    mockPartnerLinkFindUnique.mockResolvedValue({
      id: 9n,
      userAId: 5n,
      userBId: 7n,
      initiatedByUserId: 7n,
      acceptedAt: null,
      userASharesDiaries: false,
      userBSharesDiaries: false,
      userASharesStockNotes: false,
      userBSharesStockNotes: false,
      createdAt: new Date('2026-04-09T00:00:00.000Z'),
      updatedAt: new Date('2026-04-09T00:00:00.000Z'),
      userA: { id: 5n, email: 'owner@example.com', name: 'Owner' },
      userB: { id: 7n, email: 'partner@example.com', name: 'Partner' },
    })
    mockPartnerLinkUpdate.mockResolvedValue({
      id: 9n,
      userAId: 5n,
      userBId: 7n,
      initiatedByUserId: 7n,
      acceptedAt: new Date('2026-04-10T00:00:00.000Z'),
      userASharesDiaries: false,
      userBSharesDiaries: false,
      userASharesStockNotes: false,
      userBSharesStockNotes: false,
      createdAt: new Date('2026-04-09T00:00:00.000Z'),
      updatedAt: new Date('2026-04-10T00:00:00.000Z'),
      userA: { id: 5n, email: 'owner@example.com', name: 'Owner' },
      userB: { id: 7n, email: 'partner@example.com', name: 'Partner' },
    })

    const { default: handler } = await import('~/server/api/partners/[id]/accept.post')
    const result = await handler({
      context: {
        params: { id: '9' },
        user: { id: '5', email: 'owner@example.com', role: 'USER' },
        requestId: 'req-partner-accept',
      },
    } as any)

    expect(mockPartnerLinkUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 9n },
      data: { acceptedAt: expect.any(Date) },
    }))
    expect(result.link.status).toBe('connected')
    expect(result.link.pendingIncoming).toBe(false)
  })

  it('removes a partner link for either participant', async () => {
    mockPartnerLinkFindUnique.mockResolvedValue({
      id: 9n,
      userAId: 5n,
      userBId: 7n,
    })

    const { default: handler } = await import('~/server/api/partners/[id].delete')
    const result = await handler({
      context: {
        params: { id: '9' },
        user: { id: '5', email: 'owner@example.com', role: 'USER' },
        requestId: 'req-partner-delete',
      },
    } as any)

    expect(mockPartnerLinkDelete).toHaveBeenCalledWith({ where: { id: 9n } })
    expect(result).toEqual({ success: true })
  })

  it('builds same-day compare data and strips private relations', async () => {
    mockGetQuery.mockReturnValue({
      partnerId: '7',
      limit: '10',
    })
    mockUserFindUnique.mockResolvedValue({
      id: 5n,
      email: 'owner@example.com',
      name: 'Owner',
      timezone: 'Asia/Taipei',
    })
    mockPartnerLinkFindMany.mockResolvedValue([
      {
        id: 11n,
        userAId: 5n,
        userBId: 7n,
        initiatedByUserId: 5n,
        acceptedAt: new Date('2026-04-09T00:00:00.000Z'),
        userASharesDiaries: true,
        userBSharesDiaries: true,
        createdAt: new Date('2026-04-09T00:00:00.000Z'),
        updatedAt: new Date('2026-04-09T00:00:00.000Z'),
        userA: { id: 5n, email: 'owner@example.com', name: 'Owner' },
        userB: { id: 7n, email: 'partner@example.com', name: 'Partner AI' },
      },
    ])
    mockDiaryFindMany
      .mockResolvedValueOnce([
        {
          id: 21n,
          userId: 5n,
          title: 'Owner diary',
          content: 'Owner market thesis',
          tagsString: 'watch,learning',
          createdVia: 'WEB',
          createdByLabel: null,
          date: new Date('2026-04-09T12:00:00.000Z'),
          createdAt: new Date('2026-04-09T12:00:00.000Z'),
          updatedAt: new Date('2026-04-09T12:00:00.000Z'),
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 22n,
          userId: 7n,
          title: 'Partner diary',
          content: 'Partner market thesis',
          tagsString: 'watch',
          createdVia: 'API_KEY',
          createdByLabel: 'OpenClaw',
          date: new Date('2026-04-09T12:00:00.000Z'),
          createdAt: new Date('2026-04-09T12:00:00.000Z'),
          updatedAt: new Date('2026-04-09T12:00:00.000Z'),
        },
      ])

    const { default: handler } = await import('~/server/api/partners/compare.get')

    const result = await handler({
      context: {
        user: { id: '5', email: 'owner@example.com', role: 'USER' },
      },
    } as any)

    expect(result.selectedPartnerId).toBe('7')
    expect(result.compareDays).toHaveLength(1)
    expect(result.compareDays[0].dateKey).toBe('2026-04-09')
    expect(result.compareDays[0].ownerDiary.tags).toEqual(['watch', 'learning'])
    expect(result.compareDays[0].ownerDiary.transactions).toBeUndefined()
    expect(result.compareDays[0].partnerDiary.createdByLabel).toBe('OpenClaw')
    expect(result.links[0].partnerSharesDiaries).toBe(true)
  })
})
