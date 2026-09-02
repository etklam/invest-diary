import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockGetQuery } from '../vi-setup'
import { InvalidActivityCursorError } from '~/lib/investment-activity'

const mockReadInvestmentActivityPage = vi.fn()

vi.mock('~/server/utils/auth', () => ({
  requireUser: vi.fn(() => ({ id: '7' })),
}))

vi.mock('~/server/utils/investment-activity', () => ({
  readInvestmentActivityPage: mockReadInvestmentActivityPage,
}))

vi.mock('~/lib/logger', () => ({
  logger: {
    diary: { withRequestId: vi.fn(() => ({ warn: vi.fn(), error: vi.fn() })) },
  },
}))

const event = { context: { requestId: 'activity-test' } }

describe('GET /api/investment-activity', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetQuery.mockReturnValue({ limit: '5' })
  })

  it('returns the canonical data/pagination envelope after response parsing', async () => {
    mockReadInvestmentActivityPage.mockResolvedValue({
      data: [{
        id: 'diary:1',
        kind: 'diary',
        occurredAt: '2026-08-10',
        symbol: null,
        title: 'Decision',
        summary: 'Decision',
        source: { kind: 'user', label: null },
        diaryId: '1',
        destination: '/diaries/1',
        metadata: {
          symbols: [],
          transactionContext: [],
          reviewOutcome: null,
          reviewStatus: null,
          alertCount: 0,
          tradePlanSummary: null,
        },
      }],
      pagination: {
        nextCursor: null,
        hasMore: false,
        asOf: '2026-08-10T23:00:00.000Z',
      },
    })

    const { default: handler } = await import('~/server/api/investment-activity.get')
    const result = await handler(event as any)

    expect(result).toHaveProperty('data')
    expect(result).toHaveProperty('pagination')
    expect(result).not.toHaveProperty('items')
    expect(mockReadInvestmentActivityPage).toHaveBeenCalledWith(7n, {
      limit: 5,
      asOf: undefined,
    })
  })

  it('maps an invalid opaque cursor to the stable INVALID_CURSOR error', async () => {
    mockReadInvestmentActivityPage.mockRejectedValue(new InvalidActivityCursorError())
    mockGetQuery.mockReturnValue({ cursor: 'invalid', limit: '5' })

    const { default: handler } = await import('~/server/api/investment-activity.get')

    await expect(handler(event as any)).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: 'Invalid cursor',
      data: { code: 'INVALID_CURSOR' },
    })
  })
})
