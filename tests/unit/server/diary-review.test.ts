import { beforeEach, describe, expect, it, vi } from 'vitest'
import { aDiary } from '../../fixtures/builders'

const mockDiaryFindFirst = vi.fn()
const mockDiaryUpdate = vi.fn()

vi.mock('~/lib/prisma', () => ({
  default: {
    diary: {
      findFirst: mockDiaryFindFirst,
      update: mockDiaryUpdate,
    },
  },
}))

describe('structured diary review domain', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  it.each(['INTACT', 'PARTIAL', 'INVALIDATED', 'UNCLEAR'] as const)(
    'accepts canonical outcome %s with one meaningful reflection',
    async (reviewOutcome) => {
      const { structuredReviewInputSchema } = await import('~/server/utils/diary-review')
      expect(structuredReviewInputSchema.parse({ reviewOutcome, reviewLearning: 'Learned' }))
        .toMatchObject({ reviewOutcome, reviewLearning: 'Learned' })
    },
  )

  it('rejects invalid outcomes, empty reflections, extra completion fields, and excessive text', async () => {
    const { structuredReviewInputSchema } = await import('~/server/utils/diary-review')

    expect(() => structuredReviewInputSchema.parse({
      reviewOutcome: 'WIN',
      reviewSummary: 'Good',
    })).toThrow()
    expect(() => structuredReviewInputSchema.parse({
      reviewOutcome: 'INTACT',
      reviewSummary: '  ',
    })).toThrow()
    expect(() => structuredReviewInputSchema.parse({
      reviewOutcome: 'INTACT',
      reviewSummary: 'Good',
      reviewedAt: new Date().toISOString(),
    })).toThrow()
    expect(() => structuredReviewInputSchema.parse({
      reviewOutcome: 'INTACT',
      reviewSummary: 'x'.repeat(10_001),
    })).toThrow()
  })

  it('writes normalized reflections and refreshes reviewedAt on every successful save', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-09T04:00:00.000Z'))
    mockDiaryFindFirst.mockResolvedValue(aDiary({ id: 10n }))
    mockDiaryUpdate.mockResolvedValue(aDiary({ id: 10n, reviewOutcome: 'INVALIDATED' }))

    const { saveStructuredReviewForUser } = await import('~/server/utils/diary-review')
    await saveStructuredReviewForUser(10n, 7n, {
      reviewOutcome: 'INVALIDATED',
      reviewSummary: '  Thesis broke  ',
      reviewLearning: '',
    })

    expect(mockDiaryFindFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 10n, userId: 7n },
    }))
    expect(mockDiaryUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 10n },
      data: {
        reviewOutcome: 'INVALIDATED',
        reviewSummary: 'Thesis broke',
        reviewLearning: null,
        reviewAdjustment: null,
        reviewStatus: 'REVIEWED',
        reviewedAt: new Date('2026-08-09T04:00:00.000Z'),
      },
    }))
  })

  it('collapses missing and cross-user reads into the same not-found contract', async () => {
    mockDiaryFindFirst.mockResolvedValue(null)
    const { findDiaryReviewForUser } = await import('~/server/utils/diary-review')

    await expect(findDiaryReviewForUser(99n, 7n)).rejects.toMatchObject({
      code: 'DIARY_NOT_FOUND',
      statusCode: 404,
    })
    expect(mockDiaryFindFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 99n, userId: 7n },
    }))
  })
})
