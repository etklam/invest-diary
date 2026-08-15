import { beforeEach, describe, expect, it, vi } from 'vitest'
import { aDiary } from '../../fixtures/builders'

const { mockDiaryFindMany } = vi.hoisted(() => ({ mockDiaryFindMany: vi.fn() }))

vi.mock('~/lib/prisma', () => ({
  default: { diary: { findMany: mockDiaryFindMany } },
}))

import { getDiaryActivityForUser } from '~/server/utils/diary-activity'

describe('getDiaryActivityForUser', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns bounded civil-date activity without serializing diary content', async () => {
    mockDiaryFindMany.mockResolvedValue([
      aDiary({
        id: 10n,
        date: new Date('2026-08-02T12:00:00.000Z'),
        _count: { alerts: 2, transactions: 1 },
      }),
      aDiary({
        id: 11n,
        date: new Date('2026-08-02T12:00:00.000Z'),
        _count: { alerts: 1, transactions: 3 },
      }),
      aDiary({
        id: 12n,
        date: new Date('2026-08-03T12:00:00.000Z'),
        _count: { alerts: 0, transactions: 0 },
      }),
    ])

    const result = await getDiaryActivityForUser(7n, '2026-08-01', '2026-08-03')

    expect(mockDiaryFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        userId: 7n,
        date: {
          gte: new Date('2026-08-01T00:00:00.000Z'),
          lt: new Date('2026-08-04T00:00:00.000Z'),
        },
      },
      orderBy: [{ date: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        date: true,
        _count: {
          select: {
            transactions: true,
            alerts: { where: { isDismissed: false } },
          },
        },
      },
    }))
    expect(result).toEqual([
      { date: '2026-08-02', diaryId: 10n, alertCount: 3, transactionCount: 4 },
      { date: '2026-08-03', diaryId: 12n, alertCount: 0, transactionCount: 0 },
    ])
  })
})
