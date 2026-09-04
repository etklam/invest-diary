import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mockReadBody, mockGetCookie, mockSetCookie, mockDeleteCookie } from '../vi-setup'
import { sha256Hex } from '~/server/utils/hash'

// Create mock functions
const mockUserFindUnique = vi.fn()
const mockUserCreate = vi.fn()
const mockUserFindMany = vi.fn()
const mockUserUpdate = vi.fn()
const mockUserDelete = vi.fn()
const mockRefreshTokenCreate = vi.fn()
const mockRefreshTokenDeleteMany = vi.fn()
const mockRefreshTokenFindUnique = vi.fn()
const mockRefreshTokenDelete = vi.fn()
const mockRefreshTokenUpdate = vi.fn()
const mockDeleteStoredRefreshToken = vi.fn()
const mockAuthLogInfo = vi.fn()
const mockAuthLogWarn = vi.fn()
const mockAuthLogError = vi.fn()
const mockAuthLog = {
  info: mockAuthLogInfo,
  warn: mockAuthLogWarn,
  error: mockAuthLogError,
}
const mockAuthWithRequestId = vi.fn(() => mockAuthLog)

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
      findUnique: mockRefreshTokenFindUnique,
      delete: mockRefreshTokenDelete,
      update: mockRefreshTokenUpdate,
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

const mockSignAccessToken = vi.fn()
const mockSignRefreshToken = vi.fn()
const mockVerifyToken = vi.fn()

vi.mock('~/lib/jwt', () => ({
  signAccessToken: mockSignAccessToken,
  signRefreshToken: mockSignRefreshToken,
  verifyToken: mockVerifyToken,
  ACCESS_TOKEN_MAX_AGE_SECONDS: 60 * 60,
  REFRESH_TOKEN_MAX_AGE_SECONDS: 60 * 60 * 24 * 30,
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
vi.mock('~/lib/logger', () => ({
  logger: {
    auth: {
      withRequestId: mockAuthWithRequestId,
    },
  },
}))

const mockRateLimitersAuthLoginIp = vi.fn()
const mockRateLimitersAuthLoginIdentity = vi.fn()
const mockRateLimitersAuthRegisterIp = vi.fn()
const mockRateLimitersAuthRegisterIdentity = vi.fn()

vi.mock('~/lib/rate-limiter', () => ({
  rateLimiters: {
    authLoginIp: mockRateLimitersAuthLoginIp,
    authLoginIdentity: mockRateLimitersAuthLoginIdentity,
    authRegisterIp: mockRateLimitersAuthRegisterIp,
    authRegisterIdentity: mockRateLimitersAuthRegisterIdentity,
  },
  getRateLimitIdentifier: vi.fn(() => '127.0.0.1'),
}))
vi.mock('~/server/utils/auth-session', async (importOriginal) => {
  const actual = await importOriginal<typeof import('~/server/utils/auth-session')>()
  return {
    ...actual,
    deleteStoredRefreshToken: mockDeleteStoredRefreshToken,
  }
})

describe('Auth API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuthWithRequestId.mockReturnValue(mockAuthLog)
    mockSignAccessToken.mockResolvedValue('mock-access-token')
    mockSignRefreshToken.mockResolvedValue('mock-refresh-token')
    mockRefreshTokenCreate.mockResolvedValue({ id: 1n })
    mockRefreshTokenFindUnique.mockResolvedValue(null)
    mockRefreshTokenDelete.mockResolvedValue({ id: 1n })
    mockRefreshTokenUpdate.mockResolvedValue({ id: 1n })
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
        expectedProfit: '1000.00',
        expectedAvgHolding: '5.00',
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
      expect(mockRefreshTokenCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          token: sha256Hex('mock-refresh-token'),
        }),
      })
      expect(mockRateLimitersAuthLoginIp).toHaveBeenCalledWith('127.0.0.1')
      expect(mockRateLimitersAuthLoginIdentity).toHaveBeenCalledWith('test@example.com')
    })

    it('keeps the login cookie session authenticated across a hard refresh request', async () => {
      const mockUser = {
        id: 1n,
        email: 'hard-refresh@example.com',
        password: 'hashed-password',
        name: 'Hard Refresh User',
        role: 'USER',
        tokenVersion: 0,
        expectedMonthlyTrades: 10,
        expectedProfit: 1000,
        expectedAvgHolding: 5,
        timezone: 'Asia/Taipei',
      }
      const browserCookies: Record<string, string> = {}

      mockUserFindUnique.mockResolvedValue(mockUser)
      mockBcryptCompare.mockResolvedValue(true)
      mockReadBody.mockResolvedValue({
        email: mockUser.email,
        password: 'correctPassword',
      })
      mockSignAccessToken.mockResolvedValue('login-access-token')
      mockSignRefreshToken.mockResolvedValue('login-refresh-token')
      mockSetCookie.mockImplementation((_event, name: string, value: string) => {
        browserCookies[name] = value
      })

      const { default: login } = await import('~/server/api/auth/login.post')
      await login({ context: {} } as any)

      expect(browserCookies).toEqual({
        'access-token': 'login-access-token',
        'refresh-token': 'login-refresh-token',
      })

      mockGetCookie.mockImplementation((_event, name: string) => browserCookies[name] ?? null)
      mockVerifyToken.mockResolvedValue({
        userId: '1',
        email: mockUser.email,
        role: mockUser.role,
        tokenVersion: 0,
        type: 'access',
      })
      ;(global.getRequestURL as any).mockReturnValue({ pathname: '/api/auth/me' })

      const { default: authMiddleware } = await import('~/server/middleware/auth')
      const hardRefreshRequest = { context: {} } as any
      await authMiddleware(hardRefreshRequest)

      expect(hardRefreshRequest.context.user).toEqual({
        id: '1',
        email: mockUser.email,
        role: mockUser.role,
      })
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

    it('rate limits login by IP', async () => {
      mockRateLimitersAuthLoginIp.mockRejectedValueOnce(new Error('rate limited'))

      const { default: handler } = await import('~/server/api/auth/login.post')
      const mockEvent = { context: {} } as any

      await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 429 })
      expect(mockRateLimitersAuthLoginIdentity).not.toHaveBeenCalled()
      expect(mockAuthLogWarn).toHaveBeenCalledWith(
        'Login rate limited',
        expect.objectContaining({ ip: '127.0.0.1' })
      )
    })

    it('rate limits login by identity', async () => {
      mockReadBody.mockResolvedValue({
        email: 'test@example.com',
        password: 'password123',
      })
      mockRateLimitersAuthLoginIdentity.mockRejectedValueOnce(new Error('rate limited'))

      const { default: handler } = await import('~/server/api/auth/login.post')
      const mockEvent = { context: {} } as any

      await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 429 })
      expect(mockRateLimitersAuthLoginIp).toHaveBeenCalledWith('127.0.0.1')
      expect(mockAuthLogWarn).toHaveBeenCalledWith(
        'Login rate limited',
        expect.objectContaining({ email: 'test@example.com' })
      )
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
        user: { ...mockUser, id: '1' },
      })
      expect(mockRateLimitersAuthRegisterIp).toHaveBeenCalledWith('127.0.0.1')
      expect(mockRateLimitersAuthRegisterIdentity).toHaveBeenCalledWith('newuser@example.com')
    })

    it('rate limits registration by IP', async () => {
      mockRateLimitersAuthRegisterIp.mockRejectedValueOnce(new Error('rate limited'))

      const { default: handler } = await import('~/server/api/auth/register.post')
      const mockEvent = { context: {} } as any

      await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 429 })
      expect(mockRateLimitersAuthRegisterIdentity).not.toHaveBeenCalled()
      expect(mockAuthLogWarn).toHaveBeenCalledWith(
        'Registration rate limited',
        expect.objectContaining({ ip: '127.0.0.1' })
      )
    })

    it('rate limits registration by identity', async () => {
      mockReadBody.mockResolvedValue({
        email: 'newuser@example.com',
        password: 'password123',
        name: 'New User',
      })
      mockRateLimitersAuthRegisterIdentity.mockRejectedValueOnce(new Error('rate limited'))

      const { default: handler } = await import('~/server/api/auth/register.post')
      const mockEvent = { context: {} } as any

      await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 429 })
      expect(mockRateLimitersAuthRegisterIp).toHaveBeenCalledWith('127.0.0.1')
      expect(mockAuthLogWarn).toHaveBeenCalledWith(
        'Registration rate limited',
        expect.objectContaining({ email: 'newuser@example.com' })
      )
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

    it('maps a concurrent duplicate-email registration (P2002) to 409 instead of 500', async () => {
      // Pre-check passes (no user yet), but another request wins the insert
      // race — the unique constraint error must surface as the same 409.
      mockUserFindUnique.mockResolvedValue(null)
      mockBcryptHash.mockResolvedValue('hashed-password')
      mockUserCreate.mockRejectedValue({
        code: 'P2002',
        meta: { target: ['email'] },
      })

      mockReadBody.mockResolvedValue({
        email: 'race@example.com',
        password: 'password123',
        name: 'Race User',
      })

      const { default: handler } = await import('~/server/api/auth/register.post')
      const mockEvent = { context: {} } as any

      await expect(handler(mockEvent)).rejects.toMatchObject({
        statusCode: 409,
        statusMessage: 'Email race@example.com already registered',
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
    it('should clear auth cookies including legacy auth-token', async () => {
      const { default: handler } = await import('~/server/api/auth/logout.post')
      const mockEvent = { context: {} } as any

      const result = await handler(mockEvent)

      expect(mockDeleteCookie).toHaveBeenCalledWith(mockEvent, 'access-token', { path: '/' })
      expect(mockDeleteCookie).toHaveBeenCalledWith(mockEvent, 'refresh-token', { path: '/' })
      expect(mockDeleteCookie).toHaveBeenCalledWith(mockEvent, 'auth-token')
      expect(mockDeleteCookie).toHaveBeenCalledWith(mockEvent, 'auth-token', { path: '/' })
      expect(result).toEqual({ ok: true })
    })
    it('should log refresh token delete failures', async () => {
      mockGetCookie.mockReturnValue('refresh-token')
      mockDeleteStoredRefreshToken.mockRejectedValue(new Error('database unavailable'))

      const { default: handler } = await import('~/server/api/auth/logout.post')
      const mockEvent = {
        context: {
          user: { id: '1' },
          requestId: 'req-logout-error',
        },
      } as any

      const result = await handler(mockEvent)

      expect(result).toEqual({ ok: true })
      expect(mockAuthWithRequestId).toHaveBeenCalledWith('req-logout-error')
      expect(mockAuthLogError).toHaveBeenCalledWith(
        'Error deleting refresh token',
        expect.objectContaining({
          userId: '1',
          error: expect.stringContaining('database unavailable'),
        })
      )
    })
  })

  describe('GET /api/auth/me', () => {
    it('should return current user when authenticated', async () => {
      const mockUser = {
        id: 1n,
        email: 'test@example.com',
        name: 'Test User',
        role: 'USER',
        expectedMonthlyTrades: 10,
        expectedProfit: '1000.00',
        expectedAvgHolding: '5.00',
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

  describe('POST /api/auth/refresh', () => {
    it('should refresh access token without rotating refresh token', async () => {
      mockGetCookie.mockReturnValue('valid-refresh-token')
      mockVerifyToken.mockResolvedValue({
        userId: '1',
        email: 'test@example.com',
        role: 'USER',
        tokenVersion: 0,
        type: 'refresh',
      })
      mockRefreshTokenFindUnique.mockResolvedValue({
        token: sha256Hex('valid-refresh-token'),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        revokedAt: null,
        clientType: 'WEB',
        familyId: 'web-family-1',
        user: {
          id: 1n,
          email: 'test@example.com',
          role: 'USER',
          tokenVersion: 0,
        },
      })
      mockSignAccessToken.mockResolvedValue('new-access-token')

      const { default: handler } = await import('~/server/api/auth/refresh.post')
      const mockEvent = { context: { requestId: 'req-refresh-1' } } as any

      const result = await handler(mockEvent)

      expect(result).toEqual({ ok: true })
      expect(mockSignAccessToken).toHaveBeenCalled()
      expect(mockSignRefreshToken).not.toHaveBeenCalled()
      expect(mockRefreshTokenDelete).not.toHaveBeenCalled()
      expect(mockRefreshTokenCreate).not.toHaveBeenCalled()
      expect(mockSetCookie).toHaveBeenCalledTimes(1)
      expect(mockSetCookie).toHaveBeenCalledWith(
        mockEvent,
        'access-token',
        'new-access-token',
        expect.objectContaining({ maxAge: 60 * 60 })
      )
    })

    it('does not restore a browser session after logout revokes its refresh token', async () => {
      const { default: logout } = await import('~/server/api/auth/logout.post')
      mockGetCookie.mockReturnValueOnce('logout-refresh-token')

      await logout({
        context: {
          auth: { transport: 'cookie' },
          user: { id: '1', email: 'test@example.com', role: 'USER' },
        },
      } as any)

      expect(mockDeleteStoredRefreshToken).toHaveBeenCalledWith('logout-refresh-token', 1n)

      mockGetCookie.mockReturnValueOnce('logout-refresh-token')
      mockVerifyToken.mockResolvedValueOnce({
        userId: '1',
        email: 'test@example.com',
        role: 'USER',
        tokenVersion: 0,
        type: 'refresh',
      })
      // The row removed by logout is no longer available to refresh.
      mockRefreshTokenFindUnique.mockResolvedValueOnce(null)

      const { default: refresh } = await import('~/server/api/auth/refresh.post')
      await expect(refresh({ context: {} } as any)).rejects.toMatchObject({ statusCode: 401 })
      expect(mockSetCookie).not.toHaveBeenCalled()
    })
  })
})
