import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockReadBody } from '../vi-setup'
import { aDiary } from '../fixtures/builders'
import { mockLogger } from '../vi-setup'

const mockDiaryFindMany = vi.fn()
const mockDiaryFindFirst = vi.fn()
const mockDiaryUpdate = vi.fn()
const mockUserFindUnique = vi.fn()
const mockThesisFindMany = vi.fn()
const mockParsePositiveBigIntParam = vi.fn()
const mockGetUserTimezone = vi.fn()

vi.mock('~/lib/prisma', () => ({
  default: {
    diary: {
      findMany: mockDiaryFindMany,
      findFirst: mockDiaryFindFirst,
      update: mockDiaryUpdate,
    },
    user: {
      findUnique: mockUserFindUnique,
    },
    investmentThesis: {
      findMany: mockThesisFindMany,
    },
  },
}))

vi.mock('~/lib/logger', () => mockLogger('diary'))

vi.mock('~/server/utils/validation', async (importOriginal) => {
  const actual = await importOriginal<typeof import('~/server/utils/validation')>()
  return {
    ...actual,
    parsePositiveBigIntParam: mockParsePositiveBigIntParam,
  }
})

vi.mock('~/server/utils/user-queries', () => ({
  getUserTimezone: mockGetUserTimezone,
}))

describe('Review API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
    mockReadBody.mockResolvedValue(null)
    mockParsePositiveBigIntParam.mockReturnValue(10n)
    mockGetUserTimezone.mockResolvedValue('Asia/Taipei')
    mockThesisFindMany.mockResolvedValue([])
  })

  describe('GET /api/reviews', () => {
    it('returns grouped review items for the authenticated user', async () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-06-14T12:00:00.000Z'))

      const unscheduled = [aDiary({ id: 5n, title: 'Pending without date', date: new Date('2026-06-11T09:00:00.000Z'), thesis: 'Needs a schedule', reviewDueAt: null, reviewStatus: 'pending' })]
      const overdue = [aDiary({ id: 1n, title: 'Overdue diary', date: new Date('2026-06-01T12:00:00.000Z'), thesis: 'Breakout thesis', risk: 'False breakout', reviewDueAt: new Date('2026-06-13T10:00:00.000Z'), reviewStatus: 'pending' })]
      const today = [aDiary({ id: 2n, title: 'Today diary', date: new Date('2026-06-14T09:00:00.000Z'), reviewDueAt: new Date('2026-06-14T15:00:00.000Z'), reviewStatus: null })]
      const upcoming = [aDiary({ id: 3n, title: 'Upcoming diary', date: new Date('2026-06-15T09:00:00.000Z'), thesis: 'Wait for pullback', reviewDueAt: new Date('2026-06-20T09:00:00.000Z'), reviewStatus: 'pending' })]
      const completed = [aDiary({ id: 4n, title: 'Completed diary', date: new Date('2026-06-10T09:00:00.000Z'), risk: 'Sizing too large', reviewDueAt: new Date('2026-06-12T09:00:00.000Z'), reviewStatus: 'reviewed', reviewedAt: new Date('2026-06-14T08:00:00.000Z') })]

      mockDiaryFindMany
        .mockResolvedValueOnce(unscheduled)
        .mockResolvedValueOnce(overdue)
        .mockResolvedValueOnce(today)
        .mockResolvedValueOnce(upcoming)
        .mockResolvedValueOnce(completed)

      const { default: handler } = await import('~/server/api/reviews.get')
      const result = await handler({ context: { user: { id: '7' }, requestId: 'req-reviews' } } as any)

      expect(mockGetUserTimezone).toHaveBeenCalledWith(7n)
      expect(mockDiaryFindMany).toHaveBeenCalledTimes(5)
      expect(mockDiaryFindMany.mock.calls[0]?.[0].where).toMatchObject({
        userId: 7n,
        reviewDueAt: null,
        reviewStatus: 'PENDING',
        NOT: { reviewStatus: 'REVIEWED' },
      })
      expect(mockDiaryFindMany.mock.calls[0]?.[0].select).toMatchObject({ reviewOutcome: true })
      expect(mockDiaryFindMany.mock.calls[1]?.[0].where).toMatchObject({
        userId: 7n,
        reviewDueAt: { lt: new Date('2026-06-13T16:00:00.000Z') },
        NOT: { reviewStatus: 'REVIEWED' },
      })
      expect(mockDiaryFindMany.mock.calls[2]?.[0].where).toMatchObject({
        reviewDueAt: {
          gte: new Date('2026-06-13T16:00:00.000Z'),
          lt: new Date('2026-06-14T16:00:00.000Z'),
        },
      })
      expect(result.unscheduled[0].id).toBe('5')
      expect(result.overdue[0].id).toBe('1')
      expect(result.today[0].reviewStatus).toBe('none')
      expect(result.upcoming[0].id).toBe('3')
      expect(result.completed[0].id).toBe('4')
    })

    it('uses the viewer timezone when grouping reviews due today', async () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-06-14T16:30:00.000Z'))
      mockGetUserTimezone.mockResolvedValue('Asia/Taipei')

      mockDiaryFindMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])

      const { default: handler } = await import('~/server/api/reviews.get')
      await handler({ context: { user: { id: '7' }, requestId: 'req-reviews-tz' } } as any)

      expect(mockDiaryFindMany.mock.calls[1]?.[0].where.reviewDueAt).toEqual({
        lt: new Date('2026-06-14T16:00:00.000Z'),
      })
      expect(mockDiaryFindMany.mock.calls[2]?.[0].where.reviewDueAt).toEqual({
        gte: new Date('2026-06-14T16:00:00.000Z'),
        lt: new Date('2026-06-15T16:00:00.000Z'),
      })
    })
  })

  describe('PATCH /api/diaries/:id/review', () => {
    it('saves a structured review, trims reflection text, and owns the completion timestamp', async () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-06-14T10:00:00.000Z'))
      mockReadBody.mockResolvedValue({
        reviewOutcome: 'PARTIAL',
        reviewSummary: '  The setup worked, entry did not.  ',
        reviewLearning: ' ',
        reviewAdjustment: null,
      })
      mockDiaryFindFirst.mockResolvedValue(aDiary({ id: 10n, title: 'Reviewed diary' }))
      mockDiaryUpdate.mockResolvedValue(aDiary({
        id: 10n,
        title: 'Reviewed diary',
          reviewStatus: 'REVIEWED',
        reviewedAt: new Date('2026-06-14T10:00:00.000Z'),
        reviewOutcome: 'PARTIAL',
        reviewSummary: 'The setup worked, entry did not.',
      }))

      const { default: handler } = await import('~/server/api/diaries/[id]/review.patch')
      const result = await handler({ context: { user: { id: '7' }, requestId: 'req-review-patch' } } as any)

      expect(mockDiaryFindFirst).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 10n, userId: 7n },
      }))
      expect(mockDiaryUpdate).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 10n },
        data: {
          reviewOutcome: 'PARTIAL',
          reviewSummary: 'The setup worked, entry did not.',
          reviewLearning: null,
          reviewAdjustment: null,
          reviewStatus: 'REVIEWED',
          reviewedAt: new Date('2026-06-14T10:00:00.000Z'),
        },
      }))
      expect(result.id).toBe('10')
      expect(result.reviewStatus).toBe('reviewed')
    })

    it('rejects status-only completion and client-supplied timestamps', async () => {
      mockReadBody.mockResolvedValue({
        reviewOutcome: 'INTACT',
        reviewSummary: 'Still valid',
        reviewStatus: 'reviewed',
        reviewedAt: '2026-06-14T10:00:00.000Z',
      })

      const { default: handler } = await import('~/server/api/diaries/[id]/review.patch')
      await expect(handler({ context: { user: { id: '7' }, requestId: 'req-review-invalid' } } as any))
        .rejects.toMatchObject({ statusCode: 400 })
      expect(mockDiaryUpdate).not.toHaveBeenCalled()
    })

    it('rejects a review with only whitespace reflections', async () => {
      mockReadBody.mockResolvedValue({
        reviewOutcome: 'UNCLEAR',
        reviewSummary: '  ',
        reviewLearning: '\n',
      })

      const { default: handler } = await import('~/server/api/diaries/[id]/review.patch')
      await expect(handler({ context: { user: { id: '7' }, requestId: 'req-review-empty' } } as any))
        .rejects.toMatchObject({ statusCode: 400 })
      expect(mockDiaryUpdate).not.toHaveBeenCalled()
    })
  })

  describe('GET /api/diaries/:id/review', () => {
    it('returns only an owned diary with decision, transaction, and trade-plan context', async () => {
      mockDiaryFindFirst.mockResolvedValue(aDiary({
        id: 10n,
        title: 'Decision context',
        reviewStatus: 'reviewed',
        transactions: [{
          id: 20n,
          symbol: 'AAPL',
          type: 'BUY',
          quantity: '2',
          price: '180.25',
          tradeDate: new Date('2026-06-01T09:30:00.000Z'),
          notes: null,
          strategy: null,
          emotion: null,
        }],
        tradePlans: [{
          id: 30n,
          symbol: 'AAPL',
          setupType: null,
          entryPrice: null,
          entryZoneLow: null,
          entryZoneHigh: null,
          stopLoss: null,
          targetPrice: null,
          maxPositionSize: null,
          invalidationCondition: null,
          notes: null,
          status: 'active',
        }],
      }))

      const { default: handler } = await import('~/server/api/diaries/[id]/review.get')
      const result = await handler({ context: { user: { id: '7' }, requestId: 'req-review-get' } } as any)

      expect(mockDiaryFindFirst).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 10n, userId: 7n },
        select: expect.objectContaining({
          content: true,
          execution: true,
          reviewOutcome: true,
          reviewSummary: true,
          transactions: expect.any(Object),
          tradePlans: expect.any(Object),
        }),
      }))
      expect(result.id).toBe('10')
      expect(result.transactions[0].id).toBe('20')
      expect(result.tradePlans[0].id).toBe('30')
    })
  })
})
