import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mockReadBody, mockGetQuery, mockGetRouterParam } from '../vi-setup'

/**
 * Integration Tests for Diary Workflow
 *
 * These tests verify the complete flow of diary operations
 * from API calls to data persistence.
 */

// Mock Prisma
const mockDiaryFindMany = vi.fn()
const mockDiaryFindUnique = vi.fn()
const mockDiaryFindFirst = vi.fn()
const mockDiaryCreate = vi.fn()
const mockDiaryUpdate = vi.fn()
const mockDiaryDelete = vi.fn()
const mockDiaryCount = vi.fn()
const mockTransactionFindMany = vi.fn()
const mockTransactionDeleteMany = vi.fn()
const mockAlertDeleteMany = vi.fn()
const mockPrismaTransaction = vi.fn(async (callback: any) => callback({
  transaction: { deleteMany: mockTransactionDeleteMany },
  alert: { deleteMany: mockAlertDeleteMany },
  diary: { update: mockDiaryUpdate },
  user: { findUnique: vi.fn().mockResolvedValue({ timezone: 'Asia/Taipei' }) },
}))

vi.mock('~/lib/prisma', () => ({
  default: {
    diary: {
      findMany: mockDiaryFindMany,
      findUnique: mockDiaryFindUnique,
      findFirst: mockDiaryFindFirst,
      count: mockDiaryCount,
      create: mockDiaryCreate,
      update: mockDiaryUpdate,
      delete: mockDiaryDelete,
    },
    transaction: {
      create: vi.fn(),
      findMany: mockTransactionFindMany,
    },
    $transaction: mockPrismaTransaction,
    $connect: vi.fn(),
    $disconnect: vi.fn(),
  },
}))

vi.mock('h3', () => ({
  createError: (params: { statusCode: number; statusMessage: string }) => {
    const error = new Error(params.statusMessage)
    ;(error as any).statusCode = params.statusCode
    ;(error as any).statusMessage = params.statusMessage
    return error
  },
  defineEventHandler: (handler: Function) => handler,
}))

describe('Diary Workflow Integration', () => {
  const mockUser = { id: '1', email: 'test@example.com', role: 'USER' }

  beforeEach(() => {
    vi.clearAllMocks()
    mockTransactionFindMany.mockResolvedValue([])
    mockGetQuery.mockReturnValue({})
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Complete Diary CRUD Flow', () => {
    it('should create, read, update, and delete a diary entry', async () => {
      const userId = 1n
      const mockDiary = {
        id: 1n,
        title: 'Test Diary',
        content: 'Test diary entry',
        tagsString: null,
        date: new Date(),
        userId,
        createdAt: new Date(),
        updatedAt: new Date(),
        alerts: [],
        transactions: [],
      }

      // Create
      mockDiaryCreate.mockResolvedValueOnce(mockDiary)
      mockReadBody.mockResolvedValueOnce({
        title: 'Test Diary',
        content: 'Test diary entry',
        mood: 'HAPPY',
      })

      const { default: createHandler } = await import('~/server/api/diaries.post')
      await createHandler({
        context: { user: mockUser },
      } as any)

      expect(mockDiaryCreate).toHaveBeenCalled()

      // Read
      mockDiaryFindUnique.mockResolvedValueOnce(mockDiary)
      mockDiaryFindMany.mockResolvedValueOnce([mockDiary])
      mockDiaryCount.mockResolvedValueOnce(1)

      const { default: listHandler } = await import('~/server/api/diaries.get')
      await listHandler({
        context: { user: mockUser },
      } as any)

      expect(mockDiaryFindMany).toHaveBeenCalled()

      // Update
      const updatedDiary = { ...mockDiary, content: 'Updated content' }
      mockDiaryFindFirst.mockResolvedValueOnce(mockDiary)
      mockDiaryUpdate.mockResolvedValueOnce(updatedDiary)
      mockReadBody.mockResolvedValueOnce({
        title: 'Updated Title',
        content: 'Updated content',
      })

      const { default: updateHandler } = await import('~/server/api/diaries/[id].put')
      mockGetRouterParam.mockReturnValueOnce('1')
      await updateHandler({
        context: {
          user: { id: userId.toString() },
          params: { id: '1' },
        },
      } as any)

      expect(mockDiaryUpdate).toHaveBeenCalled()

      // Delete
      mockDiaryFindFirst.mockResolvedValueOnce(mockDiary)
      mockDiaryDelete.mockResolvedValueOnce({ id: 1n })

      const { default: deleteHandler } = await import('~/server/api/diaries/[id].delete')
      mockGetRouterParam.mockReturnValueOnce('1')
      await deleteHandler({
        context: {
          user: mockUser,
          params: { id: '1' },
        },
      } as any)

      expect(mockDiaryDelete).toHaveBeenCalled()
    })
  })

  describe('Diary with Transactions', () => {
    it('should create diary with associated transactions', async () => {
      const mockDiaryWithTransactions = {
        id: 1n,
        content: 'Trading day',
        mood: 'NEUTRAL',
        userId: 1n,
        createdAt: new Date(),
        updatedAt: new Date(),
        transactions: [
          {
            id: 1n,
            symbol: '2330.TW',
            type: 'BUY',
            quantity: 10,
            price: 500,
            diaryId: 1n,
          },
        ],
      }

      mockDiaryCreate.mockResolvedValueOnce(mockDiaryWithTransactions)
      mockReadBody.mockResolvedValueOnce({
        title: 'Trading Diary',
        content: 'Trading day',
        mood: 'NEUTRAL',
        transactions: [
          { symbol: '2330.TW', type: 'BUY', quantity: 10, price: 500 },
        ],
      })

      const { default: handler } = await import('~/server/api/diaries.post')
      await handler({
        context: { user: mockUser },
      } as any)

      expect(mockDiaryCreate).toHaveBeenCalled()
    })

    it('should reject invalid sell transactions without holdings', async () => {
      mockReadBody.mockResolvedValueOnce({
        title: 'Trading Diary',
        content: 'Trading day',
        transactions: [
          { symbol: '2330.TW', type: 'SELL', quantity: 5, price: 500 },
        ],
      })

      const { default: handler } = await import('~/server/api/diaries.post')

      await expect(handler({
        context: { user: mockUser },
      } as any)).rejects.toMatchObject({
        statusCode: 400,
        statusMessage: 'Validation failed',
      })

      expect(mockDiaryCreate).not.toHaveBeenCalled()
    })
  })

  describe('Validation errors', () => {
    it('should reject missing title with validation error', async () => {
      mockReadBody.mockResolvedValueOnce({
        content: 'Missing title',
      })

      const { default: handler } = await import('~/server/api/diaries.post')

      await expect(handler({
        context: { user: mockUser },
      } as any)).rejects.toMatchObject({
        statusCode: 400,
        statusMessage: 'Validation failed',
      })
    })

    it('should reject invalid diary id for update', async () => {
      mockReadBody.mockResolvedValueOnce({
        title: 'Updated Title',
        content: 'Updated content',
      })
      mockGetRouterParam.mockReturnValueOnce('abc')

      const { default: handler } = await import('~/server/api/diaries/[id].put')

      await expect(handler({
        context: {
          user: { id: '1' },
          params: { id: 'abc' },
        },
      } as any)).rejects.toMatchObject({
        statusCode: 400,
        statusMessage: 'Validation failed',
      })

      expect(mockDiaryFindFirst).not.toHaveBeenCalled()
    })
  })

  describe('Date-based Queries', () => {
    it('should fetch diary by date', async () => {
      const mockDiary = {
        id: 1n,
        content: 'Today entry',
        mood: 'HAPPY',
        userId: 1n,
        createdAt: new Date('2024-01-15'),
      }

      mockDiaryFindFirst.mockResolvedValueOnce(mockDiary)
      mockGetQuery.mockReturnValueOnce({ date: '2024-01-15' })

      const { default: handler } = await import('~/server/api/diaries/by-date.get')
      await handler({
        context: { user: mockUser },
      } as any)

      expect(mockDiaryFindFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.any(Object),
        })
      )
    })
  })

  describe('Authorization', () => {
    it('should reject unauthenticated requests', async () => {
      const { default: handler } = await import('~/server/api/diaries.get')
      
      await expect(handler({
        context: {},
      } as any)).rejects.toMatchObject({
        statusCode: 401,
      })
    })

    it('should only allow users to access their own diaries', async () => {
      // SQL-level ownership filter: findFirst({ where: { id, userId } }) returns
      // null for someone else's diary. Caller sees the same 404 as a missing
      // diary, so resource existence cannot be enumerated.
      mockDiaryFindFirst.mockResolvedValueOnce(null)

      const { default: handler } = await import('~/server/api/diaries/[id].get')

      await expect(handler({
        context: {
          user: mockUser,
          params: { id: '1' },
        },
      } as any)).rejects.toMatchObject({
        statusCode: 404,
      })
    })
  })
})
