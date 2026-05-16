import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock variables must be hoisted so they're available when vi.mock runs
const {
  mockPrismaDiaryFindFirst,
  mockPrismaDiaryCreate,
  mockPrismaDiaryUpdate,
  mockPrismaTransaction,
  mockTxDiaryUpdate,
  mockTxTransactionDeleteMany,
  mockTxTransactionUpdateMany,
  mockTxTransactionCreate,
  mockTxAlertDeleteMany,
} = vi.hoisted(() => ({
  mockPrismaDiaryFindFirst: vi.fn(),
  mockPrismaDiaryCreate: vi.fn(),
  mockPrismaDiaryUpdate: vi.fn(),
  mockPrismaTransaction: vi.fn(),
  mockTxDiaryUpdate: vi.fn(),
  mockTxTransactionDeleteMany: vi.fn(),
  mockTxTransactionUpdateMany: vi.fn(),
  mockTxTransactionCreate: vi.fn(),
  mockTxAlertDeleteMany: vi.fn(),
}))

vi.mock('~/lib/prisma', () => ({
  default: {
    diary: {
      findFirst: mockPrismaDiaryFindFirst,
      create: mockPrismaDiaryCreate,
      update: mockPrismaDiaryUpdate,
    },
    $transaction: mockPrismaTransaction,
  },
}))

// ============================================================
// Tests for diffTransactions (pure function)
// ============================================================

import { diffTransactions } from '~/server/utils/diary-write'
import type { TransactionInput } from '~/types/diary'

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

  it('should throw validation error when transactions are invalid (SELL more than held)', () => {
    const transactions = [
      { symbol: 'AAPL', type: 'SELL' as const, quantity: 100, price: 10 },
    ]

    expect(() => validateDiaryInput('Valid Title', transactions)).toThrow()
    try {
      validateDiaryInput('Valid Title', transactions)
    } catch (e: any) {
      expect(e.code).toBe('SYS_VALIDATION_ERROR')
      expect(e.details[0].field).toBe('transactions')
    }
  })

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
  })

  const baseCreatedDiary = {
    id: 1n,
    userId: 1n,
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
    mockPrismaDiaryUpdate.mockResolvedValue({
      ...baseCreatedDiary,
      id: 99n,
      content: 'Existing content\n\n---\n\nNew content',
      tagsString: 'watch,mistake',
    })

    const result = await createDiaryForUser({
      userId: '1',
      body: {
        title: 'Test Diary',
        content: 'New content',
        appendToToday: true,
        tags: ['mistake'],
      },
    })

    expect(mockPrismaDiaryUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 99n },
        data: expect.objectContaining({
          tagsString: 'watch,mistake',
        }),
      })
    )
    expect(mockPrismaDiaryCreate).not.toHaveBeenCalled()
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

  it('should create diary with alerts', async () => {
    mockPrismaDiaryFindFirst.mockResolvedValue(null)
    mockPrismaDiaryCreate.mockResolvedValue(baseCreatedDiary)

    await createDiaryForUser({
      userId: '1',
      body: {
        title: 'Test Diary',
        content: 'Some content',
        alerts: [
          { message: 'Check AAPL', triggerAt: '2026-06-01T12:00:00Z' },
        ],
      },
    })

    expect(mockPrismaDiaryCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          alerts: {
            create: expect.arrayContaining([
              expect.objectContaining({
                message: 'Check AAPL',
              }),
            ]),
          },
        }),
      })
    )
  })
})

// ============================================================
// Tests for updateDiaryForUser
// ============================================================

import { updateDiaryForUser } from '~/server/utils/diary-write'

describe('updateDiaryForUser', () => {
  beforeEach(() => {
    vi.clearAllMocks()

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
        alert: { deleteMany: mockTxAlertDeleteMany },
        diary: { update: mockTxDiaryUpdate },
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
        data: expect.objectContaining({ symbol: 'AAPL' }),
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
        data: expect.objectContaining({ symbol: 'MSFT', diaryId: 12n }),
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

  it('should throw diaryAccessDenied when user does not own the diary', async () => {
    mockPrismaDiaryFindFirst.mockResolvedValue({ id: 12n, userId: 2n })

    await expect(
      updateDiaryForUser({
        userId: '1',
        diaryId: '12',
        body: { title: 'Title', content: 'Content' },
      })
    ).rejects.toMatchObject({
      code: 'DIARY_ACCESS_DENIED',
    })
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

  it('should handle empty alerts gracefully', async () => {
    mockPrismaDiaryFindFirst.mockResolvedValue({ id: 12n, userId: 1n })

    await updateDiaryForUser({
      userId: '1',
      diaryId: '12',
      body: { title: 'Title', content: 'Content' },
    })

    // Alerts should still be deleted and recreated (even if empty)
    expect(mockTxAlertDeleteMany).toHaveBeenCalled()
    expect(mockTxDiaryUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          alerts: { create: undefined },
        }),
      })
    )
  })
})
