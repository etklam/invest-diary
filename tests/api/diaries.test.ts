import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockGetQuery, mockReadBody, mockGetRouterParam } from '../vi-setup'

const mockDiaryFindMany = vi.fn()
const mockDiaryCount = vi.fn()
const mockDiaryFindFirst = vi.fn()
const mockDiaryCreate = vi.fn()
const mockDiaryUpdate = vi.fn()
const mockDiaryDelete = vi.fn()
const mockTransaction = vi.fn()
const mockTxTransactionDeleteMany = vi.fn()
const mockTxAlertDeleteMany = vi.fn()

vi.mock('~/lib/prisma', () => ({
  default: {
    diary: {
      findMany: mockDiaryFindMany,
      count: mockDiaryCount,
      findFirst: mockDiaryFindFirst,
      create: mockDiaryCreate,
      update: mockDiaryUpdate,
      delete: mockDiaryDelete,
    },
    $transaction: mockTransaction,
  },
}))

describe('Diary API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetQuery.mockReturnValue({})
    mockReadBody.mockResolvedValue(null)
    mockGetRouterParam.mockReturnValue(null)
    mockTransaction.mockImplementation(async (callback: (tx: any) => Promise<unknown>) => {
      const tx = {
        transaction: { deleteMany: mockTxTransactionDeleteMany },
        alert: { deleteMany: mockTxAlertDeleteMany },
        diary: { update: mockDiaryUpdate },
      }
      return callback(tx)
    })
  })

  describe('GET /api/diaries', () => {
    it('should return paginated diaries for the user', async () => {
      const now = new Date('2026-01-05T10:00:00.000Z')
      mockGetQuery.mockReturnValue({ page: '1', limit: '2' })
      mockDiaryFindMany.mockResolvedValue([
        {
          id: 1n,
          title: 'First diary',
          content: 'content',
          date: now,
          createdAt: now,
          updatedAt: now,
          alerts: [{ id: 11n, message: 'Alert', triggerAt: now, isDismissed: false }],
          transactions: [{ id: 21n, symbol: 'AAPL', type: 'BUY', quantity: 1, price: 100, tradeDate: now }],
        },
      ])
      mockDiaryCount.mockResolvedValue(1)

      const { default: handler } = await import('~/server/api/diaries.get')

      const result = await handler({ context: { user: { id: '1' } } } as any)

      expect(mockDiaryFindMany).toHaveBeenCalled()
      expect(result.pagination).toEqual({ page: 1, limit: 2, total: 1, totalPages: 1 })
      expect(result.data[0].id).toBe('1')
      expect(result.data[0].alerts[0].id).toBe('11')
      expect(result.data[0].transactions[0].id).toBe('21')
    })
  })

  describe('POST /api/diaries', () => {
    it('should create a new diary', async () => {
      const diaryDate = new Date('2026-01-02T00:00:00.000Z')
      mockReadBody.mockResolvedValue({
        title: 'New Diary',
        content: 'New content',
        date: diaryDate.toISOString(),
        transactions: [{ symbol: 'AAPL', type: 'BUY', quantity: 1, price: 100, tradeDate: diaryDate }],
        alerts: [{ message: 'Reminder', triggerAt: diaryDate }],
      })
      mockDiaryFindFirst.mockResolvedValue(null)
      mockDiaryCreate.mockResolvedValue({
        id: 100n,
        title: 'New Diary',
        content: 'New content',
        date: diaryDate,
        transactions: [],
        alerts: [],
      })

      const { default: handler } = await import('~/server/api/diaries.post')

      const result = await handler({ context: { user: { id: '1' } } } as any)

      expect(mockDiaryCreate).toHaveBeenCalled()
      expect(result.id).toBe(100n)
    })

    it('should return 400 when title is missing', async () => {
      mockReadBody.mockResolvedValue({ content: 'No title' })

      const { default: handler } = await import('~/server/api/diaries.post')

      await expect(handler({ context: { user: { id: '1' } } } as any)).rejects.toMatchObject({
        statusCode: 400,
      })
    })

    it('should append to existing diary when appendToToday is true', async () => {
      mockReadBody.mockResolvedValue({
        title: 'Entry',
        content: 'Additional content',
        appendToToday: true,
      })
      mockDiaryFindFirst.mockResolvedValue({ id: 5n, content: 'Original content' })
      mockDiaryUpdate.mockResolvedValue({
        id: 5n,
        content: 'Original content\n\n---\n\nAdditional content',
      })

      const { default: handler } = await import('~/server/api/diaries.post')

      const result = await handler({ context: { user: { id: '1' } } } as any)

      expect(mockDiaryUpdate).toHaveBeenCalled()
      expect(result.content).toContain('Original content')
      expect(result.content).toContain('Additional content')
      expect(result.content).toContain('---')
    })

    it('should reject when diary exists and appendToToday is false', async () => {
      mockReadBody.mockResolvedValue({
        title: 'Entry',
        content: 'New content',
        appendToToday: false,
      })
      mockDiaryFindFirst.mockResolvedValue({ id: 6n, content: 'Existing content' })

      const { default: handler } = await import('~/server/api/diaries.post')

      await expect(handler({ context: { user: { id: '1' } } } as any)).rejects.toMatchObject({
        statusCode: 409,
      })
    })
  })

  describe('PUT /api/diaries/:id', () => {
    it('should update an existing diary and replace relations', async () => {
      mockGetRouterParam.mockReturnValue('12')
      mockReadBody.mockResolvedValue({
        title: 'Updated Title',
        content: 'Updated content',
        transactions: [{ symbol: 'TSLA', type: 'BUY', quantity: 2, price: 300, tradeDate: new Date() }],
        alerts: [{ message: 'Alert', triggerAt: new Date() }],
      })
      mockDiaryFindFirst.mockResolvedValue({ id: 12n, userId: '1' })
      mockDiaryUpdate.mockResolvedValue({
        id: 12n,
        title: 'Updated Title',
        content: 'Updated content',
      })

      const { default: handler } = await import('~/server/api/diaries/[id].put')

      const result = await handler({
        context: { user: { id: '1' }, requestId: 'req-1' },
      } as any)

      expect(mockTxTransactionDeleteMany).toHaveBeenCalled()
      expect(mockTxAlertDeleteMany).toHaveBeenCalled()
      expect(result.title).toBe('Updated Title')
    })
  })

  describe('DELETE /api/diaries/:id', () => {
    it('should delete a diary', async () => {
      mockGetRouterParam.mockReturnValue('3')
      mockDiaryFindFirst.mockResolvedValue({ id: 3n })
      mockDiaryDelete.mockResolvedValue({ id: 3n })

      const { default: handler } = await import('~/server/api/diaries/[id].delete')

      const result = await handler({
        context: { user: { id: '1' }, requestId: 'req-2' },
      } as any)

      expect(mockDiaryDelete).toHaveBeenCalledWith({ where: { id: 3n } })
      expect(result).toEqual({ success: true })
    })
  })
})
