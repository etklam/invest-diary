import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockGetQuery } from '../vi-setup'

const mockGetDiaryActivityForUser = vi.fn()
const mockDiaryLog = { warn: vi.fn(), error: vi.fn() }

vi.mock('~/server/utils/diary-activity', () => ({
  getDiaryActivityForUser: mockGetDiaryActivityForUser,
}))
vi.mock('~/lib/logger', () => ({
  logger: { diary: { withRequestId: vi.fn(() => mockDiaryLog) } },
}))

describe('GET /api/diaries/activity', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetQuery.mockReturnValue({ dateFrom: '2026-08-01', dateTo: '2026-08-03' })
    mockGetDiaryActivityForUser.mockResolvedValue([])
  })

  it('returns activity for a strict civil date range', async () => {
    mockGetDiaryActivityForUser.mockResolvedValue([
      { date: '2026-08-02', diaryId: 10n, alertCount: 1, transactionCount: 2 },
    ])
    const { default: handler } = await import('~/server/api/diaries/activity.get')

    const result = await handler({ context: { user: { id: '7' }, requestId: 'activity-1' } } as any)

    expect(mockGetDiaryActivityForUser).toHaveBeenCalledWith(7n, '2026-08-01', '2026-08-03')
    expect(result).toEqual({
      data: [{ date: '2026-08-02', diaryId: '10', alertCount: 1, transactionCount: 2 }],
      dateFrom: '2026-08-01',
      dateTo: '2026-08-03',
    })
  })

  it.each([
    { dateFrom: '2026-02-31', dateTo: '2026-03-01' },
    { dateFrom: '2026-08-03', dateTo: '2026-08-01' },
    { dateFrom: '2025-01-01', dateTo: '2026-02-01' },
  ])('rejects invalid, reversed, or oversized ranges: %o', async (query) => {
    mockGetQuery.mockReturnValue(query)
    const { default: handler } = await import('~/server/api/diaries/activity.get')

    await expect(
      handler({ context: { user: { id: '7' }, requestId: 'activity-invalid' } } as any),
    ).rejects.toMatchObject({ statusCode: 400 })
    expect(mockGetDiaryActivityForUser).not.toHaveBeenCalled()
  })
})
