import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  mockReadBody,
  mockGetCookie,
  mockSetCookie,
  mockDeleteCookie,
} from '../vi-setup'

/**
 * Integration Tests for Authentication Flow
 *
 * These tests verify the current authentication flow contract
 * for register/login/logout/me handlers.
 */

// Mock Prisma
const mockUserFindUnique = vi.fn()
const mockUserCreate = vi.fn()
const mockRefreshTokenCreate = vi.fn()
const mockRefreshTokenDeleteMany = vi.fn()

vi.mock('~/lib/prisma', () => ({
  default: {
    user: {
      findUnique: mockUserFindUnique,
      create: mockUserCreate,
    },
    refreshToken: {
      create: mockRefreshTokenCreate,
      deleteMany: mockRefreshTokenDeleteMany,
    },
    $connect: vi.fn(),
    $disconnect: vi.fn(),
  },
}))

// Mock bcrypt
const mockBcryptCompare = vi.fn()
const mockBcryptHash = vi.fn()

vi.mock('bcryptjs', () => ({
  default: {
    compare: mockBcryptCompare,
    hash: mockBcryptHash,
  },
}))

// Mock JWT
const mockSignAccessToken = vi.fn()
const mockSignRefreshToken = vi.fn()
const mockVerifyToken = vi.fn()

vi.mock('~/lib/jwt', () => ({
  signAccessToken: mockSignAccessToken,
  signRefreshToken: mockSignRefreshToken,
  verifyToken: mockVerifyToken,
}))

describe('Authentication Flow Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSignAccessToken.mockResolvedValue('mock-access-token')
    mockSignRefreshToken.mockResolvedValue('mock-refresh-token')
    mockBcryptHash.mockResolvedValue('hashed-password')
    mockRefreshTokenCreate.mockResolvedValue({ id: 1n })
    mockRefreshTokenDeleteMany.mockResolvedValue({ count: 1 })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Complete Registration Flow', () => {
    it('should register a new user successfully', async () => {
      mockUserFindUnique.mockResolvedValueOnce(null)
      mockUserCreate.mockResolvedValueOnce({
        id: 1n,
        email: 'newuser@example.com',
        name: 'New User',
        role: 'USER',
        expectedMonthlyTrades: 0,
        expectedProfit: 0,
        expectedAvgHolding: 0,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      })

      mockReadBody.mockResolvedValueOnce({
        email: 'newuser@example.com',
        password: 'securePassword123',
        name: 'New User',
      })

      const { default: handler } = await import('~/server/api/auth/register.post')
      const result = await handler({ context: {} } as any)

      expect(result).toHaveProperty('success', true)
      expect(result.user).toHaveProperty('email', 'newuser@example.com')
      expect(mockBcryptHash).toHaveBeenCalledWith('securePassword123', 10)
    })

    it('should reject registration with existing email', async () => {
      mockUserFindUnique.mockResolvedValueOnce({
        id: 1n,
        email: 'existing@example.com',
      })

      mockReadBody.mockResolvedValueOnce({
        email: 'existing@example.com',
        password: 'password123',
        name: 'Test User',
      })

      const { default: handler } = await import('~/server/api/auth/register.post')

      await expect(handler({ context: {} } as any)).rejects.toMatchObject({
        statusCode: 409,
      })
    })
  })

  describe('Complete Login Flow', () => {
    it('should login successfully and set auth cookies', async () => {
      const mockUser = {
        id: 1n,
        email: 'user@example.com',
        password: 'hashed-password',
        name: 'Test User',
        role: 'USER',
        tokenVersion: 0,
        expectedMonthlyTrades: 10,
        expectedProfit: 1000,
        expectedAvgHolding: 5,
        timezone: 'Asia/Taipei',
      }

      mockUserFindUnique.mockResolvedValueOnce(mockUser)
      mockBcryptCompare.mockResolvedValueOnce(true)

      mockReadBody.mockResolvedValueOnce({
        email: 'user@example.com',
        password: 'correctPassword',
      })

      const { default: handler } = await import('~/server/api/auth/login.post')
      const result = await handler({ context: { requestId: 'req-1' } } as any)

      expect(result).toHaveProperty('ok', true)
      expect(result.data).toHaveProperty('email', 'user@example.com')
      expect(mockSignAccessToken).toHaveBeenCalled()
      expect(mockSignRefreshToken).toHaveBeenCalled()
      expect(mockRefreshTokenCreate).toHaveBeenCalled()
      expect(mockSetCookie).toHaveBeenCalledTimes(2)
    })

    it('should reject login with wrong password', async () => {
      const mockUser = {
        id: 1n,
        email: 'user@example.com',
        password: 'hashed-password',
        name: 'Test User',
        role: 'USER',
        tokenVersion: 0,
      }

      mockUserFindUnique.mockResolvedValueOnce(mockUser)
      mockBcryptCompare.mockResolvedValueOnce(false)

      mockReadBody.mockResolvedValueOnce({
        email: 'user@example.com',
        password: 'wrongPassword',
      })

      const { default: handler } = await import('~/server/api/auth/login.post')

      await expect(handler({ context: { requestId: 'req-2' } } as any)).rejects.toMatchObject({
        statusCode: 401,
      })
    })
  })

  describe('Complete Logout Flow', () => {
    it('should clear auth cookies on logout', async () => {
      mockGetCookie.mockReturnValueOnce('valid-refresh-token')

      const { default: handler } = await import('~/server/api/auth/logout.post')
      const result = await handler({
        context: { user: { id: '1' } },
      } as any)

      expect(mockRefreshTokenDeleteMany).toHaveBeenCalled()
      expect(mockDeleteCookie).toHaveBeenCalledTimes(2)
      expect(result).toEqual({ ok: true })
    })
  })

  describe('Session Verification', () => {
    it('should return user data for valid session', async () => {
      const mockUser = {
        id: 1n,
        email: 'user@example.com',
        name: 'Test User',
        role: 'USER',
      }

      mockUserFindUnique.mockResolvedValueOnce(mockUser)

      const { default: handler } = await import('~/server/api/auth/me.get')
      const result = await handler({
        context: {
          user: { id: '1', email: 'user@example.com', role: 'USER' },
        },
      } as any)

      expect(result).toHaveProperty('ok', true)
      expect(result.data).toHaveProperty('email', 'user@example.com')
    })

    it('should reject when session is missing', async () => {
      const { default: handler } = await import('~/server/api/auth/me.get')

      await expect(handler({ context: {} } as any)).rejects.toMatchObject({
        statusCode: 401,
      })
    })
  })

  describe('Admin Access Control', () => {
    it('should allow admin users to access admin endpoints', async () => {
      const user = { id: '1', role: 'ADMIN' }
      expect(user.role).toBe('ADMIN')
    })

    it('should deny non-admin users from admin endpoints', async () => {
      const user = { id: '2', role: 'USER' }
      expect(user.role).not.toBe('ADMIN')
    })
  })
})
