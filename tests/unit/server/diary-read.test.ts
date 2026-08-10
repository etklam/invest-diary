import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock variables must be hoisted so they're available when vi.mock runs
const { mockPrismaDiaryFindFirst, mockPrismaDiaryFindMany, mockPrismaDiaryCount } = vi.hoisted(() => ({
  mockPrismaDiaryFindFirst: vi.fn(),
  mockPrismaDiaryFindMany: vi.fn(),
  mockPrismaDiaryCount: vi.fn(),
}))

vi.mock('~/lib/prisma', () => ({
  default: {
    diary: {
      findFirst: mockPrismaDiaryFindFirst,
      findMany: mockPrismaDiaryFindMany,
      count: mockPrismaDiaryCount,
    },
  },
}))

// ============================================================
// Tests for findDiaryForUser
// ============================================================

import {
  findDiaryForUser,
  findDiaryDetailForUser,
  findDiaryByDate,
  findLatestDiaryForUser,
  listDiariesForUser,
  buildReviewBuckets,
} from '~/server/utils/diary-read'

describe('findDiaryForUser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const baseDiary = {
    id: 1n,
    userId: 42n,
    title: 'Test Diary',
    content: 'Some content',
    tagsString: null,
    createdVia: 'WEB',
    createdByLabel: null,
    date: new Date('2026-05-17T12:00:00Z'),
    createdAt: new Date('2026-05-17T12:00:00Z'),
    updatedAt: new Date('2026-05-17T12:00:00Z'),
    transactions: [],
    alerts: [],
  }

  it('should return diary when found and owned by user (bigint)', async () => {
    mockPrismaDiaryFindFirst.mockResolvedValue(baseDiary)

    const result = await findDiaryForUser(1n, 42n)

    expect(result).toEqual(baseDiary)
    expect(mockPrismaDiaryFindFirst).toHaveBeenCalledWith({
      where: { id: 1n, userId: 42n },
      include: expect.objectContaining({ transactions: true, alerts: true, stockContexts: expect.any(Object) }),
    })
  })

  it('should return diary when found and owned by user (string ids)', async () => {
    mockPrismaDiaryFindFirst.mockResolvedValue(baseDiary)

    const result = await findDiaryForUser('1', '42')

    expect(result).toEqual(baseDiary)
    expect(mockPrismaDiaryFindFirst).toHaveBeenCalledWith({
      where: { id: 1n, userId: 42n },
      include: expect.objectContaining({ transactions: true, alerts: true, stockContexts: expect.any(Object) }),
    })
  })

  it('should throw diaryNotFound when diary does not exist', async () => {
    mockPrismaDiaryFindFirst.mockResolvedValue(null)

    await expect(findDiaryForUser(999n, 42n)).rejects.toMatchObject({
      code: 'DIARY_NOT_FOUND',
    })
  })

  it('should throw diaryNotFound (not accessDenied) when diary belongs to different user', async () => {
    // SQL-level ownership filter: findFirst({ where: { id, userId } }) returns
    // null when the diary is owned by someone else. We collapse this to a
    // single notFound response to avoid leaking resource existence.
    mockPrismaDiaryFindFirst.mockResolvedValue(null)

    await expect(findDiaryForUser(1n, 99n)).rejects.toMatchObject({
      code: 'DIARY_NOT_FOUND',
    })
  })

  it('should not leak diary existence to unauthorized user (same error as not found)', async () => {
    // SQL-level ownership filter collapses not-found and not-owned into a
    // single diaryNotFound response — no 404 vs 403 distinction.
    mockPrismaDiaryFindFirst.mockResolvedValue(null)

    await expect(findDiaryForUser(1n, 42n)).rejects.toMatchObject({
      code: 'DIARY_NOT_FOUND',
      statusCode: 404,
    })
  })

  it('should return diary with transactions and alerts included', async () => {
    const diaryWithRelations = {
      ...baseDiary,
      transactions: [
        { id: 100n, symbol: 'AAPL', type: 'BUY', quantity: 10, price: 150 },
      ],
      alerts: [
        { id: 50n, message: 'Check AAPL', triggerAt: new Date(), isDismissed: false },
      ],
    }
    mockPrismaDiaryFindFirst.mockResolvedValue(diaryWithRelations)

    const result = await findDiaryForUser(1n, 42n)

    expect(result.transactions).toHaveLength(1)
    expect(result.alerts).toHaveLength(1)
    // BigInt preserved — handlers call serialize()
    expect(result.transactions[0].id).toBe(100n)
  })
})

describe('findDiaryDetailForUser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loads the complete owner Decision Record in one query', async () => {
    mockPrismaDiaryFindFirst.mockResolvedValue({
      id: 1n,
      userId: 42n,
      title: 'Decision',
      transactions: [],
      alerts: [],
      tradePlans: [],
    })

    await findDiaryDetailForUser(1n, 42n)

    const query = mockPrismaDiaryFindFirst.mock.calls[0][0]
    expect(query.where).toEqual({ id: 1n, userId: 42n })
    expect(query.include.transactions.orderBy).toEqual([{ tradeDate: 'asc' }, { id: 'asc' }])
    expect(query.include.tradePlans.orderBy).toEqual({ id: 'asc' })
    expect(query.include.tradePlans.select).toMatchObject({
      id: true,
      symbol: true,
      entryPrice: true,
      invalidationCondition: true,
      notes: true,
      status: true,
    })
    expect(query.include.tradePlans.select).not.toHaveProperty('userId')
  })

  it('collapses missing and foreign-owned Diaries to the same not-found error', async () => {
    mockPrismaDiaryFindFirst.mockResolvedValue(null)

    await expect(findDiaryDetailForUser(1n, 99n)).rejects.toMatchObject({
      code: 'DIARY_NOT_FOUND',
      statusCode: 404,
    })
  })
})

// ============================================================
// Tests for findDiaryByDate
// ============================================================

describe('findDiaryByDate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const baseDiary = {
    id: 1n,
    userId: 42n,
    title: 'Test Diary',
    content: 'Some content',
    tagsString: null,
    createdVia: 'WEB',
    createdByLabel: null,
    date: new Date('2026-05-17T12:00:00Z'),
    createdAt: new Date('2026-05-17T12:00:00Z'),
    updatedAt: new Date('2026-05-17T12:00:00Z'),
    transactions: [],
    alerts: [],
  }

  it('should return diary when found for the given date and user', async () => {
    mockPrismaDiaryFindFirst.mockResolvedValue(baseDiary)

    const result = await findDiaryByDate('2026-05-17', 42n)

    expect(result).toEqual(baseDiary)
    expect(mockPrismaDiaryFindFirst).toHaveBeenCalledWith({
      where: {
        userId: 42n,
        date: {
          gte: new Date('2026-05-17T00:00:00.000Z'),
          lte: new Date('2026-05-17T23:59:59.999Z'),
        },
      },
      include: expect.objectContaining({ transactions: true, alerts: true, stockContexts: expect.any(Object) }),
    })
  })

  it('should return null when no diary exists for that date', async () => {
    mockPrismaDiaryFindFirst.mockResolvedValue(null)

    const result = await findDiaryByDate('2026-05-17', 42n)

    expect(result).toBeNull()
  })

  it('should accept a Date object as input', async () => {
    mockPrismaDiaryFindFirst.mockResolvedValue(baseDiary)

    const inputDate = new Date('2026-05-17T08:30:00Z')
    const result = await findDiaryByDate(inputDate, 42n)

    expect(result).toEqual(baseDiary)
    expect(mockPrismaDiaryFindFirst).toHaveBeenCalledWith({
      where: {
        userId: 42n,
        date: {
          gte: new Date('2026-05-17T00:00:00.000Z'),
          lte: new Date('2026-05-17T23:59:59.999Z'),
        },
      },
      include: expect.objectContaining({ transactions: true, alerts: true, stockContexts: expect.any(Object) }),
    })
  })

  it('should query with correct UTC day range for date string', async () => {
    mockPrismaDiaryFindFirst.mockResolvedValue(null)

    await findDiaryByDate('2026-01-15', 1n)

    const call = mockPrismaDiaryFindFirst.mock.calls[0][0]
    expect(call.where.date.gte).toEqual(new Date('2026-01-15T00:00:00.000Z'))
    expect(call.where.date.lte).toEqual(new Date('2026-01-15T23:59:59.999Z'))
    expect(call.where.userId).toBe(1n)
  })
})

// ============================================================
// Tests for findLatestDiaryForUser
// ============================================================

describe('findLatestDiaryForUser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const latestDiary = {
    id: 99n,
    userId: 7n,
    title: 'Newest',
    content: 'body',
    tagsString: null,
    createdVia: 'WEB',
    createdByLabel: null,
    date: new Date('2026-07-01T12:00:00Z'),
    createdAt: new Date('2026-07-01T12:00:00Z'),
    updatedAt: new Date('2026-07-01T12:00:00Z'),
    transactions: [],
  }

  it('returns the most recent diary ordered by createdAt desc', async () => {
    mockPrismaDiaryFindFirst.mockResolvedValue(latestDiary)

    const result = await findLatestDiaryForUser(7n)

    expect(result).toEqual(latestDiary)
    expect(mockPrismaDiaryFindFirst).toHaveBeenCalledWith({
      where: { userId: 7n },
      orderBy: { createdAt: 'desc' },
      include: { transactions: true },
    })
  })

  it('returns null when the user has no diaries', async () => {
    // List-style lookup — caller decides whether null is an error.
    // transactions/latest.get.ts returns a null payload in this case.
    mockPrismaDiaryFindFirst.mockResolvedValue(null)

    const result = await findLatestDiaryForUser(7n)

    expect(result).toBeNull()
  })

  it('scopes the query to the caller userId (no cross-user leakage)', async () => {
    mockPrismaDiaryFindFirst.mockResolvedValue(null)

    await findLatestDiaryForUser(42n)

    expect(mockPrismaDiaryFindFirst.mock.calls[0][0].where.userId).toBe(42n)
  })
})

// ============================================================
// Tests for listDiariesForUser
// ============================================================

describe('listDiariesForUser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
    mockPrismaDiaryFindMany.mockResolvedValue([])
    mockPrismaDiaryCount.mockResolvedValue(0)
  })

  const baseItem = {
    id: 1n,
    userId: 7n,
    title: 'T',
    content: 'C',
    tagsString: 'tech,ai',
    createdVia: 'WEB',
    createdByLabel: null,
    date: new Date('2026-07-01T12:00:00Z'),
    createdAt: new Date('2026-07-01T12:00:00Z'),
    updatedAt: new Date('2026-07-01T12:00:00Z'),
    thesis: null,
    risk: null,
    execution: null,
    reviewDueAt: null,
    reviewStatus: null,
    reviewedAt: null,
    alerts: [],
    transactions: [],
    tradePlans: [],
  }

  it('applies pagination: skip = (page-1)*limit, take = limit', async () => {
    await listDiariesForUser(7n, { page: 3, limit: 25 })

    const call = mockPrismaDiaryFindMany.mock.calls[0][0]
    expect(call.skip).toBe(50)
    expect(call.take).toBe(25)
  })

  it('defaults orderBy to { createdAt: desc } when sortBy is omitted', async () => {
    await listDiariesForUser(7n, { page: 1, limit: 20 })

    expect(mockPrismaDiaryFindMany.mock.calls[0][0].orderBy).toEqual([{ date: 'desc' }, { id: 'desc' }])
  })

  it('whitelists known sort options (date-asc, title-asc, title-desc)', async () => {
    await listDiariesForUser(7n, { page: 1, limit: 20, sortBy: 'date-asc' })
    expect(mockPrismaDiaryFindMany.mock.calls[0][0].orderBy).toEqual([{ date: 'asc' }, { id: 'asc' }])

    vi.clearAllMocks()
    mockPrismaDiaryFindMany.mockResolvedValue([])

    await listDiariesForUser(7n, { page: 1, limit: 20, sortBy: 'title-asc' })
    expect(mockPrismaDiaryFindMany.mock.calls[0][0].orderBy).toEqual([{ title: 'asc' }, { id: 'asc' }])

    vi.clearAllMocks()
    mockPrismaDiaryFindMany.mockResolvedValue([])

    await listDiariesForUser(7n, { page: 1, limit: 20, sortBy: 'title-desc' })
    expect(mockPrismaDiaryFindMany.mock.calls[0][0].orderBy).toEqual([{ title: 'desc' }, { id: 'desc' }])
  })

  it('falls back to default sort for unknown sortBy', async () => {
    await listDiariesForUser(7n, { page: 1, limit: 20, sortBy: 'bogus' })

    expect(mockPrismaDiaryFindMany.mock.calls[0][0].orderBy).toEqual([{ date: 'desc' }, { id: 'desc' }])
  })

  it('builds OR with contains for search on title + content', async () => {
    await listDiariesForUser(7n, { page: 1, limit: 20, search: 'AAPL' })

    const call = mockPrismaDiaryFindMany.mock.calls[0][0]
    expect(call.where.OR).toEqual([
      { title: { contains: 'AAPL' } },
      { content: { contains: 'AAPL' } },
    ])
  })

  it('maps dateFrom / dateTo to where.date gte/lte', async () => {
    const dateFrom = new Date('2026-01-01T00:00:00.000Z')
    const dateTo = new Date('2026-01-31T23:59:59.999Z')

    await listDiariesForUser(7n, { page: 1, limit: 20, dateFrom, dateTo })

    const call = mockPrismaDiaryFindMany.mock.calls[0][0]
    expect(call.where.date).toEqual({ gte: dateFrom, lte: dateTo })
  })

  it('sets createdAt gte when days filter is positive', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-10T12:00:00Z'))

    await listDiariesForUser(7n, { page: 1, limit: 20, days: 7 })

    const call = mockPrismaDiaryFindMany.mock.calls[0][0]
    expect(call.where.createdAt).toBeDefined()
    // 7 days before 2026-07-10T12:00:00Z = 2026-07-03T12:00:00Z
    expect(call.where.createdAt.gte).toEqual(new Date('2026-07-03T12:00:00Z'))
  })

  it('does not apply days filter when days is 0 or undefined', async () => {
    await listDiariesForUser(7n, { page: 1, limit: 20 })
    expect(mockPrismaDiaryFindMany.mock.calls[0][0].where.createdAt).toBeUndefined()

    vi.clearAllMocks()
    mockPrismaDiaryFindMany.mockResolvedValue([])

    await listDiariesForUser(7n, { page: 1, limit: 20, days: 0 })
    expect(mockPrismaDiaryFindMany.mock.calls[0][0].where.createdAt).toBeUndefined()
  })

  it('reviewStatus=pending sets reviewStatus + reviewDueAt <= now (overdue/due)', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-10T12:00:00Z'))

    await listDiariesForUser(7n, { page: 1, limit: 20, reviewStatus: 'pending' })

    const call = mockPrismaDiaryFindMany.mock.calls[0][0]
    expect(call.where.reviewStatus).toBe('pending')
    expect(call.where.reviewDueAt).toEqual({ lte: new Date('2026-07-10T12:00:00Z') })
  })

  it('reviewStatus=reviewed passes through as-is (no special casing)', async () => {
    await listDiariesForUser(7n, { page: 1, limit: 20, reviewStatus: 'reviewed' })

    const call = mockPrismaDiaryFindMany.mock.calls[0][0]
    expect(call.where.reviewStatus).toBe('reviewed')
    expect(call.where.reviewDueAt).toBeUndefined()
  })

  it('count uses the same where clause as findMany', async () => {
    await listDiariesForUser(7n, {
      page: 1,
      limit: 20,
      search: 'x',
      dateFrom: new Date('2026-01-01T00:00:00.000Z'),
    })

    const findWhere = mockPrismaDiaryFindMany.mock.calls[0][0].where
    const countWhere = mockPrismaDiaryCount.mock.calls[0][0].where
    expect(countWhere.OR).toEqual(findWhere.OR)
    expect(countWhere.date).toEqual(findWhere.date)
    expect(countWhere.userId).toBe(findWhere.userId)
  })

  it('returns items with parsed tags alongside tagsString', async () => {
    mockPrismaDiaryFindMany.mockResolvedValue([{ ...baseItem, tagsString: 'tech,ai' }])

    const { items } = await listDiariesForUser(7n, { page: 1, limit: 20 })

    expect(items[0].tags).toEqual(['tech', 'ai'])
    // tagsString preserved for callers that want the raw value
    expect(items[0].tagsString).toBe('tech,ai')
    // BigInt kept raw — handlers serialize
    expect(items[0].id).toBe(1n)
  })

  it('returns a bounded aggregate of all linked Trade Plan statuses', async () => {
    mockPrismaDiaryFindMany.mockResolvedValue([{
      ...baseItem,
      tradePlans: [
        { status: 'active' },
        { status: 'active' },
        { status: 'closed' },
      ],
    }])

    const { items } = await listDiariesForUser(7n, { page: 1, limit: 20 })

    expect(items[0].tradePlanSummary).toEqual({
      total: 3,
      statuses: [
        { status: 'active', count: 2 },
        { status: 'closed', count: 1 },
      ],
    })
    expect(items[0]).not.toHaveProperty('tradePlans')
  })

  it('omits the Trade Plan summary when a Diary has no linked plans', async () => {
    mockPrismaDiaryFindMany.mockResolvedValue([{ ...baseItem, tradePlans: [] }])

    const { items } = await listDiariesForUser(7n, { page: 1, limit: 20 })

    expect(items[0].tradePlanSummary).toBeUndefined()
  })

  it('selects only the list fields (no full content join of unrelated fields)', async () => {
    await listDiariesForUser(7n, { page: 1, limit: 20 })

    const select = mockPrismaDiaryFindMany.mock.calls[0][0].select
    expect(select.id).toBe(true)
    expect(select.title).toBe(true)
    expect(select.content).toBe(true)
    expect(select.alerts.select.id).toBe(true)
    expect(select.transactions.select.symbol).toBe(true)
    expect(select.tradePlans).toEqual({ select: { status: true } })
    expect(select.tradePlans.select).not.toHaveProperty('notes')
    expect(select.tradePlans.select).not.toHaveProperty('invalidationCondition')
  })
})

// ============================================================
// Tests for buildReviewBuckets
// ============================================================

describe('buildReviewBuckets', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
    mockPrismaDiaryFindMany.mockResolvedValue([])
  })

  // Helper: build the 5-bucket Promise.all in the same order as the impl.
  function mockBuckets(values: { unscheduled?: any[]; overdue?: any[]; today?: any[]; upcoming?: any[]; completed?: any[] }) {
    mockPrismaDiaryFindMany
      .mockResolvedValueOnce(values.unscheduled ?? [])
      .mockResolvedValueOnce(values.overdue ?? [])
      .mockResolvedValueOnce(values.today ?? [])
      .mockResolvedValueOnce(values.upcoming ?? [])
      .mockResolvedValueOnce(values.completed ?? [])
  }

  it('uses Asia/Taipei user-local day range (UTC+8): today = [16:00 prev day UTC, 16:00 same day UTC)', async () => {
    // 2026-06-14T12:00 UTC = 2026-06-14T20:00 Taipei. User-local today = 2026-06-14.
    // Expected window: [2026-06-13T16:00Z, 2026-06-14T16:00Z)
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-14T12:00:00Z'))

    mockBuckets({})

    await buildReviewBuckets(7n, 'Asia/Taipei')

    // overdue bucket uses reviewDueAt < todayStart
    expect(mockPrismaDiaryFindMany.mock.calls[1][0].where.reviewDueAt).toEqual({
      lt: new Date('2026-06-13T16:00:00.000Z'),
    })
    // today bucket uses [todayStart, tomorrowStart)
    expect(mockPrismaDiaryFindMany.mock.calls[2][0].where.reviewDueAt).toEqual({
      gte: new Date('2026-06-13T16:00:00.000Z'),
      lt: new Date('2026-06-14T16:00:00.000Z'),
    })
    // upcoming bucket uses reviewDueAt >= tomorrowStart
    expect(mockPrismaDiaryFindMany.mock.calls[3][0].where.reviewDueAt).toEqual({
      gte: new Date('2026-06-14T16:00:00.000Z'),
    })
  })

  it('crosses month boundary correctly (last day of June → first of July)', async () => {
    // 2026-06-30T12:00 UTC = 2026-06-30T20:00 Taipei. User-local today = 2026-06-30.
    // tomorrowStart should be 2026-07-01T16:00Z (next day UTC midnight in Taipei).
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-30T12:00:00Z'))

    mockBuckets({})

    await buildReviewBuckets(7n, 'Asia/Taipei')

    expect(mockPrismaDiaryFindMany.mock.calls[2][0].where.reviewDueAt).toEqual({
      gte: new Date('2026-06-29T16:00:00.000Z'),
      lt: new Date('2026-06-30T16:00:00.000Z'),
    })
    expect(mockPrismaDiaryFindMany.mock.calls[3][0].where.reviewDueAt).toEqual({
      gte: new Date('2026-06-30T16:00:00.000Z'),
    })
  })

  it('handles DST spring-forward (America/New_York transitions EST→EDT at 2026-03-08 02:00 local)', async () => {
    // 2026-03-10T12:00 UTC. NY is EDT (UTC-4) after 2026-03-08.
    // User-local today = 2026-03-10. todayStart = 2026-03-10T04:00Z, tomorrowStart = 2026-03-11T04:00Z.
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-10T12:00:00Z'))

    mockBuckets({})

    await buildReviewBuckets(7n, 'America/New_York')

    expect(mockPrismaDiaryFindMany.mock.calls[2][0].where.reviewDueAt).toEqual({
      gte: new Date('2026-03-10T04:00:00.000Z'),
      lt: new Date('2026-03-11T04:00:00.000Z'),
    })
  })

  it('handles DST fall-back edge (America/New_York transitions EDT→EST at 2026-11-01 02:00 local)', async () => {
    // 2026-11-02T12:00 UTC. NY is EST (UTC-5) after 2026-11-01.
    // User-local today = 2026-11-02. todayStart = 2026-11-02T05:00Z.
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-02T12:00:00Z'))

    mockBuckets({})

    await buildReviewBuckets(7n, 'America/New_York')

    expect(mockPrismaDiaryFindMany.mock.calls[2][0].where.reviewDueAt).toEqual({
      gte: new Date('2026-11-02T05:00:00.000Z'),
      lt: new Date('2026-11-03T05:00:00.000Z'),
    })
  })

  it('unscheduled bucket requires reviewDueAt=null AND reviewStatus=pending, excludes reviewed', async () => {
    mockBuckets({})

    await buildReviewBuckets(7n, 'Asia/Taipei')

    expect(mockPrismaDiaryFindMany.mock.calls[0][0].where).toMatchObject({
      userId: 7n,
      reviewDueAt: null,
      reviewStatus: 'pending',
      NOT: { reviewStatus: 'reviewed' },
    })
  })

  it('open buckets (overdue/today/upcoming) all carry NOT reviewStatus=reviewed', async () => {
    mockBuckets({})

    await buildReviewBuckets(7n, 'Asia/Taipei')

    for (const idx of [1, 2, 3]) {
      expect(mockPrismaDiaryFindMany.mock.calls[idx][0].where.NOT).toEqual({ reviewStatus: 'reviewed' })
    }
  })

  it('completed bucket caps at 50 items ordered by reviewedAt desc', async () => {
    mockBuckets({})

    await buildReviewBuckets(7n, 'Asia/Taipei')

    const completedCall = mockPrismaDiaryFindMany.mock.calls[4][0]
    expect(completedCall.take).toBe(50)
    expect(completedCall.orderBy).toEqual({ reviewedAt: 'desc' })
    expect(completedCall.where).toEqual({ userId: 7n, reviewStatus: 'reviewed' })
  })

  it('normalizes null reviewStatus to "none" on each bucket item', async () => {
    mockBuckets({
      today: [{
        id: 1n,
        title: 'T',
        date: new Date('2026-06-14T09:00:00Z'),
        thesis: null,
        risk: null,
        reviewDueAt: new Date('2026-06-14T15:00:00Z'),
        reviewStatus: null,
        reviewedAt: null,
      }],
    })

    const { today } = await buildReviewBuckets(7n, 'Asia/Taipei')

    expect(today[0].reviewStatus).toBe('none')
  })

  it('runs the 5 bucket queries concurrently (Promise.all, single tick)', async () => {
    // ponytail: assert that all 5 reads are dispatched in parallel — this is
    // the latency win of keeping them in one query layer function.
    mockBuckets({})

    await buildReviewBuckets(7n, 'Asia/Taipei')

    // All 5 dispatched before any resolved — sync calls recorded before await.
    expect(mockPrismaDiaryFindMany).toHaveBeenCalledTimes(5)
  })
})
