import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockReadBody } from '../vi-setup'

const mockDiaryFindFirst = vi.fn()
const mockDiaryUpdate = vi.fn()
const mockTransactionDeleteMany = vi.fn()
const mockTransactionUpdateMany = vi.fn()
const mockTransactionCreate = vi.fn()
const mockAlertDeleteMany = vi.fn()
const mockPrismaTransaction = vi.fn()
const mockWithRequestId = vi.fn(() => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}))
const mockParsePositiveBigIntParam = vi.fn()

vi.mock('~/lib/prisma', () => ({
  default: {
    diary: {
      findFirst: mockDiaryFindFirst,
    },
    $transaction: mockPrismaTransaction,
  },
}))

vi.mock('~/lib/logger', () => ({
  logger: {
    diary: {
      withRequestId: mockWithRequestId,
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

describe('PUT /api/diaries/:id transaction diff upsert', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockParsePositiveBigIntParam.mockReturnValue(12n)
    mockDiaryFindFirst.mockResolvedValue({ id: 12n, userId: 1n })
    mockTransactionUpdateMany.mockResolvedValue({ count: 1 })
    mockDiaryUpdate.mockResolvedValue({
      id: 12n,
      title: 'Updated',
      content: 'Updated content',
      tagsString: 'a,b',
      transactions: [{ id: 100n, symbol: 'AAPL' }],
      alerts: [],
    })
    mockPrismaTransaction.mockImplementation(async (cb: any) => cb({
      transaction: {
        deleteMany: mockTransactionDeleteMany,
        updateMany: mockTransactionUpdateMany,
        create: mockTransactionCreate,
      },
      alert: { deleteMany: mockAlertDeleteMany },
      diary: { update: mockDiaryUpdate },
    }))
  })

  it('keeps existing transaction ids when payload includes id', async () => {
    mockReadBody.mockResolvedValue({
      title: 'Updated',
      content: 'Updated content',
      tags: ['a', 'b'],
      transactions: [
        { id: '100', symbol: 'aapl', type: 'BUY', quantity: 1, price: 10 },
      ],
      alerts: [],
    })

    const { default: handler } = await import('~/server/api/diaries/[id].put')
    await handler({ context: { user: { id: '1' }, requestId: 'req-1' } } as any)

    expect(mockTransactionDeleteMany).toHaveBeenCalledWith({
      where: {
        diaryId: 12n,
        id: { notIn: [100n] },
      },
    })
    expect(mockTransactionUpdateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 100n, diaryId: 12n },
      data: expect.objectContaining({ symbol: 'AAPL' }),
    }))
    expect(mockTransactionCreate).not.toHaveBeenCalled()
  })

  it('creates new transaction when id is missing', async () => {
    mockReadBody.mockResolvedValue({
      title: 'Updated',
      content: 'Updated content',
      tags: [],
      transactions: [
        { symbol: 'msft', type: 'BUY', quantity: 2, price: 20, tradeDate: '2026-05-01' },
      ],
      alerts: [],
    })

    const { default: handler } = await import('~/server/api/diaries/[id].put')
    await handler({ context: { user: { id: '1' }, requestId: 'req-2' } } as any)

    expect(mockTransactionDeleteMany).toHaveBeenCalledWith({
      where: {
        diaryId: 12n,
        id: { notIn: [0n] },
      },
    })
    expect(mockTransactionCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ symbol: 'MSFT', diaryId: 12n }),
    }))
  })

  it('returns validation error when transaction id does not belong to diary', async () => {
    mockReadBody.mockResolvedValue({
      title: 'Updated',
      content: 'Updated content',
      tags: [],
      transactions: [
        { id: '999', symbol: 'msft', type: 'SELL', quantity: 2, price: 20 },
      ],
      alerts: [],
    })
    mockTransactionUpdateMany.mockResolvedValue({ count: 0 })

    const { default: handler } = await import('~/server/api/diaries/[id].put')
    await expect(handler({ context: { user: { id: '1' }, requestId: 'req-3' } } as any)).rejects.toMatchObject({
      statusCode: 400,
    })
  })
})
