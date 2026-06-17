import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock variables must be hoisted so they're available when vi.mock runs
const { mockPrismaDiaryFindFirst } = vi.hoisted(() => ({
  mockPrismaDiaryFindFirst: vi.fn(),
}))

vi.mock('~/lib/prisma', () => ({
  default: {
    diary: {
      findFirst: mockPrismaDiaryFindFirst,
    },
  },
}))

// ============================================================
// Tests for findDiaryForUser
// ============================================================

import { findDiaryForUser, findDiaryByDate } from '~/server/utils/diary-read'

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
      include: { transactions: true, alerts: true },
    })
  })

  it('should return diary when found and owned by user (string ids)', async () => {
    mockPrismaDiaryFindFirst.mockResolvedValue(baseDiary)

    const result = await findDiaryForUser('1', '42')

    expect(result).toEqual(baseDiary)
    expect(mockPrismaDiaryFindFirst).toHaveBeenCalledWith({
      where: { id: 1n, userId: 42n },
      include: { transactions: true, alerts: true },
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
      include: { transactions: true, alerts: true },
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
      include: { transactions: true, alerts: true },
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
