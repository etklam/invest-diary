import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mockReadBody, mockDeleteCookie } from '../vi-setup'

const mockAuthLogInfo = vi.fn()
const mockAuthLogWarn = vi.fn()
const mockAuthLogError = vi.fn()
const mockAuthLog = {
  info: mockAuthLogInfo,
  warn: mockAuthLogWarn,
  error: mockAuthLogError,
}
const mockAuthWithRequestId = vi.fn(() => mockAuthLog)
const mockRateLimitersAuthPasswordIp = vi.fn()
const mockRateLimitersAuthPasswordIdentity = vi.fn()

vi.mock('~/lib/logger', () => ({
  logger: {
    auth: {
      withRequestId: mockAuthWithRequestId,
    },
  },
}))

vi.mock('~/lib/rate-limiter', () => ({
  rateLimiters: {
    authPasswordIp: mockRateLimitersAuthPasswordIp,
    authPasswordIdentity: mockRateLimitersAuthPasswordIdentity,
  },
  getRateLimitIdentifier: vi.fn(() => '127.0.0.1'),
}))

const mockUserFindUnique = vi.fn()
const mockUserUpdate = vi.fn()
const mockRefreshTokenDeleteMany = vi.fn()
const mockTransaction = vi.fn()
const mockBcryptCompare = vi.fn()
const mockBcryptHash = vi.fn()
const mockRevokeUser = vi.fn()

vi.mock('~/server/websocket/connectionManager', () => ({
  connectionManager: { revokeUser: mockRevokeUser },
}))

vi.mock('~/lib/prisma', () => ({
  default: {
    user: {
      findUnique: mockUserFindUnique,
      update: mockUserUpdate,
    },
    refreshToken: {
      deleteMany: mockRefreshTokenDeleteMany,
    },
    $transaction: mockTransaction,
  },
}))

vi.mock('bcryptjs', () => ({
  default: {
    compare: mockBcryptCompare,
    hash: mockBcryptHash,
  },
}))

describe('User Password API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockTransaction.mockImplementation(async (actions: Promise<unknown>[]) => Promise.all(actions))
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should change password and revoke all tokens', async () => {
    mockReadBody.mockResolvedValue({
      currentPassword: 'old-password',
      newPassword: 'new-password-123',
    })
    mockUserFindUnique.mockResolvedValue({ id: 1n, password: 'hashed-old' })
    mockBcryptCompare.mockResolvedValue(true)
    mockBcryptHash.mockResolvedValue('hashed-new')
    mockUserUpdate.mockResolvedValue({ id: 1n })
    mockRefreshTokenDeleteMany.mockResolvedValue({ count: 3 })

    const { default: handler } = await import('~/server/api/user/password.put')
    const event = {
      context: { user: { id: '1' } },
    } as any

    const result = await handler(event)

    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: 1n },
      data: {
        password: 'hashed-new',
        tokenVersion: { increment: 1 },
      },
      select: { tokenVersion: true },
    })
    expect(mockRefreshTokenDeleteMany).toHaveBeenCalledWith({
      where: { userId: 1n },
    })
    expect(mockDeleteCookie).toHaveBeenCalledWith(event, 'access-token', { path: '/' })
    expect(mockDeleteCookie).toHaveBeenCalledWith(event, 'refresh-token', { path: '/' })
    expect(mockDeleteCookie).toHaveBeenCalledWith(event, 'auth-token')
    expect(mockDeleteCookie).toHaveBeenCalledWith(event, 'auth-token', { path: '/' })
    expect(result).toEqual({
      success: true,
      message: 'Password changed successfully. Please login again.',
    })
    expect(mockRateLimitersAuthPasswordIp).toHaveBeenCalledWith('127.0.0.1')
    expect(mockRateLimitersAuthPasswordIdentity).toHaveBeenCalledWith('1')
  })

  it('rate limits password change by IP', async () => {
    mockRateLimitersAuthPasswordIp.mockRejectedValueOnce(new Error('rate limited'))

    const { default: handler } = await import('~/server/api/user/password.put')
    await expect(handler({ context: { user: { id: '1' } } } as any)).rejects.toMatchObject({
      statusCode: 429,
    })
    expect(mockRateLimitersAuthPasswordIdentity).not.toHaveBeenCalled()
    expect(mockAuthLogWarn).toHaveBeenCalledWith(
      'Password change rate limited',
      expect.objectContaining({ ip: '127.0.0.1' })
    )
  })

  it('rate limits password change by identity', async () => {
    mockReadBody.mockResolvedValue({
      currentPassword: 'old-password',
      newPassword: 'new-password-123',
    })
    mockRateLimitersAuthPasswordIdentity.mockRejectedValueOnce(new Error('rate limited'))

    const { default: handler } = await import('~/server/api/user/password.put')
    await expect(handler({ context: { user: { id: '1' } } } as any)).rejects.toMatchObject({
      statusCode: 429,
    })
    expect(mockRateLimitersAuthPasswordIp).toHaveBeenCalledWith('127.0.0.1')
    expect(mockAuthLogWarn).toHaveBeenCalledWith(
      'Password change rate limited',
      expect.objectContaining({ userId: '1' })
    )
  })

  it('should reject invalid current password', async () => {
    mockReadBody.mockResolvedValue({
      currentPassword: 'wrong',
      newPassword: 'new-password-123',
    })
    mockUserFindUnique.mockResolvedValue({ id: 1n, password: 'hashed-old' })
    mockBcryptCompare.mockResolvedValue(false)

    const { default: handler } = await import('~/server/api/user/password.put')
    await expect(handler({ context: { user: { id: '1' } } } as any)).rejects.toMatchObject({
      statusCode: 401,
    })
    expect(mockUserUpdate).not.toHaveBeenCalled()
    expect(mockRefreshTokenDeleteMany).not.toHaveBeenCalled()
  })

  it('should return 404 when user is missing', async () => {
    mockReadBody.mockResolvedValue({
      currentPassword: 'old-password',
      newPassword: 'new-password-123',
    })
    mockUserFindUnique.mockResolvedValue(null)

    const { default: handler } = await import('~/server/api/user/password.put')

    await expect(handler({ context: { user: { id: '1' } } } as any)).rejects.toMatchObject({
      statusCode: 404,
    })
    expect(mockBcryptCompare).not.toHaveBeenCalled()
  })

  it('bubbles bcrypt failures', async () => {
    mockReadBody.mockResolvedValue({
      currentPassword: 'old-password',
      newPassword: 'new-password-123',
    })
    mockUserFindUnique.mockResolvedValue({ id: 1n, password: 'hashed-old' })
    mockBcryptCompare.mockRejectedValue(new Error('bcrypt failed'))

    const { default: handler } = await import('~/server/api/user/password.put')

    await expect(handler({ context: { user: { id: '1' } } } as any)).rejects.toBeDefined()
    expect(mockTransaction).not.toHaveBeenCalled()
  })

  it('returns error when transaction fails', async () => {
    mockReadBody.mockResolvedValue({
      currentPassword: 'old-password',
      newPassword: 'new-password-123',
    })
    mockUserFindUnique.mockResolvedValue({ id: 1n, password: 'hashed-old' })
    mockBcryptCompare.mockResolvedValue(true)
    mockBcryptHash.mockResolvedValue('hashed-new')
    mockTransaction.mockRejectedValue(new Error('tx failed'))

    const { default: handler } = await import('~/server/api/user/password.put')

    await expect(handler({ context: { user: { id: '1' } } } as any)).rejects.toBeDefined()
    expect(mockDeleteCookie).not.toHaveBeenCalled()
  })
})
