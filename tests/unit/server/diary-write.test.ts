import { describe, it, expect, vi, beforeEach } from 'vitest'
import { aDiary } from '../../fixtures/builders'

// Mock variables must be hoisted so they're available when vi.mock runs
const {
  mockPrismaDiaryFindFirst,
  mockPrismaDiaryCreate,
  mockPrismaDiaryUpdate,
  mockPrismaDiaryDelete,
  mockPrismaTransactionFindMany,
  mockPrismaTransaction,
  mockTxDiaryCreate,
  mockTxDiaryUpdate,
  mockTxTransactionDeleteMany,
  mockTxTransactionUpdateMany,
  mockTxTransactionCreate,
  mockTxAlertDeleteMany,
  mockTxAlertCreate,
  mockTxAlertCreateMany,
  mockTxAlertUpdate,
  mockTxUserFindUnique,
  mockTxQueryRaw,
} = vi.hoisted(() => ({
  mockPrismaDiaryFindFirst: vi.fn(),
  mockPrismaDiaryCreate: vi.fn(),
  mockPrismaDiaryUpdate: vi.fn(),
  mockPrismaDiaryDelete: vi.fn(),
  mockPrismaTransactionFindMany: vi.fn(),
  mockPrismaTransaction: vi.fn(),
  mockTxDiaryCreate: vi.fn(),
  mockTxDiaryUpdate: vi.fn(),
  mockTxTransactionDeleteMany: vi.fn(),
  mockTxTransactionUpdateMany: vi.fn(),
  mockTxTransactionCreate: vi.fn(),
  mockTxAlertDeleteMany: vi.fn(),
  mockTxAlertCreate: vi.fn(),
  mockTxAlertCreateMany: vi.fn(),
  mockTxAlertUpdate: vi.fn(),
  mockTxUserFindUnique: vi.fn(),
  mockTxQueryRaw: vi.fn(),
}))

vi.mock('~/lib/prisma', () => ({
  default: {
    diary: {
      findFirst: mockPrismaDiaryFindFirst,
      create: mockPrismaDiaryCreate,
      update: mockPrismaDiaryUpdate,
      delete: mockPrismaDiaryDelete,
    },
    transaction: {
      findMany: mockPrismaTransactionFindMany,
    },
    $transaction: mockPrismaTransaction,
  },
}))

// ============================================================
// Tests for diffTransactions (pure function)
// ============================================================

import { diffTransactions, isUniqueConstraintError } from '~/server/utils/diary-write'
import type { TransactionInput } from '~/lib/contracts/diary'

describe('diffTransactions', () => {
  it('should separate incoming transactions into toCreate (no id) and toUpdate (has id)', () => {
    const incoming: TransactionInput[] = [
      { id: 100n, symbol: 'AAPL', type: 'BUY', quantity: 10, price: 150 },
      { symbol: 'GOOGL', type: 'SELL', quantity: 5, price: 2800 },
      { id: '200', symbol: 'TSLA', type: 'BUY', quantity: 3, price: 250, notes: 'test', strategy: 'momentum', emotion: 'confident' },
    ]

    const result = diffTransactions(incoming)

    // toUpdate: transactions with id (100n and '200')
    expect(result.toUpdate).toHaveLength(2)
    expect(result.toUpdate[0].id).toBe(100n)
    expect(result.toUpdate[0].data.symbol).toBe('AAPL')
    expect(result.toUpdate[0].data.type).toBe('BUY')
    expect(result.toUpdate[0].data.quantity).toBe(10)
    expect(result.toUpdate[0].data.price).toBe(150)

    expect(result.toUpdate[1].id).toBe(200n)
    expect(result.toUpdate[1].data.symbol).toBe('TSLA')
    expect(result.toUpdate[1].data.notes).toBe('test')
    expect(result.toUpdate[1].data.strategy).toBe('momentum')
    expect(result.toUpdate[1].data.emotion).toBe('confident')

    // toCreate: transaction without id (GOOGL)
    expect(result.toCreate).toHaveLength(1)
    expect(result.toCreate[0].symbol).toBe('GOOGL')
    expect(result.toCreate[0].type).toBe('SELL')
    expect(result.toCreate[0].quantity).toBe(5)
    expect(result.toCreate[0].price).toBe(2800)
  })

  it('should handle undefined incoming', () => {
    const result = diffTransactions(undefined)
    expect(result.toCreate).toEqual([])
    expect(result.toUpdate).toEqual([])
  })

  it('should handle empty array', () => {
    const result = diffTransactions([])
    expect(result.toCreate).toEqual([])
    expect(result.toUpdate).toEqual([])
  })

  it('should uppercase and trim symbols', () => {
    const incoming: TransactionInput[] = [
      { symbol: '  aapl  ', type: 'BUY', quantity: 1, price: 10 },
    ]

    const result = diffTransactions(incoming)

    expect(result.toCreate[0].symbol).toBe('AAPL')
  })

  it('should prefer trade_date over tradeDate for dates', () => {
    const tradeDate = new Date('2026-01-15')
    const trade_date = new Date('2026-02-20')
    const incoming: TransactionInput[] = [
      { symbol: 'AAPL', type: 'BUY', quantity: 1, price: 10, tradeDate, trade_date },
    ]

    const result = diffTransactions(incoming)

    // trade_date should win over tradeDate
    expect(result.toCreate[0].tradeDate).toEqual(trade_date)
  })

  it('should use tradeDate when trade_date is not present', () => {
    const tradeDate = new Date('2026-03-10')
    const incoming: TransactionInput[] = [
      { symbol: 'AAPL', type: 'BUY', quantity: 1, price: 10, tradeDate },
    ]

    const result = diffTransactions(incoming)

    expect(result.toCreate[0].tradeDate).toEqual(tradeDate)
  })

  it('should default tradeDate to new Date() when neither field is set', () => {
    const beforeCall = new Date()
    const incoming: TransactionInput[] = [
      { symbol: 'AAPL', type: 'BUY', quantity: 1, price: 10 },
    ]

    const result = diffTransactions(incoming)
    const afterCall = new Date()

    // tradeDate should be a Date instance around now
    expect(result.toCreate[0].tradeDate).toBeInstanceOf(Date)
    expect(result.toCreate[0].tradeDate.getTime()).toBeGreaterThanOrEqual(beforeCall.getTime() - 1000)
    expect(result.toCreate[0].tradeDate.getTime()).toBeLessThanOrEqual(afterCall.getTime() + 1000)
  })

  it('should convert string ids to bigint in toUpdate', () => {
    const incoming: TransactionInput[] = [
      { id: '42', symbol: 'NVDA', type: 'BUY', quantity: 100, price: 800 },
    ]

    const result = diffTransactions(incoming)

    expect(result.toUpdate[0].id).toBe(42n)
  })

  it('should convert number ids to bigint in toUpdate', () => {
    const incoming: TransactionInput[] = [
      { id: 99, symbol: 'MSFT', type: 'SELL', quantity: 20, price: 400 },
    ]

    const result = diffTransactions(incoming)

    expect(result.toUpdate[0].id).toBe(99n)
  })

  it('should set optional fields to null when not provided', () => {
    const incoming: TransactionInput[] = [
      { symbol: 'AAPL', type: 'BUY', quantity: 1, price: 10 },
    ]

    const result = diffTransactions(incoming)

    expect(result.toCreate[0].notes).toBeNull()
    expect(result.toCreate[0].strategy).toBeNull()
    expect(result.toCreate[0].emotion).toBeNull()
  })

  it('should handle bigint ids in toUpdate', () => {
    const incoming: TransactionInput[] = [
      { id: BigInt(777), symbol: 'AMD', type: 'BUY', quantity: 50, price: 120 },
    ]

    const result = diffTransactions(incoming)

    expect(result.toUpdate[0].id).toBe(777n)
  })

  it.each(['abc', '1.5', '-1', '0', ''])('rejects malformed string transaction id %j with a 400 validation error', (id) => {
    const incoming: TransactionInput[] = [
      { id, symbol: 'AAPL', type: 'BUY', quantity: 1, price: 10 } as unknown as TransactionInput,
    ]

    let caught: any
    try {
      diffTransactions(incoming)
    } catch (error) {
      caught = error
    }

    expect(caught).toMatchObject({
      code: 'SYS_VALIDATION_ERROR',
      statusCode: 400,
      details: [{ field: 'transactions.0.id' }],
    })
  })

  it.each([1.5, -1, 0, Number.NaN])('rejects malformed numeric transaction id %s with a 400 validation error', (id) => {
    const incoming: TransactionInput[] = [
      { id, symbol: 'AAPL', type: 'BUY', quantity: 1, price: 10 } as unknown as TransactionInput,
    ]

    let caught: any
    try {
      diffTransactions(incoming)
    } catch (error) {
      caught = error
    }

    expect(caught).toMatchObject({
      code: 'SYS_VALIDATION_ERROR',
      statusCode: 400,
      details: [{ field: 'transactions.0.id' }],
    })
  })

  it('recognizes Prisma unique constraint errors without requiring Prisma runtime classes', () => {
    expect(isUniqueConstraintError({ code: 'P2002' })).toBe(true)
    expect(isUniqueConstraintError({ code: 'P2025' })).toBe(false)
    expect(isUniqueConstraintError(null)).toBe(false)
  })
})

// ============================================================
// Tests for validateDiaryInput
// ============================================================

import { validateDiaryInput } from '~/server/utils/diary-write'

describe('validateDiaryInput', () => {
  it('should throw validation error when title is empty', () => {
    expect(() => validateDiaryInput('', undefined)).toThrow()
    try {
      validateDiaryInput('', undefined)
    } catch (e: any) {
      expect(e.code).toBe('SYS_VALIDATION_ERROR')
      expect(e.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'title', message: 'Title is required' }),
        ])
      )
    }
  })

  it('should throw validation error when title is missing (undefined)', () => {
    expect(() => validateDiaryInput(undefined, undefined)).toThrow()
    try {
      validateDiaryInput(undefined, undefined)
    } catch (e: any) {
      expect(e.code).toBe('SYS_VALIDATION_ERROR')
      expect(e.details[0].field).toBe('title')
    }
  })

  // Oversell (SELL more than held) is no longer validateDiaryInput's job —
  // the ledger authority is calculateLedgerHoldings via
  // validateDiaryTransactionsForUser, covered in tests/unit/lib/diary-authoring.test.ts.

  it('should pass with valid title and no transactions', () => {
    expect(() => validateDiaryInput('My Diary', undefined)).not.toThrow()
  })

  it('should pass with valid title and valid transactions', () => {
    const transactions = [
      { symbol: 'AAPL', type: 'BUY' as const, quantity: 10, price: 150 },
      { symbol: 'AAPL', type: 'SELL' as const, quantity: 5, price: 160 },
    ]

    expect(() => validateDiaryInput('My Diary', transactions)).not.toThrow()
  })
})

// ============================================================
// Tests for createDiaryForUser
// ============================================================

import { createDiaryForUser } from '~/server/utils/diary-write'

describe('createDiaryForUser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrismaTransactionFindMany.mockResolvedValue([])
    mockTxUserFindUnique.mockResolvedValue({ timezone: 'Asia/Taipei' })
  })

  const baseCreatedDiary = aDiary({
    id: 1n,
    userId: 1n,
    title: 'Test Diary',
    content: 'Some content',
    date: new Date('2026-05-17T12:00:00Z'),
    createdAt: new Date('2026-05-17T12:00:00Z'),
    updatedAt: new Date('2026-05-17T12:00:00Z'),
  })

  it('should create a diary successfully', async () => {
    mockPrismaDiaryFindFirst.mockResolvedValue(null)
    mockPrismaDiaryCreate.mockResolvedValue(baseCreatedDiary)

    const result = await createDiaryForUser({
      userId: '1',
      body: { title: 'Test Diary', content: 'Some content' },
    })

    expect(result.id).toBe(1n)
    expect(mockPrismaDiaryCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: 'Test Diary',
          content: 'Some content',
          userId: 1n,
        }),
      })
    )
  })

  it('should throw validation error when title is missing', async () => {
    await expect(
      createDiaryForUser({
        userId: '1',
        body: { content: 'Some content' } as any,
      })
    ).rejects.toMatchObject({
      code: 'SYS_VALIDATION_ERROR',
    })
  })

  it('should throw validation error when content is missing', async () => {
    await expect(
      createDiaryForUser({
        userId: '1',
        body: { title: 'Test Diary' } as any,
      })
    ).rejects.toMatchObject({
      code: 'SYS_VALIDATION_ERROR',
    })
  })

  it('should throw diaryAlreadyExists when diary exists and appendToToday is false', async () => {
    mockPrismaDiaryFindFirst.mockResolvedValue({ id: 99n, userId: 1n })

    await expect(
      createDiaryForUser({
        userId: '1',
        body: { title: 'Test Diary', content: 'Some content' },
      })
    ).rejects.toMatchObject({
      code: 'DIARY_ALREADY_EXISTS',
    })
  })

  it('should append to existing diary when appendToToday is true', async () => {
    mockPrismaDiaryFindFirst.mockResolvedValue({
      id: 99n,
      userId: 1n,
      content: 'Existing content',
      tagsString: 'watch',
    })
    mockTxQueryRaw.mockResolvedValue([{ content: 'Existing content', tags: 'watch' }])
    mockTxDiaryUpdate.mockResolvedValue({
      ...baseCreatedDiary,
      id: 99n,
      content: 'Existing content\n\n---\n\nNew content',
      tagsString: 'watch,mistake',
    })
    mockPrismaTransaction.mockImplementation(async (cb: any) => cb({
      $queryRaw: mockTxQueryRaw,
      diary: { update: mockTxDiaryUpdate },
    }))

    await createDiaryForUser({
      userId: '1',
      body: {
        title: 'Test Diary',
        content: 'New content',
        appendToToday: true,
        tags: ['mistake'],
      },
    })

    // The append must re-read the diary row inside the transaction with a
    // locking read, then merge against what that read returned.
    expect(mockTxQueryRaw).toHaveBeenCalled()
    expect(String(mockTxQueryRaw.mock.calls[0]?.[0])).toContain('FOR UPDATE')
    expect(mockTxDiaryUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 99n },
        data: expect.objectContaining({
          content: 'Existing content\n\n---\n\nNew content',
          tagsString: 'watch,mistake',
        }),
      })
    )
    expect(mockPrismaDiaryCreate).not.toHaveBeenCalled()
  })

  it('appends to the content re-read inside the transaction, not the stale outer read', async () => {
    // Simulates a concurrent append committing between the outer findFirst and
    // the transaction: the locking re-read must see the newer content and the
    // update must build on it, not on the stale snapshot.
    mockPrismaDiaryFindFirst.mockResolvedValue({
      id: 99n,
      userId: 1n,
      content: 'Stale content',
      tagsString: null,
    })
    mockTxQueryRaw.mockResolvedValue([{
      content: 'Stale content\n\n---\n\nConcurrent append',
      tags: null,
    }])
    mockTxDiaryUpdate.mockResolvedValue({
      ...baseCreatedDiary,
      id: 99n,
      content: 'Stale content\n\n---\n\nConcurrent append\n\n---\n\nNew content',
    })
    mockPrismaTransaction.mockImplementation(async (cb: any) => cb({
      $queryRaw: mockTxQueryRaw,
      diary: { update: mockTxDiaryUpdate },
    }))

    await createDiaryForUser({
      userId: '1',
      body: {
        title: 'Test Diary',
        content: 'New content',
        appendToToday: true,
      },
    })

    expect(mockTxDiaryUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 99n },
        data: expect.objectContaining({
          content: 'Stale content\n\n---\n\nConcurrent append\n\n---\n\nNew content',
        }),
      })
    )
  })

  it('persists appended transactions and alerts atomically with the content merge', async () => {
    mockPrismaDiaryFindFirst.mockResolvedValue({
      id: 99n,
      userId: 1n,
      content: 'Existing content',
      tagsString: 'watch',
    })
    mockTxQueryRaw.mockResolvedValue([{ content: 'Existing content', tags: 'watch' }])
    mockTxTransactionCreate.mockResolvedValue({ id: 701n })
    mockTxAlertCreate.mockResolvedValue({ id: 702n })
    mockTxDiaryUpdate.mockResolvedValue({
      ...baseCreatedDiary,
      id: 99n,
      content: 'Existing content\n\n---\n\nNew content',
      transactions: [{ id: 701n }],
      alerts: [{ id: 702n }],
    })
    mockPrismaTransaction.mockImplementation(async (cb: any) => cb({
      $queryRaw: mockTxQueryRaw,
      transaction: { create: mockTxTransactionCreate },
      alert: {
        create: mockTxAlertCreate,
        createMany: mockTxAlertCreateMany,
        update: mockTxAlertUpdate,
      },
      diary: { update: mockTxDiaryUpdate },
      user: { findUnique: mockTxUserFindUnique },
    }))

    await createDiaryForUser({
      userId: '1',
      body: {
        title: 'Test Diary',
        content: 'New content',
        appendToToday: true,
        transactions: [{ symbol: 'AAPL', type: 'BUY', quantity: 1, price: 100 }],
        alerts: [{ message: 'Review', triggerAt: '2026-06-01T09:30:00Z' }],
      },
    })

    expect(mockTxTransactionCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ diaryId: 99n, userId: 1n, symbol: 'AAPL' }),
    }))
    expect(mockTxAlertCreate).toHaveBeenCalled()
    expect(mockTxDiaryUpdate).toHaveBeenCalled()
  })

  it('should create diary with transactions', async () => {
    mockPrismaDiaryFindFirst.mockResolvedValue(null)
    mockPrismaDiaryCreate.mockResolvedValue(baseCreatedDiary)

    await createDiaryForUser({
      userId: '1',
      body: {
        title: 'Test Diary',
        content: 'Some content',
        transactions: [
          { symbol: 'AAPL', type: 'BUY', quantity: 10, price: 150 },
        ],
      },
    })

    expect(mockPrismaDiaryCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          transactions: {
            create: expect.arrayContaining([
              expect.objectContaining({
                symbol: 'AAPL',
                type: 'BUY',
                quantity: 10,
                price: 150,
                userId: 1n,
              }),
            ]),
          },
        }),
      })
    )
  })

  it.each([
    ['quantity', 0],
    ['quantity', -1],
    ['quantity', Number.NaN],
    ['quantity', Number.POSITIVE_INFINITY],
    ['price', 0],
    ['price', -1],
    ['price', 'not-a-number'],
  ])('rejects invalid transaction %s before persistence', async (field, value) => {
    await expect(createDiaryForUser({
      userId: '1',
      body: {
        title: 'Invalid transaction',
        content: 'Should not persist',
        transactions: [{
          symbol: 'AAPL',
          type: 'BUY',
          quantity: field === 'quantity' ? value : 1,
          price: field === 'price' ? value : 100,
        } as any],
      },
    })).rejects.toMatchObject({
      code: 'SYS_VALIDATION_ERROR',
      details: [expect.objectContaining({ field: `transactions.0.${field}` })],
    })

    expect(mockPrismaDiaryFindFirst).not.toHaveBeenCalled()
    expect(mockPrismaDiaryCreate).not.toHaveBeenCalled()
  })

  it('maps a concurrent create unique conflict to a structured diary conflict', async () => {
    mockPrismaDiaryFindFirst.mockResolvedValue(null)
    mockPrismaDiaryCreate.mockRejectedValue({ code: 'P2002', meta: { target: ['user_id', 'date'] } })

    await expect(createDiaryForUser({
      userId: '1',
      body: { title: 'Concurrent diary', content: 'Conflict' },
    })).rejects.toMatchObject({ code: 'DIARY_ALREADY_EXISTS', statusCode: 409 })
  })

  it('rejects more than 100 transactions per diary before any DB access', async () => {
    const transactions = Array.from({ length: 101 }, () => ({
      symbol: 'AAPL',
      type: 'BUY' as const,
      quantity: 1,
      price: 1,
    }))

    await expect(createDiaryForUser({
      userId: '1',
      body: { title: 'Too many rows', content: 'Should not persist', transactions },
    })).rejects.toMatchObject({
      code: 'SYS_VALIDATION_ERROR',
      statusCode: 400,
      details: [{ field: 'transactions', message: expect.stringContaining('100') }],
    })

    expect(mockPrismaDiaryFindFirst).not.toHaveBeenCalled()
    expect(mockPrismaDiaryCreate).not.toHaveBeenCalled()
  })

  it('rejects more than 50 alerts per diary before any DB access', async () => {
    const alerts = Array.from({ length: 51 }, () => ({ message: 'Review' }))

    await expect(createDiaryForUser({
      userId: '1',
      body: { title: 'Too many alerts', content: 'Should not persist', alerts },
    })).rejects.toMatchObject({
      code: 'SYS_VALIDATION_ERROR',
      statusCode: 400,
      details: [{ field: 'alerts', message: expect.stringContaining('50') }],
    })

    expect(mockPrismaDiaryFindFirst).not.toHaveBeenCalled()
    expect(mockPrismaTransaction).not.toHaveBeenCalled()
  })

  it('rejects a title longer than 500 characters', async () => {
    await expect(createDiaryForUser({
      userId: '1',
      body: { title: 'x'.repeat(501), content: 'Should not persist' },
    })).rejects.toMatchObject({
      code: 'SYS_VALIDATION_ERROR',
      details: [{ field: 'title', message: expect.stringContaining('500') }],
    })

    expect(mockPrismaDiaryCreate).not.toHaveBeenCalled()
  })

  it('rejects content longer than 500000 characters', async () => {
    await expect(createDiaryForUser({
      userId: '1',
      body: { title: 'Valid title', content: 'x'.repeat(500_001) },
    })).rejects.toMatchObject({
      code: 'SYS_VALIDATION_ERROR',
      details: [{ field: 'content', message: expect.stringContaining('500000') }],
    })

    expect(mockPrismaDiaryCreate).not.toHaveBeenCalled()
  })

  it('allows a SELL in a later diary when the owned ledger has prior holdings', async () => {
    mockPrismaDiaryFindFirst.mockResolvedValue(null)
    mockPrismaTransactionFindMany.mockResolvedValue([{
      id: 10n,
      symbol: 'AAPL',
      type: 'BUY',
      quantity: 10,
      price: 100,
      tradeDate: new Date('2026-05-17T12:00:00.000Z'),
    }])
    mockPrismaDiaryCreate.mockResolvedValue(baseCreatedDiary)

    await expect(createDiaryForUser({
      userId: '1',
      body: {
        title: 'Later diary',
        content: 'Sell from the prior diary holding',
        date: '2026-05-18',
        transactions: [{ symbol: 'AAPL', type: 'SELL', quantity: 4, price: 110 }],
      },
    })).resolves.toBeDefined()

    expect(mockPrismaTransactionFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        diary: expect.objectContaining({ userId: 1n }),
      }),
    }))
  })

  it('still rejects a SELL when the owned ledger has no holdings', async () => {
    mockPrismaDiaryFindFirst.mockResolvedValue(null)
    mockPrismaTransactionFindMany.mockResolvedValue([])

    await expect(createDiaryForUser({
      userId: '1',
      body: {
        title: 'Invalid sell',
        content: 'No position',
        date: '2026-05-18',
        transactions: [{ symbol: 'AAPL', type: 'SELL', quantity: 1, price: 110 }],
      },
    })).rejects.toMatchObject({ code: 'SYS_VALIDATION_ERROR' })

    expect(mockPrismaDiaryCreate).not.toHaveBeenCalled()
  })

  it('should create diary with alerts', async () => {
    mockPrismaDiaryFindFirst.mockResolvedValue(null)
    mockTxDiaryCreate.mockResolvedValue(baseCreatedDiary)
    mockTxAlertCreate.mockResolvedValue({ id: 401n })
    mockPrismaTransaction.mockImplementation(async (cb: any) => cb({
      diary: { create: mockTxDiaryCreate },
      alert: { create: mockTxAlertCreate },
      user: { findUnique: mockTxUserFindUnique },
    }))

    await createDiaryForUser({
      userId: '1',
      body: {
        title: 'Test Diary',
        content: 'Some content',
        alerts: [
          { message: 'Check AAPL', triggerAt: '2026-06-01T09:30:00Z' },
        ],
      },
    })

    expect(mockTxAlertCreate).toHaveBeenCalledWith({
      data: {
        diaryId: 1n,
        message: 'Check AAPL',
        triggerAt: new Date('2026-06-01T09:30:00Z'),
      },
    })
    expect(mockTxDiaryCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.not.objectContaining({
          alerts: expect.anything(),
        }),
      })
    )
  })

  it('should persist recurring_mode when creating a diary', async () => {
    mockPrismaDiaryFindFirst.mockResolvedValue(null)
    mockTxDiaryCreate.mockResolvedValue(baseCreatedDiary)
    mockTxAlertCreate.mockResolvedValue({ id: 601n })
    mockPrismaTransaction.mockImplementation(async (cb: any) => cb({
      diary: { create: mockTxDiaryCreate },
      alert: {
        create: mockTxAlertCreate,
        createMany: mockTxAlertCreateMany,
        update: mockTxAlertUpdate,
      },
      user: { findUnique: mockTxUserFindUnique },
    }))

    await createDiaryForUser({
      userId: '1',
      body: {
        title: 'Test Diary',
        content: 'Some content',
        alerts: [{
          message: 'Review trades',
          trigger_at: '2026-06-03T09:30:00Z',
          recurring_mode: 'WEEK',
        }],
      },
    })

    expect(mockTxAlertUpdate).toHaveBeenCalledWith({
      where: { id: 601n },
      data: { parentId: 601n },
    })
    expect(mockTxAlertCreateMany).toHaveBeenCalled()
  })

  it('should create all transactions even when payload contains id (not silently dropped)', async () => {
    mockPrismaDiaryFindFirst.mockResolvedValue(null)
    mockPrismaDiaryCreate.mockResolvedValue(baseCreatedDiary)

    await createDiaryForUser({
      userId: '1',
      body: {
        title: 'Test Diary',
        content: 'Some content',
        transactions: [
          { id: '999', symbol: 'AAPL', type: 'BUY', quantity: 10, price: 150 },
          { symbol: 'MSFT', type: 'BUY', quantity: 5, price: 400 },
        ],
      },
    })

    // Both transactions should be created (id is ignored, not routed to update)
    expect(mockPrismaDiaryCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          transactions: {
            create: expect.arrayContaining([
              expect.objectContaining({ symbol: 'AAPL', userId: 1n }),
              expect.objectContaining({ symbol: 'MSFT', userId: 1n }),
            ]),
          },
        }),
      })
    )
  })

  it('should report content error before transaction error when both are invalid', async () => {
    await expect(
      createDiaryForUser({
        userId: '1',
        body: {
          title: 'Test Diary',
          content: '',
          transactions: [
            { symbol: 'AAPL', type: 'SELL', quantity: 100, price: 10 },
          ],
        } as any,
      })
    ).rejects.toMatchObject({
      code: 'SYS_VALIDATION_ERROR',
      details: expect.arrayContaining([
        expect.objectContaining({ field: 'content' }),
      ]),
    })
  })
})

// ============================================================
// Tests for updateDiaryForUser
// ============================================================

import { deleteDiaryForUser, updateDiaryForUser } from '~/server/utils/diary-write'

describe('updateDiaryForUser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrismaTransactionFindMany.mockResolvedValue([])
    mockTxUserFindUnique.mockResolvedValue({ timezone: 'Asia/Taipei' })

    mockTxTransactionUpdateMany.mockResolvedValue({ count: 1 })
    mockTxDiaryUpdate.mockResolvedValue({
      id: 12n,
      title: 'Updated Title',
      content: 'Updated content',
      tagsString: 'watch,mistake',
      date: new Date('2026-05-01T12:00:00Z'),
      createdAt: new Date('2026-05-01T12:00:00Z'),
      updatedAt: new Date('2026-05-13T12:00:00Z'),
      userId: 1n,
      transactions: [
        { id: 100n, symbol: 'AAPL', type: 'BUY', quantity: 10, price: 150, tradeDate: new Date() },
      ],
      alerts: [
        { id: 50n, message: 'Alert', triggerAt: new Date(), isDismissed: false },
      ],
    })

    mockPrismaTransaction.mockImplementation(async (cb: any) => {
      return cb({
        transaction: {
          deleteMany: mockTxTransactionDeleteMany,
          updateMany: mockTxTransactionUpdateMany,
          create: mockTxTransactionCreate,
        },
        alert: {
          deleteMany: mockTxAlertDeleteMany,
          create: mockTxAlertCreate,
          createMany: mockTxAlertCreateMany,
          update: mockTxAlertUpdate,
        },
        diary: { update: mockTxDiaryUpdate },
        user: { findUnique: mockTxUserFindUnique },
      })
    })
  })

  it('should update a diary successfully with tags', async () => {
    mockPrismaDiaryFindFirst.mockResolvedValue({ id: 12n, userId: 1n })

    const result = await updateDiaryForUser({
      userId: '1',
      diaryId: '12',
      body: {
        title: 'Updated Title',
        content: 'Updated content',
        tags: ['watch', 'mistake'],
        transactions: [
          { id: '100', symbol: 'aapl', type: 'BUY', quantity: 10, price: 150 },
        ],
        alerts: [
          { message: 'Alert', triggerAt: new Date('2026-06-01T12:00:00Z') },
        ],
      },
    })

    // Verify diary was updated
    expect(mockTxDiaryUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 12n },
        data: expect.objectContaining({
          title: 'Updated Title',
          tagsString: 'watch,mistake',
        }),
      })
    )

    // Verify transaction with id was updated (not created)
    expect(mockTxTransactionUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 100n, diaryId: 12n },
        data: expect.objectContaining({ symbol: 'AAPL', userId: 1n }),
      })
    )
    expect(mockTxTransactionCreate).not.toHaveBeenCalled()

    // Verify old transactions not in payload are deleted
    expect(mockTxTransactionDeleteMany).toHaveBeenCalledWith({
      where: {
        diaryId: 12n,
        id: { notIn: [100n] },
      },
    })

    // Verify alerts were recreated
    expect(mockTxAlertDeleteMany).toHaveBeenCalledWith({ where: { diaryId: 12n } })

    // Verify result has tags parsed
    expect(result.tags).toEqual(['watch', 'mistake'])
    expect(result.id).toBe(12n)
  })

  it('should create new transactions when id is not provided', async () => {
    mockPrismaDiaryFindFirst.mockResolvedValue({ id: 12n, userId: 1n })

    await updateDiaryForUser({
      userId: 1n,
      diaryId: 12n,
      body: {
        title: 'Title',
        content: 'Content',
        transactions: [
          { symbol: 'MSFT', type: 'BUY', quantity: 2, price: 20 },
        ],
      },
    })

    // New transaction without id => create
    expect(mockTxTransactionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ symbol: 'MSFT', diaryId: 12n, userId: 1n }),
      })
    )
    expect(mockTxTransactionUpdateMany).not.toHaveBeenCalled()

    // Delete any existing ones
    expect(mockTxTransactionDeleteMany).toHaveBeenCalledWith({
      where: {
        diaryId: 12n,
        id: { notIn: [BigInt(0)] },
      },
    })
  })

  it('should validate title is required', async () => {
    await expect(
      updateDiaryForUser({
        userId: '1',
        diaryId: '12',
        body: { title: '', content: 'No title' } as any,
      })
    ).rejects.toMatchObject({
      code: 'SYS_VALIDATION_ERROR',
    })
  })

  it('should validate transactions', async () => {
    mockPrismaDiaryFindFirst.mockResolvedValue({ id: 12n, userId: 1n })

    await expect(
      updateDiaryForUser({
        userId: '1',
        diaryId: '12',
        body: {
          title: 'Title',
          content: 'Content',
          transactions: [
            { symbol: 'AAPL', type: 'SELL', quantity: 100, price: 10 },
          ],
        },
      })
    ).rejects.toMatchObject({
      code: 'SYS_VALIDATION_ERROR',
    })
  })

  it('rejects oversized payloads on update before any DB access', async () => {
    const alerts = Array.from({ length: 51 }, () => ({ message: 'Review' }))

    await expect(
      updateDiaryForUser({
        userId: '1',
        diaryId: '12',
        body: { title: 'Title', content: 'Content', alerts },
      })
    ).rejects.toMatchObject({
      code: 'SYS_VALIDATION_ERROR',
      statusCode: 400,
      details: [{ field: 'alerts', message: expect.stringContaining('50') }],
    })

    expect(mockPrismaDiaryFindFirst).not.toHaveBeenCalled()
    expect(mockPrismaTransaction).not.toHaveBeenCalled()
  })

  it('should throw diaryNotFound when diary does not exist', async () => {
    mockPrismaDiaryFindFirst.mockResolvedValue(null)

    await expect(
      updateDiaryForUser({
        userId: '1',
        diaryId: '999',
        body: { title: 'Title', content: 'Content' },
      })
    ).rejects.toMatchObject({
      code: 'DIARY_NOT_FOUND',
    })
  })

  it('should throw diaryNotFound (not accessDenied) when user does not own the diary', async () => {
    // SQL-level ownership filter: findFirst({ where: { id, userId } }) returns
    // null for both "does not exist" and "owned by someone else", collapsing
    // to a single notFound response (no resource existence leakage).
    mockPrismaDiaryFindFirst.mockResolvedValue(null)

    await expect(
      updateDiaryForUser({
        userId: '1',
        diaryId: '12',
        body: { title: 'Title', content: 'Content' },
      })
    ).rejects.toMatchObject({
      code: 'DIARY_NOT_FOUND',
    })
  })

  it('rejects moving a diary onto another occupied date before any writes', async () => {
    mockPrismaDiaryFindFirst
      .mockResolvedValueOnce({ id: 12n, userId: 1n, date: new Date('2026-05-01T12:00:00Z') })
      .mockResolvedValueOnce({ id: 99n })

    await expect(updateDiaryForUser({
      userId: '1',
      diaryId: '12',
      body: {
        title: 'Move conflict',
        content: 'Should not move',
        date: '2026-05-02',
      },
    })).rejects.toMatchObject({ code: 'DIARY_ALREADY_EXISTS', statusCode: 409 })

    expect(mockPrismaTransaction).not.toHaveBeenCalled()
    expect(mockTxDiaryUpdate).not.toHaveBeenCalled()
  })

  it('maps a concurrent move unique conflict to a structured diary conflict', async () => {
    mockPrismaDiaryFindFirst.mockResolvedValue({ id: 12n, userId: 1n, date: new Date('2026-05-01T12:00:00Z') })
    mockTxDiaryUpdate.mockRejectedValue({ code: 'P2002' })

    await expect(updateDiaryForUser({
      userId: '1',
      diaryId: '12',
      body: {
        title: 'Move race',
        content: 'Conflict',
        date: '2026-05-02',
      },
    })).rejects.toMatchObject({ code: 'DIARY_ALREADY_EXISTS', statusCode: 409 })
  })

  it('should throw validation error when transaction id does not belong to diary', async () => {
    mockPrismaDiaryFindFirst.mockResolvedValue({ id: 12n, userId: 1n })
    mockTxTransactionUpdateMany.mockResolvedValue({ count: 0 })

    await expect(
      updateDiaryForUser({
        userId: '1',
        diaryId: '12',
        body: {
          title: 'Title',
          content: 'Content',
          transactions: [
            { id: '999', symbol: 'AAPL', type: 'BUY', quantity: 1, price: 1 },
          ],
        },
      })
    ).rejects.toMatchObject({
      code: 'SYS_VALIDATION_ERROR',
    })
  })

  it('should handle tags being undefined (not changed)', async () => {
    mockPrismaDiaryFindFirst.mockResolvedValue({ id: 12n, userId: 1n })

    await updateDiaryForUser({
      userId: '1',
      diaryId: '12',
      body: { title: 'Title', content: 'Content' },
    })

    expect(mockTxDiaryUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tagsString: undefined,
        }),
      })
    )
  })

  it('preserves transactions and alerts when optional child fields are omitted', async () => {
    mockPrismaDiaryFindFirst.mockResolvedValue({ id: 12n, userId: 1n })

    await updateDiaryForUser({
      userId: '1',
      diaryId: '12',
      body: { title: 'Title', content: 'Content' },
    })

    expect(mockTxTransactionDeleteMany).not.toHaveBeenCalled()
    expect(mockTxAlertDeleteMany).not.toHaveBeenCalled()
    expect(mockTxDiaryUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.not.objectContaining({
          alerts: expect.anything(),
        }),
      })
    )
  })

  it('does not allow generic Diary updates to bypass structured review completion', async () => {
    mockPrismaDiaryFindFirst.mockResolvedValue({ id: 12n, userId: 1n, reviewStatus: 'pending' })

    await updateDiaryForUser({
      userId: '1',
      diaryId: '12',
      body: {
        title: 'Title',
        content: 'Content',
        reviewStatus: 'reviewed',
        reviewedAt: '2026-08-09T04:00:00.000Z',
      } as any,
    })

    const updateData = mockTxDiaryUpdate.mock.calls[0]?.[0].data
    expect(updateData).not.toHaveProperty('reviewStatus')
    expect(updateData).not.toHaveProperty('reviewedAt')
  })

  it('clears transactions and alerts when empty arrays are provided explicitly', async () => {
    mockPrismaDiaryFindFirst.mockResolvedValue({ id: 12n, userId: 1n })

    await updateDiaryForUser({
      userId: '1',
      diaryId: '12',
      body: { title: 'Title', content: 'Content', transactions: [], alerts: [] },
    })

    expect(mockTxTransactionDeleteMany).toHaveBeenCalled()
    expect(mockTxAlertDeleteMany).toHaveBeenCalled()
  })

  it('rejects clearing an earlier BUY when a later Diary SELL depends on it', async () => {
    mockPrismaDiaryFindFirst.mockResolvedValue({
      id: 12n,
      userId: 1n,
      date: new Date('2026-05-01T12:00:00Z'),
    })
    mockPrismaTransactionFindMany.mockResolvedValue([{
      id: 201n,
      symbol: 'AAPL',
      type: 'SELL',
      quantity: 10,
      price: 120,
      tradeDate: new Date('2026-05-02T12:00:00Z'),
    }])

    await expect(updateDiaryForUser({
      userId: '1',
      diaryId: '12',
      body: { title: 'Remove old buy', content: 'Should be rejected', transactions: [] },
    })).rejects.toMatchObject({
      code: 'SYS_VALIDATION_ERROR',
      details: [expect.objectContaining({ field: 'transactions' })],
    })

    expect(mockTxTransactionDeleteMany).not.toHaveBeenCalled()
    expect(mockTxDiaryUpdate).not.toHaveBeenCalled()
  })

  it('rejects reducing an earlier BUY below a later SELL quantity', async () => {
    mockPrismaDiaryFindFirst.mockResolvedValue({ id: 12n, userId: 1n })
    mockPrismaTransactionFindMany.mockResolvedValue([{
      id: 201n,
      symbol: 'AAPL',
      type: 'SELL',
      quantity: 10,
      price: 120,
      tradeDate: new Date('2026-05-02T12:00:00Z'),
    }])

    await expect(updateDiaryForUser({
      userId: '1',
      diaryId: '12',
      body: {
        title: 'Reduce old buy',
        content: 'Should be rejected',
        transactions: [{
          id: '100',
          symbol: 'AAPL',
          type: 'BUY',
          quantity: 5,
          price: 100,
          tradeDate: '2026-05-01T12:00:00Z',
        }],
      },
    })).rejects.toMatchObject({ code: 'SYS_VALIDATION_ERROR' })

    expect(mockTxTransactionUpdateMany).not.toHaveBeenCalled()
  })

  it('allows an earlier BUY edit when the projected full ledger remains valid', async () => {
    mockPrismaDiaryFindFirst.mockResolvedValue({ id: 12n, userId: 1n })
    mockPrismaTransactionFindMany.mockResolvedValue([{
      id: 201n,
      symbol: 'AAPL',
      type: 'SELL',
      quantity: 10,
      price: 120,
      tradeDate: new Date('2026-05-02T12:00:00Z'),
    }])

    await expect(updateDiaryForUser({
      userId: '1',
      diaryId: '12',
      body: {
        title: 'Keep enough shares',
        content: 'Valid projected ledger',
        transactions: [{
          id: '100',
          symbol: 'AAPL',
          type: 'BUY',
          quantity: 10,
          price: 105,
          tradeDate: '2026-05-01T12:00:00Z',
        }],
      },
    })).resolves.toBeDefined()

    expect(mockTxTransactionUpdateMany).toHaveBeenCalled()
  })

  it('should persist recurring_mode from diary UI as a recurring series', async () => {
    mockPrismaDiaryFindFirst.mockResolvedValue({ id: 12n, userId: 1n })
    mockTxAlertCreate.mockResolvedValue({ id: 501n })

    await updateDiaryForUser({
      userId: '1',
      diaryId: '12',
      body: {
        title: 'Title',
        content: 'Content',
        alerts: [{
          message: 'Review trades',
          trigger_at: '2026-06-03T09:30:00Z',
          recurring_mode: 'WEEK',
        }],
      },
    })

    expect(mockTxAlertUpdate).toHaveBeenCalledWith({
      where: { id: 501n },
      data: { parentId: 501n },
    })
    expect(mockTxAlertCreateMany).toHaveBeenCalled()
  })
})

describe('deleteDiaryForUser complete ledger validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrismaDiaryFindFirst.mockResolvedValue({ id: 12n, userId: 1n })
    mockPrismaDiaryDelete.mockResolvedValue({ id: 12n })
    mockPrismaTransactionFindMany.mockResolvedValue([])
  })

  it('rejects deleting a Diary when a later SELL depends on its BUY', async () => {
    mockPrismaTransactionFindMany.mockResolvedValue([{
      id: 201n,
      symbol: 'AAPL',
      type: 'SELL',
      quantity: 10,
      price: 120,
      tradeDate: new Date('2026-05-02T12:00:00Z'),
    }])

    await expect(deleteDiaryForUser(12n, 1n)).rejects.toMatchObject({
      code: 'SYS_VALIDATION_ERROR',
    })
    expect(mockPrismaDiaryDelete).not.toHaveBeenCalled()
  })

  it('allows deleting a Diary when the remaining full ledger stays valid', async () => {
    await expect(deleteDiaryForUser(12n, 1n)).resolves.toBeUndefined()
    expect(mockPrismaTransactionFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        diary: { userId: 1n },
        diaryId: { not: 12n },
      },
    }))
    expect(mockPrismaDiaryDelete).toHaveBeenCalledWith({ where: { id: 12n } })
  })
})
