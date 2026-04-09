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
      findFirst: mockDiaryFindFirst,
      create: mockDiaryCreate,
      update: mockDiaryUpdate,
      delete: mockDiaryDelete,
    },
    $transaction: mockTransaction,
  },
}))
vi.mock('~/lib/logger', () => ({
  logger: {
    diary: {
      withRequestId: mockDiaryWithRequestId,
    },
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
    mockDiaryWithRequestId.mockReturnValue(mockDiaryLog)
  })

  describe('GET /api/diaries', () => {
    it('should return paginated diaries for the user', async () => {
      const now = new Date('2026-01-05T10:00:00.000Z')
      mockGetQuery.mockReturnValue({ page: '1', limit: '2' })
      mockDiaryFindMany.mockResolvedValue([
        {
          id: 1n,
          userId: 1n,
          title: 'First diary',
          content: 'content',
          tagsString: 'profit, watch',
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
      expect(result.data[0].tags).toEqual(['profit', 'watch'])
      expect(result.data[0].alerts[0].id).toBe('11')
      expect(result.data[0].transactions[0].id).toBe('21')
    })
  })

  describe('POST /api/diaries', () => {
    it('should create a new diary and persist tags', async () => {
      const diaryDate = new Date('2026-01-02T00:00:00.000Z')
      mockReadBody.mockResolvedValue({
        title: 'New Diary',
        content: 'New content',
        tags: ['profit', 'watch'],
        date: diaryDate.toISOString(),
        transactions: [{ symbol: 'AAPL', type: 'BUY', quantity: 1, price: 100, tradeDate: diaryDate }],
        alerts: [{ message: 'Reminder', triggerAt: diaryDate }],
      })
      mockDiaryFindFirst.mockResolvedValue(null)
      mockDiaryCreate.mockResolvedValue({
        id: 100n,
        title: 'New Diary',
        content: 'New content',
        tagsString: 'profit,watch',
        date: diaryDate,
        transactions: [],
        alerts: [],
      })

      const { default: handler } = await import('~/server/api/diaries.post')
      const mockEvent = { context: { user: { id: '1' }, requestId: 'req-create' } } as any

      const result = await handler(mockEvent)

      expect(mockDiaryCreate).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          tagsString: 'profit,watch',
        }),
      }))
      expect(result.id).toBe(100n)
      expect(result.tags).toEqual(['profit', 'watch'])
      expect(mockDiaryWithRequestId).toHaveBeenCalledWith('req-create')
      expect(mockDiaryLogInfo).toHaveBeenCalledWith(
        'Diary created',
        expect.objectContaining({
          diaryId: '100',
          userId: '1',
        })
      )
    })

    it('should return 400 when title is missing', async () => {
      mockReadBody.mockResolvedValue({ content: 'No title' })

      const { default: handler } = await import('~/server/api/diaries.post')

      await expect(handler({ context: { user: { id: '1' } } } as any)).rejects.toMatchObject({
        statusCode: 400,
      })
    })

    it('should append to existing diary and merge tags when appendToToday is true', async () => {
      mockReadBody.mockResolvedValue({
        title: 'Entry',
        content: 'Additional content',
        tags: ['profit', 'watch'],
        appendToToday: true,
      })
      mockDiaryFindFirst.mockResolvedValue({ id: 5n, content: 'Original content', tagsString: 'watch,learning' })
      mockDiaryUpdate.mockResolvedValue({
        id: 5n,
        content: 'Original content\n\n---\n\nAdditional content',
        tagsString: 'watch,learning,profit',
      })

      const { default: handler } = await import('~/server/api/diaries.post')

      const result = await handler({ context: { user: { id: '1' } } } as any)

      expect(mockDiaryUpdate).toHaveBeenCalled()
      expect(result.content).toContain('Original content')
      expect(result.content).toContain('Additional content')
      expect(result.content).toContain('---')
      expect(mockDiaryUpdate).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          tagsString: 'watch,learning,profit',
        }),
      }))
      expect(result.tags).toEqual(['watch', 'learning', 'profit'])
    })

    it('should reject when diary exists and appendToToday is false', async () => {
      mockReadBody.mockResolvedValue({
        title: 'Entry',
        content: 'New content',
        appendToToday: false,
      })
      mockDiaryFindFirst.mockResolvedValue({ id: 6n, content: 'Existing content' })

      const { default: handler } = await import('~/server/api/diaries.post')

      const mockEvent = { context: { user: { id: '1' }, requestId: 'req-exists' } } as any

      await expect(handler(mockEvent)).rejects.toMatchObject({
        statusCode: 409,
      })
    })

    it('should log unexpected errors through the shared logger', async () => {
      mockReadBody.mockResolvedValue({
        title: 'New Diary',
        content: 'New content',
      })
      mockDiaryFindFirst.mockResolvedValue(null)
      mockDiaryCreate.mockRejectedValue(new Error('DB failure'))

      const { default: handler } = await import('~/server/api/diaries.post')
      const mockEvent = { context: { user: { id: '1' }, requestId: 'req-error' } } as any

      await expect(handler(mockEvent)).rejects.toMatchObject({
        statusCode: 500,
      })

      expect(mockDiaryWithRequestId).toHaveBeenCalledWith('req-error')
      expect(mockDiaryLogError).toHaveBeenCalledWith(
        'Error creating diary',
        expect.objectContaining({
          userId: '1',
          error: expect.stringContaining('DB failure'),
        })
      )
    })
  })

  describe('GET /api/diaries/:id', () => {
    it('should return diary detail with parsed tags', async () => {
      const now = new Date('2026-01-03T10:00:00.000Z')
      mockGetRouterParam.mockReturnValue('9')
      mockDiaryFindFirst.mockResolvedValue({
        id: 9n,
        userId: 1n,
        title: 'Tagged diary',
        content: 'Body',
        tagsString: 'learning, swing',
        date: now,
        createdAt: now,
        updatedAt: now,
        transactions: [],
        alerts: [],
      })

      const { default: handler } = await import('~/server/api/diaries/[id].get')

      const result = await handler({
        context: { user: { id: '1' }, requestId: 'req-3' },
      } as any)

      expect(result.tags).toEqual(['learning', 'swing'])
      expect(result.tagsString).toBe('learning, swing')
    })
  })

  describe('PUT /api/diaries/:id', () => {
    it('should update an existing diary, replace relations, and persist tags', async () => {
      mockGetRouterParam.mockReturnValue('12')
      mockReadBody.mockResolvedValue({
        title: 'Updated Title',
        content: 'Updated content',
        tags: ['watch', 'mistake'],
        transactions: [{ symbol: 'TSLA', type: 'BUY', quantity: 2, price: 300, tradeDate: new Date() }],
        alerts: [{ message: 'Alert', triggerAt: new Date() }],
      })
      mockDiaryFindFirst.mockResolvedValue({ id: 12n, userId: '1' })
      mockDiaryUpdate.mockResolvedValue({
        id: 12n,
        title: 'Updated Title',
        content: 'Updated content',
        tagsString: 'watch,mistake',
      })

      const { default: handler } = await import('~/server/api/diaries/[id].put')

      const result = await handler({
        context: { user: { id: '1' }, requestId: 'req-1' },
      } as any)

      expect(mockTxTransactionDeleteMany).toHaveBeenCalled()
      expect(mockTxAlertDeleteMany).toHaveBeenCalled()
      expect(mockDiaryUpdate).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          tagsString: 'watch,mistake',
        }),
      }))
      expect(result.title).toBe('Updated Title')
      expect(result.tags).toEqual(['watch', 'mistake'])
    })
  })

  describe('DELETE /api/diaries/:id', () => {
    it('should delete a diary', async () => {
      mockGetRouterParam.mockReturnValue('3')
      mockDiaryFindFirst.mockResolvedValue({ id: 3n, userId: 1n })
      mockDiaryDelete.mockResolvedValue({ id: 3n })

      const { default: handler } = await import('~/server/api/diaries/[id].delete')

      const result = await handler({
        context: { user: { id: '1' }, requestId: 'req-2' },
      } as any)

      expect(mockDiaryDelete).toHaveBeenCalledWith({ where: { id: 3n } })
      expect(result).toEqual({ success: true })
    })
  })

  describe('Error scenarios', () => {
    it('should return 401 when fetching diaries without auth', async () => {
      const { default: handler } = await import('~/server/api/diaries.get')

      await expect(handler({ context: {} } as any)).rejects.toMatchObject({
        statusCode: 401,
      })
    })

    it('should return 403 when accessing a diary owned by another user', async () => {
      mockGetRouterParam.mockReturnValue('9')
      mockDiaryFindFirst.mockResolvedValue({
        id: 9n,
        userId: 2n,
        transactions: [],
        alerts: [],
      })

      const { default: handler } = await import('~/server/api/diaries/[id].get')

      await expect(handler({ context: { user: { id: '1' } } } as any)).rejects.toMatchObject({
        statusCode: 403,
      })
    })

    it('should return 404 when diary is missing', async () => {
      mockGetRouterParam.mockReturnValue('10')
      mockDiaryFindFirst.mockResolvedValue(null)

      const { default: handler } = await import('~/server/api/diaries/[id].get')

      await expect(handler({ context: { user: { id: '1' } } } as any)).rejects.toMatchObject({
        statusCode: 404,
      })
    })

    it('should return 500 when diaries query fails', async () => {
      mockDiaryFindMany.mockRejectedValueOnce(new Error('DB down'))
      mockDiaryCount.mockResolvedValueOnce(0)

      const { default: handler } = await import('~/server/api/diaries.get')

      await expect(handler({ context: { user: { id: '1' } } } as any)).rejects.toMatchObject({
        statusCode: 500,
      })
    })
  })
})
