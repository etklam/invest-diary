import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockGetQuery } from '../../vi-setup'

// --- Hoisted mocks ---
const mockDiaryFindMany = vi.fn()
const mockDiaryCount = vi.fn()
const mockDiaryLogInfo = vi.fn()
const mockDiaryLogWarn = vi.fn()
const mockDiaryLogError = vi.fn()
const mockDiaryLog = {
  info: mockDiaryLogInfo,
  warn: mockDiaryLogWarn,
  error: mockDiaryLogError,
}
const mockDiaryWithRequestId = vi.fn(() => mockDiaryLog)

vi.mock('~/lib/prisma', () => ({
  default: {
    diary: {
      findMany: mockDiaryFindMany,
      count: mockDiaryCount,
    },
  },
}))

vi.mock('~/lib/logger', () => ({
  logger: {
    diary: {
      withRequestId: mockDiaryWithRequestId,
    },
  },
}))

// ============================================================
// Tests for parseSearchQuery (existing utility, verify behavior)
// ============================================================
import { parseSearchQuery } from '~/server/utils/query-params'

describe('parseSearchQuery', () => {
  it('returns undefined for undefined input', () => {
    expect(parseSearchQuery(undefined)).toBeUndefined()
  })

  it('returns undefined for null input', () => {
    expect(parseSearchQuery(null)).toBeUndefined()
  })

  it('returns undefined for empty string', () => {
    expect(parseSearchQuery('')).toBeUndefined()
  })

  it('returns undefined for whitespace-only string', () => {
    expect(parseSearchQuery('   ')).toBeUndefined()
  })

  it('returns trimmed string for valid input', () => {
    expect(parseSearchQuery('  hello  ')).toBe('hello')
  })

  it('truncates string exceeding maxLength', () => {
    const long = 'a'.repeat(600)
    expect(parseSearchQuery(long)).toBe('a'.repeat(500))
  })
})

// ============================================================
// Tests for parseDiarySortOption (new function to be added)
// ============================================================
import { parseDiarySortOption } from '~/server/utils/query-params'

describe('parseDiarySortOption', () => {
  it('returns default sort { createdAt: desc } for undefined', () => {
    expect(parseDiarySortOption(undefined)).toEqual({ createdAt: 'desc' })
  })

  it('returns default sort for empty string', () => {
    expect(parseDiarySortOption('')).toEqual({ createdAt: 'desc' })
  })

  it('returns default sort for invalid value', () => {
    expect(parseDiarySortOption('invalid')).toEqual({ createdAt: 'desc' })
  })

  it('maps date-desc to { createdAt: desc }', () => {
    expect(parseDiarySortOption('date-desc')).toEqual({ createdAt: 'desc' })
  })

  it('maps date-asc to { createdAt: asc }', () => {
    expect(parseDiarySortOption('date-asc')).toEqual({ createdAt: 'asc' })
  })

  it('maps title-asc to { title: asc }', () => {
    expect(parseDiarySortOption('title-asc')).toEqual({ title: 'asc' })
  })

  it('maps title-desc to { title: desc }', () => {
    expect(parseDiarySortOption('title-desc')).toEqual({ title: 'desc' })
  })
})

// ============================================================
// Integration-style tests for GET /api/diaries handler
// ============================================================
describe('GET /api/diaries handler — filter/sort integration', () => {
  const baseDiaries = [
    {
      id: 1n, userId: 1n, title: 'Alpha Trade', content: 'Bought AAPL',
      tagsString: 'watch', createdVia: 'WEB', createdByLabel: null,
      date: new Date('2026-06-01T12:00:00Z'), createdAt: new Date('2026-06-01T12:00:00Z'),
      updatedAt: new Date('2026-06-01T12:00:00Z'),
      alerts: [], transactions: [],
    },
    {
      id: 2n, userId: 1n, title: 'Beta Review', content: 'Sold TSLA',
      tagsString: null, createdVia: 'WEB', createdByLabel: null,
      date: new Date('2026-05-20T12:00:00Z'), createdAt: new Date('2026-05-20T12:00:00Z'),
      updatedAt: new Date('2026-05-20T12:00:00Z'),
      alerts: [], transactions: [],
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetQuery.mockReturnValue({})
    mockDiaryFindMany.mockResolvedValue(baseDiaries)
    mockDiaryCount.mockResolvedValue(2)
    mockDiaryWithRequestId.mockReturnValue(mockDiaryLog)
  })

  /** Helper: import the handler fresh */
  async function getHandler() {
    const mod = await import('~/server/api/diaries.get')
    return mod.default
  }

  it('passes search query to prisma as OR with contains on title and content', async () => {
    mockGetQuery.mockReturnValue({ search: 'AAPL' })
    const handler = await getHandler()

    await handler({ context: { user: { id: '1' }, requestId: 'req-search' } })

    const call = mockDiaryFindMany.mock.calls[0][0]
    expect(call.where.OR).toBeDefined()
    expect(call.where.OR).toHaveLength(2)
    expect(call.where.OR[0]).toEqual({ title: { contains: 'AAPL' } })
    expect(call.where.OR[1]).toEqual({ content: { contains: 'AAPL' } })
  })

  it('passes dateFrom as date gte filter', async () => {
    mockGetQuery.mockReturnValue({ dateFrom: '2026-05-01' })
    const handler = await getHandler()

    await handler({ context: { user: { id: '1' }, requestId: 'req-from' } })

    const call = mockDiaryFindMany.mock.calls[0][0]
    expect(call.where.date).toBeDefined()
    expect(call.where.date.gte).toBeInstanceOf(Date)
    expect(call.where.date.gte.getUTCFullYear()).toBe(2026)
    expect(call.where.date.gte.getUTCMonth()).toBe(4) // May = 4
    expect(call.where.date.gte.getUTCDate()).toBe(1)
    expect(call.where.date.gte.getUTCHours()).toBe(0)
  })

  it('passes dateTo as date lte filter (end of day)', async () => {
    mockGetQuery.mockReturnValue({ dateTo: '2026-06-30' })
    const handler = await getHandler()

    await handler({ context: { user: { id: '1' }, requestId: 'req-to' } })

    const call = mockDiaryFindMany.mock.calls[0][0]
    expect(call.where.date).toBeDefined()
    expect(call.where.date.lte).toBeInstanceOf(Date)
    expect(call.where.date.lte.getUTCFullYear()).toBe(2026)
    expect(call.where.date.lte.getUTCMonth()).toBe(5) // June = 5
    expect(call.where.date.lte.getUTCDate()).toBe(30)
    expect(call.where.date.lte.getUTCHours()).toBe(23)
  })

  it('combines dateFrom and dateTo into a single date filter', async () => {
    mockGetQuery.mockReturnValue({ dateFrom: '2026-05-01', dateTo: '2026-05-31' })
    const handler = await getHandler()

    await handler({ context: { user: { id: '1' }, requestId: 'req-range' } })

    const call = mockDiaryFindMany.mock.calls[0][0]
    expect(call.where.date.gte).toBeInstanceOf(Date)
    expect(call.where.date.lte).toBeInstanceOf(Date)
  })

  it('combines search with date range', async () => {
    mockGetQuery.mockReturnValue({ search: 'test', dateFrom: '2026-01-01', dateTo: '2026-12-31' })
    const handler = await getHandler()

    await handler({ context: { user: { id: '1' }, requestId: 'req-combo' } })

    const call = mockDiaryFindMany.mock.calls[0][0]
    expect(call.where.OR).toBeDefined()
    expect(call.where.date).toBeDefined()
    expect(call.where.date.gte).toBeDefined()
    expect(call.where.date.lte).toBeDefined()
  })

  it('passes sortBy=date-asc as orderBy { createdAt: asc }', async () => {
    mockGetQuery.mockReturnValue({ sortBy: 'date-asc' })
    const handler = await getHandler()

    await handler({ context: { user: { id: '1' }, requestId: 'req-sort' } })

    const call = mockDiaryFindMany.mock.calls[0][0]
    expect(call.orderBy).toEqual({ createdAt: 'asc' })
  })

  it('passes sortBy=title-asc as orderBy { title: asc }', async () => {
    mockGetQuery.mockReturnValue({ sortBy: 'title-asc' })
    const handler = await getHandler()

    await handler({ context: { user: { id: '1' }, requestId: 'req-title-asc' } })

    const call = mockDiaryFindMany.mock.calls[0][0]
    expect(call.orderBy).toEqual({ title: 'asc' })
  })

  it('passes sortBy=title-desc as orderBy { title: desc }', async () => {
    mockGetQuery.mockReturnValue({ sortBy: 'title-desc' })
    const handler = await getHandler()

    await handler({ context: { user: { id: '1' }, requestId: 'req-title-desc' } })

    const call = mockDiaryFindMany.mock.calls[0][0]
    expect(call.orderBy).toEqual({ title: 'desc' })
  })

  it('defaults orderBy to { createdAt: desc } when no sortBy', async () => {
    const handler = await getHandler()

    await handler({ context: { user: { id: '1' }, requestId: 'req-default' } })

    const call = mockDiaryFindMany.mock.calls[0][0]
    expect(call.orderBy).toEqual({ createdAt: 'desc' })
  })

  it('falls back to default sort for invalid sortBy', async () => {
    mockGetQuery.mockReturnValue({ sortBy: 'nonsense' })
    const handler = await getHandler()

    await handler({ context: { user: { id: '1' }, requestId: 'req-invalid' } })

    const call = mockDiaryFindMany.mock.calls[0][0]
    expect(call.orderBy).toEqual({ createdAt: 'desc' })
  })

  it('ignores empty search string', async () => {
    mockGetQuery.mockReturnValue({ search: '' })
    const handler = await getHandler()

    await handler({ context: { user: { id: '1' }, requestId: 'req-empty' } })

    const call = mockDiaryFindMany.mock.calls[0][0]
    expect(call.where.OR).toBeUndefined()
  })

  it('ignores invalid dateFrom', async () => {
    mockGetQuery.mockReturnValue({ dateFrom: 'not-a-date' })
    const handler = await getHandler()

    await handler({ context: { user: { id: '1' }, requestId: 'req-bad-from' } })

    const call = mockDiaryFindMany.mock.calls[0][0]
    expect(call.where.date).toBeUndefined()
  })

  it('ignores invalid dateTo', async () => {
    mockGetQuery.mockReturnValue({ dateTo: 'yesterday' })
    const handler = await getHandler()

    await handler({ context: { user: { id: '1' }, requestId: 'req-bad-to' } })

    const call = mockDiaryFindMany.mock.calls[0][0]
    expect(call.where.date).toBeUndefined()
  })

  it('preserves existing days filter alongside new filters', async () => {
    mockGetQuery.mockReturnValue({ days: '7', search: 'AAPL' })
    const handler = await getHandler()

    await handler({ context: { user: { id: '1' }, requestId: 'req-days' } })

    const call = mockDiaryFindMany.mock.calls[0][0]
    // days filter sets createdAt gte
    expect(call.where.createdAt).toBeDefined()
    // search sets OR
    expect(call.where.OR).toBeDefined()
  })

  it('counts with the same where clause (including filters)', async () => {
    mockGetQuery.mockReturnValue({ search: 'AAPL', dateFrom: '2026-01-01' })
    const handler = await getHandler()

    await handler({ context: { user: { id: '1' }, requestId: 'req-count' } })

    const findManyWhere = mockDiaryFindMany.mock.calls[0][0].where
    const countWhere = mockDiaryCount.mock.calls[0][0].where
    // Both should have the same filters applied
    expect(countWhere.OR).toEqual(findManyWhere.OR)
    expect(countWhere.date).toEqual(findManyWhere.date)
  })
})
