import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  mockDiaryCount,
  mockDiaryFindFirst,
  mockDiaryFindMany,
  mockAlertCount,
  mockTransactionCount,
} = vi.hoisted(() => ({
  mockDiaryCount: vi.fn(),
  mockDiaryFindFirst: vi.fn(),
  mockDiaryFindMany: vi.fn(),
  mockAlertCount: vi.fn(),
  mockTransactionCount: vi.fn(),
}))

vi.mock('~/lib/prisma', () => ({
  default: {
    diary: {
      count: mockDiaryCount,
      findFirst: mockDiaryFindFirst,
      findMany: mockDiaryFindMany,
    },
    alert: { count: mockAlertCount },
    transaction: { count: mockTransactionCount },
  },
}))

import { getDiarySummaryForUser } from '~/server/utils/diary-summary'

describe('getDiarySummaryForUser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDiaryCount.mockImplementation(({ where }: any) => {
      if (where?.alerts) return 3
      if (where?.transactions) return 5
      if (where?.date) return 2
      return 12
    })
    mockAlertCount.mockResolvedValue(4)
    mockTransactionCount.mockResolvedValue(8)
    mockDiaryFindFirst.mockResolvedValue({
      id: 99n,
      title: 'Latest',
      content: 'Latest content',
      date: new Date('2026-08-06T12:00:00Z'),
      createdAt: new Date('2026-08-06T12:01:00Z'),
    })
    mockDiaryFindMany.mockResolvedValue([
      {
        id: 98n,
        title: 'Review me',
        date: new Date('2026-08-01T12:00:00Z'),
        thesis: 'Thesis',
        risk: 'Risk',
        reviewStatus: 'pending',
      },
    ])
  })

  it('computes global metrics independently from the paginated diary list', async () => {
    const result = await getDiarySummaryForUser(
      7n,
      'America/Los_Angeles',
      new Date('2026-08-06T19:00:00Z'),
    )

    expect(result.global).toEqual({
      totalDiaries: 12,
      totalOpenAlerts: 4,
      diariesWithAlerts: 3,
      totalTransactions: 8,
      diariesWithTransactions: 5,
    })
    expect(result.currentWeek).toEqual({
      totalDiaries: 2,
      startDate: '2026-08-02',
      endDateExclusive: '2026-08-09',
    })
    expect(result.latestDiary?.id).toBe(99n)
    expect(result.reviewCandidates).toHaveLength(1)

    const weekQuery = mockDiaryCount.mock.calls.find(([arg]) => arg.where?.date)
    expect(weekQuery?.[0].where.date).toEqual({
      gte: new Date('2026-08-02T00:00:00.000Z'),
      lt: new Date('2026-08-06T19:00:00.000Z'),
    })
  })

  it('orders latest diary with date and id tie-breakers', async () => {
    await getDiarySummaryForUser(7n, 'Asia/Taipei', new Date('2026-08-07T00:00:00Z'))

    expect(mockDiaryFindFirst).toHaveBeenCalledWith(expect.objectContaining({
      orderBy: [{ date: 'desc' }, { id: 'desc' }],
    }))
  })
})
