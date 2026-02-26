import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mockReadBody, mockGetCookie, mockSetCookie, mockDeleteCookie } from '../vi-setup'

// Create mock functions
const mockUserFindUnique = vi.fn()
const mockUserCreate = vi.fn()
const mockUserFindMany = vi.fn()
const mockUserUpdate = vi.fn()
const mockUserDelete = vi.fn()
const mockRefreshTokenCreate = vi.fn()
const mockRefreshTokenDeleteMany = vi.fn()

// Mock modules
vi.mock('~/lib/prisma', () => ({
  default: {
    user: {
      findUnique: mockUserFindUnique,
      create: mockUserCreate,
      findMany: mockUserFindMany,
      update: mockUserUpdate,
      delete: mockUserDelete,
    },
    refreshToken: {
      create: mockRefreshTokenCreate,
      deleteMany: mockRefreshTokenDeleteMany,
    },
    $connect: vi.fn(),
    $disconnect: vi.fn(),
  },
}))

const mockBcryptCompare = vi.fn()
const mockBcryptHash = vi.fn()

vi.mock('bcryptjs', () => ({
  default: {
    compare: mockBcryptCompare,
    hash: mockBcryptHash,
  },
}))

const mockSignToken = vi.fn()
const mockSignAccessToken = vi.fn()
const mockSignRefreshToken = vi.fn()
const mockVerifyToken = vi.fn()

vi.mock('~/lib/jwt', () => ({
  signToken: mockSignToken,
  signAccessToken: mockSignAccessToken,
  signRefreshToken: mockSignRefreshToken,
  verifyToken: mockVerifyToken,
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

describe('Auth API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSignToken.mockResolvedValue('mock-jwt-token')
    mockSignAccessToken.mockResolvedValue('mock-access-token')
    mockSignRefreshToken.mockResolvedValue('mock-refresh-token')
    mockRefreshTokenCreate.mockResolvedValue({ id: 1n })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const mockUser = {
        id: 1n,
        email: 'test@example.com',
        password: 'hashed-password',
        name: 'Test User',
        role: 'USER',
        expectedMonthlyTrades: 10,
        expectedProfit: 1000,
        expectedAvgHolding: 5,
      }

      mockUserFindUnique.mockResolvedValue(mockUser)
      mockBcryptCompare.mockResolvedValue(true)

      mockReadBody.mockResolvedValue({
        email: 'test@example.com',
        password: 'password123',
      })

      const { default: handler } = await import('~/server/api/auth/login.post')
      const mockEvent = { context: {} } as any

      const result = await handler(mockEvent)

      expect(result).toMatchObject({
        ok: true,
        data: {
          id: mockUser.id.toString(),
          email: mockUser.email,
          name: mockUser.name,
          role: mockUser.role,
          expectedMonthlyTrades: mockUser.expectedMonthlyTrades,
          expectedProfit: mockUser.expectedProfit,
          expectedAvgHolding: mockUser.expectedAvgHolding,
        },
      })
      expect(mockSetCookie).toHaveBeenCalledTimes(2)
    })

    it('should reject invalid email format', async () => {
      mockReadBody.mockResolvedValue({
        email: 'invalid-email',
        password: 'password123',
      })

      const { default: handler } = await import('~/server/api/auth/login.post')
      const mockEvent = { context: {} } as any

      await expect(handler(mockEvent)).rejects.toThrow()
    })

    it('should reject missing password', async () => {
      mockReadBody.mockResolvedValue({
        email: 'test@example.com',
        password: '',
      })

      const { default: handler } = await import('~/server/api/auth/login.post')
      const mockEvent = { context: {} } as any

      await expect(handler(mockEvent)).rejects.toThrow()
    })

    it('should reject non-existent user', async () => {
      mockUserFindUnique.mockResolvedValue(null)

      mockReadBody.mockResolvedValue({
        email: 'nonexistent@example.com',
        password: 'password123',
      })

      const { default: handler } = await import('~/server/api/auth/login.post')
      const mockEvent = { context: {} } as any

      await expect(handler(mockEvent)).rejects.toMatchObject({
        statusCode: 401,
      })
    })

    it('should reject wrong password', async () => {
      const mockUser = {
        id: 1n,
        email: 'test@example.com',
        password: 'hashed-password',
        name: 'Test User',
        role: 'USER',
      }

      mockUserFindUnique.mockResolvedValue(mockUser)
      mockBcryptCompare.mockResolvedValue(false)

      mockReadBody.mockResolvedValue({
        email: 'test@example.com',
        password: 'wrong-password',
      })

      const { default: handler } = await import('~/server/api/auth/login.post')
      const mockEvent = { context: {} } as any

      await expect(handler(mockEvent)).rejects.toMatchObject({
        statusCode: 401,
      })
    })
  })

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const mockUser = {
        id: 1n,
        email: 'newuser@example.com',
        name: 'New User',
        role: 'USER',
      }

      mockUserFindUnique.mockResolvedValue(null)
      mockBcryptHash.mockResolvedValue('hashed-password')
      mockUserCreate.mockResolvedValue(mockUser)

      mockReadBody.mockResolvedValue({
        email: 'newuser@example.com',
        password: 'password123',
        name: 'New User',
      })

      const { default: handler } = await import('~/server/api/auth/register.post')
      const mockEvent = { context: {} } as any

      const result = await handler(mockEvent)

      expect(result).toEqual({
        success: true,
        user: mockUser,
      })
    })

    it('should reject duplicate email', async () => {
      const existingUser = {
        id: 1n,
        email: 'existing@example.com',
        name: 'Existing User',
      }

      mockUserFindUnique.mockResolvedValue(existingUser)

      mockReadBody.mockResolvedValue({
        email: 'existing@example.com',
        password: 'password123',
        name: 'Another User',
      })

      const { default: handler } = await import('~/server/api/auth/register.post')
      const mockEvent = { context: {} } as any

      await expect(handler(mockEvent)).rejects.toMatchObject({
        statusCode: 409,
      })
    })

    it('should reject invalid email format', async () => {
      mockReadBody.mockResolvedValue({
        email: 'invalid-email',
        password: 'password123',
        name: 'Test User',
      })

      const { default: handler } = await import('~/server/api/auth/register.post')
      const mockEvent = { context: {} } as any

      await expect(handler(mockEvent)).rejects.toThrow()
    })

    it('should reject short password', async () => {
      mockReadBody.mockResolvedValue({
        email: 'test@example.com',
        password: '123',
        name: 'Test User',
      })

      const { default: handler } = await import('~/server/api/auth/register.post')
      const mockEvent = { context: {} } as any

      await expect(handler(mockEvent)).rejects.toThrow()
    })
  })

  describe('POST /api/auth/logout', () => {
    it('should clear auth cookies', async () => {
      const { default: handler } = await import('~/server/api/auth/logout.post')
      const mockEvent = { context: {} } as any

      const result = await handler(mockEvent)

      // Should clear access-token and refresh-token cookies
      expect(mockDeleteCookie).toHaveBeenCalledWith(mockEvent, 'access-token', { path: '/' })
      expect(mockDeleteCookie).toHaveBeenCalledWith(mockEvent, 'refresh-token', { path: '/' })
      expect(result).toEqual({ ok: true })
    })
  })

  describe('GET /api/auth/me', () => {
    it('should return current user when authenticated', async () => {
      const mockUser = {
        id: 1n,
        email: 'test@example.com',
        name: 'Test User',
        role: 'USER',
        password: 'hashed-password',
        tokenVersion: 3,
        expectedMonthlyTrades: 10,
        expectedProfit: 1000,
        expectedAvgHolding: 5,
        timezone: 'Asia/Taipei',
        favoriteTagsString: 'etf,swing',
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-02'),
      }

      mockUserFindUnique.mockResolvedValue(mockUser)
      mockVerifyToken.mockResolvedValue({
        userId: '1',
        email: 'test@example.com',
        role: 'USER',
      })

      mockGetCookie.mockReturnValue('valid-token')

      const { default: handler } = await import('~/server/api/auth/me.get')
      const mockEvent = {
        context: {
          user: { id: '1', email: 'test@example.com', role: 'USER' },
        },
      } as any

      const result = await handler(mockEvent)

      expect(result).toMatchObject({
        ok: true,
        data: {
          id: '1',
          email: 'test@example.com',
          role: 'USER',
          timezone: 'Asia/Taipei',
        },
      })
      expect((result as any).data.password).toBeUndefined()
      expect((result as any).data.tokenVersion).toBeUndefined()
      expect(mockUserFindUnique).toHaveBeenCalledWith({
        where: { id: 1n },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          expectedMonthlyTrades: true,
          expectedProfit: true,
          expectedAvgHolding: true,
          timezone: true,
          favoriteTagsString: true,
          createdAt: true,
          updatedAt: true,
        },
      })
    })

    it('should return null when not authenticated', async () => {
      mockGetCookie.mockReturnValue(null)

      const { default: handler } = await import('~/server/api/auth/me.get')
      const mockEvent = { context: {} } as any

      await expect(handler(mockEvent)).rejects.toMatchObject({
        statusCode: 401,
      })
    })
  })
})
