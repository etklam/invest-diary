import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockGetQuery, mockReadBody } from '../vi-setup'

const mockTradePlanFindMany = vi.fn()
const mockTradePlanFindFirst = vi.fn()
const mockTradePlanCreate = vi.fn()
const mockTradePlanUpdate = vi.fn()
const mockTradePlanDelete = vi.fn()
const mockDiaryFindFirst = vi.fn()
const mockParsePositiveBigIntParam = vi.fn()
const mockLogInfo = vi.fn()
const mockLogWarn = vi.fn()
const mockLogError = vi.fn()

vi.mock('~/lib/prisma', () => ({
  default: {
    tradePlan: {
      findMany: mockTradePlanFindMany,
      findFirst: mockTradePlanFindFirst,
      create: mockTradePlanCreate,
      update: mockTradePlanUpdate,
      delete: mockTradePlanDelete,
    },
    diary: {
      findFirst: mockDiaryFindFirst,
    },
  },
}))

vi.mock('~/lib/logger', () => ({
  logger: {
    diary: {
      withRequestId: vi.fn(() => ({
        info: mockLogInfo,
        warn: mockLogWarn,
        error: mockLogError,
      })),
    },
  },
}))

vi.mock('~/server/utils/validation', async (importOriginal) => {
  const actual = await importOriginal<typeof import('~/server/utils/validation')>()
  return {
    ...actual,
    parsePositiveBigIntParam: mockParsePositiveBigIntParam,
  }
})

const samplePlan = {
  id: 9n,
  userId: 7n,
  diaryId: 2n,
  symbol: 'AAPL',
  setupType: 'Pullback',
  entryPrice: null,
  entryZoneLow: '180',
  entryZoneHigh: '185',
  stopLoss: '174',
  targetPrice: '205',
  maxPositionSize: '12000',
  invalidationCondition: 'Close below support',
  notes: 'Wait for volume',
  status: 'draft',
  createdAt: new Date('2026-06-14T08:00:00.000Z'),
  updatedAt: new Date('2026-06-14T09:00:00.000Z'),
  diary: {
    id: 2n,
    title: 'AAPL diary',
    date: new Date('2026-06-13T12:00:00.000Z'),
  },
}

describe('Trade Plan API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetQuery.mockReturnValue({})
    mockReadBody.mockResolvedValue(null)
    mockParsePositiveBigIntParam.mockReturnValue(9n)
  })

  it('lists trade plans scoped to user with optional filters', async () => {
    mockGetQuery.mockReturnValue({ status: 'active', symbol: 'aapl' })
    mockTradePlanFindMany.mockResolvedValue([samplePlan])

    const { default: handler } = await import('~/server/api/trade-plans/index.get')
    const result = await handler({ context: { user: { id: '7' }, requestId: 'req-list' } } as any)

    expect(mockTradePlanFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        userId: 7n,
        status: 'active',
        symbol: { contains: 'AAPL' },
      },
      orderBy: { updatedAt: 'desc' },
    }))
    expect(result.data[0].id).toBe('9')
    expect(result.data[0].diary.id).toBe('2')
  })

  it('returns only compact owner-scoped Diary context for Trade Plan detail', async () => {
    mockTradePlanFindFirst.mockResolvedValue(samplePlan)
    mockDiaryFindFirst.mockResolvedValue({
      id: 2n,
      title: 'AAPL diary',
      date: new Date('2026-06-13T12:00:00.000Z'),
      reviewStatus: 'reviewed',
      reviewOutcome: 'INTACT',
      content: 'must not leak',
      thesis: 'must not leak',
      _count: { transactions: 2 },
    })

    const { default: handler } = await import('~/server/api/trade-plans/[id].get')
    const result = await handler({ context: { user: { id: '7' }, requestId: 'req-plan-detail' } } as any)

    expect(mockTradePlanFindFirst).toHaveBeenCalledWith({ where: { id: 9n, userId: 7n } })
    expect(mockDiaryFindFirst).toHaveBeenCalledWith({
      where: { id: 2n, userId: 7n },
      select: {
        id: true,
        title: true,
        date: true,
        reviewStatus: true,
        reviewOutcome: true,
        _count: { select: { transactions: true } },
      },
    })
    expect(result.diary).toEqual({
      id: '2',
      title: 'AAPL diary',
      date: new Date('2026-06-13T12:00:00.000Z'),
      reviewStatus: 'reviewed',
      reviewOutcome: 'INTACT',
      transactionCount: 2,
    })
    expect(result.diary).not.toHaveProperty('content')
    expect(result.diary).not.toHaveProperty('thesis')
    expect(result.diary).not.toHaveProperty('transactions')
  })

  it('returns an unlinked Trade Plan without looking up Diary context', async () => {
    mockTradePlanFindFirst.mockResolvedValue({ ...samplePlan, diaryId: null, diary: undefined })

    const { default: handler } = await import('~/server/api/trade-plans/[id].get')
    const result = await handler({ context: { user: { id: '7' }, requestId: 'req-unlinked-detail' } } as any)

    expect(result.diary).toBeNull()
    expect(mockDiaryFindFirst).not.toHaveBeenCalled()
  })

  it('does not expose Diary context when the linked Diary is outside the plan owner scope', async () => {
    mockTradePlanFindFirst.mockResolvedValue(samplePlan)
    mockDiaryFindFirst.mockResolvedValue(null)

    const { default: handler } = await import('~/server/api/trade-plans/[id].get')
    const result = await handler({ context: { user: { id: '7' }, requestId: 'req-foreign-diary-detail' } } as any)

    expect(mockDiaryFindFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 2n, userId: 7n } }))
    expect(result.diary).toBeNull()
  })

  it('rejects a foreign or missing Trade Plan before looking up Diary context', async () => {
    mockTradePlanFindFirst.mockResolvedValue(null)

    const { default: handler } = await import('~/server/api/trade-plans/[id].get')

    await expect(handler({ context: { user: { id: '7' }, requestId: 'req-foreign-plan-detail' } } as any))
      .rejects.toMatchObject({ statusCode: 404, statusMessage: 'Trade plan not found' })
    expect(mockDiaryFindFirst).not.toHaveBeenCalled()
  })

  it('creates a manual trade plan and validates linked diary ownership', async () => {
    mockReadBody.mockResolvedValue({
      diaryId: '2',
      symbol: 'aapl',
      setupType: 'Pullback',
      entryZoneLow: '180',
      entryZoneHigh: '185',
      stopLoss: '174',
      targetPrice: '205',
      maxPositionSize: '12000',
      invalidationCondition: 'Close below support',
      notes: 'Wait for volume',
      status: 'draft',
    })
    mockDiaryFindFirst.mockResolvedValue({ id: 2n })
    mockTradePlanCreate.mockResolvedValue(samplePlan)

    const { default: handler } = await import('~/server/api/trade-plans/index.post')
    const result = await handler({ context: { user: { id: '7' }, requestId: 'req-create-plan' } } as any)

    expect(mockDiaryFindFirst).toHaveBeenCalledWith({
      where: { id: 2n, userId: 7n },
      select: { id: true },
    })
    expect(mockTradePlanCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        userId: 7n,
        diaryId: 2n,
        symbol: 'AAPL',
        entryZoneLow: '180',
        entryZoneHigh: '185',
        status: 'draft',
      }),
    }))
    expect(result.symbol).toBe('AAPL')
  })

  it('rejects linked diary from another user', async () => {
    mockReadBody.mockResolvedValue({
      diaryId: '2',
      symbol: 'MSFT',
      status: 'draft',
    })
    mockDiaryFindFirst.mockResolvedValue(null)

    const { default: handler } = await import('~/server/api/trade-plans/index.post')

    await expect(handler({ context: { user: { id: '7' }, requestId: 'req-denied-plan' } } as any))
      .rejects.toMatchObject({ statusCode: 403 })
  })

  it('does not distinguish a foreign diary from a nonexistent diary', async () => {
    mockReadBody.mockResolvedValue({ diaryId: '404', symbol: 'MSFT', status: 'draft' })
    mockDiaryFindFirst.mockResolvedValue(null)

    const { default: handler } = await import('~/server/api/trade-plans/index.post')

    await expect(handler({ context: { user: { id: '7' }, requestId: 'req-missing-plan' } } as any))
      .rejects.toMatchObject({ statusCode: 403, statusMessage: 'Diary access denied' })
  })

  it('creates another linked plan without replacing existing plans', async () => {
    mockReadBody.mockResolvedValue({ diaryId: '2', symbol: 'MSFT', status: 'draft' })
    mockDiaryFindFirst.mockResolvedValue({ id: 2n })
    mockTradePlanCreate.mockResolvedValue({ ...samplePlan, id: 10n, symbol: 'MSFT' })

    const { default: handler } = await import('~/server/api/trade-plans/index.post')
    await handler({ context: { user: { id: '7' }, requestId: 'req-another-plan' } } as any)

    expect(mockTradePlanCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ diaryId: 2n, symbol: 'MSFT' }),
    }))
    expect(mockTradePlanUpdate).not.toHaveBeenCalled()
    expect(mockTradePlanDelete).not.toHaveBeenCalled()
  })

  it('updates an owned trade plan', async () => {
    mockReadBody.mockResolvedValue({
      diaryId: null,
      symbol: 'msft',
      status: 'active',
      entryPrice: '420',
    })
    mockTradePlanFindFirst.mockResolvedValue(samplePlan)
    mockTradePlanUpdate.mockResolvedValue({
      ...samplePlan,
      diaryId: null,
      symbol: 'MSFT',
      status: 'active',
      entryPrice: '420',
      diary: null,
    })

    const { default: handler } = await import('~/server/api/trade-plans/[id].put')
    const result = await handler({ context: { user: { id: '7' }, requestId: 'req-update-plan' } } as any)

    expect(mockTradePlanFindFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 9n, userId: 7n },
    }))
    expect(mockTradePlanUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 9n },
      data: expect.objectContaining({
        diaryId: null,
        symbol: 'MSFT',
        status: 'active',
        entryPrice: '420',
      }),
    }))
    expect(result.status).toBe('active')
  })

  it('rejects linking an update to a foreign or nonexistent diary identically', async () => {
    mockReadBody.mockResolvedValue({ diaryId: '404' })
    mockTradePlanFindFirst.mockResolvedValue(samplePlan)
    mockDiaryFindFirst.mockResolvedValue(null)

    const { default: handler } = await import('~/server/api/trade-plans/[id].put')

    await expect(handler({ context: { user: { id: '7' }, requestId: 'req-denied-update' } } as any))
      .rejects.toMatchObject({ statusCode: 403, statusMessage: 'Diary access denied' })
    expect(mockTradePlanUpdate).not.toHaveBeenCalled()
  })

  it('deletes an owned trade plan', async () => {
    mockTradePlanFindFirst.mockResolvedValue(samplePlan)
    mockTradePlanDelete.mockResolvedValue(samplePlan)

    const { default: handler } = await import('~/server/api/trade-plans/[id].delete')
    const result = await handler({ context: { user: { id: '7' }, requestId: 'req-delete-plan' } } as any)

    expect(mockTradePlanDelete).toHaveBeenCalledWith({ where: { id: 9n } })
    expect(result).toEqual({ success: true })
  })
})
