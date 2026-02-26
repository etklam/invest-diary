import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mockReadBody, mockDeleteCookie } from '../vi-setup'

const mockUserFindUnique = vi.fn()
const mockUserUpdate = vi.fn()
const mockRefreshTokenDeleteMany = vi.fn()
const mockTransaction = vi.fn()
const mockBcryptCompare = vi.fn()
const mockBcryptHash = vi.fn()

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
    })
    expect(mockRefreshTokenDeleteMany).toHaveBeenCalledWith({
      where: { userId: 1n },
    })
    expect(mockDeleteCookie).toHaveBeenCalledWith(event, 'access-token', { path: '/' })
    expect(mockDeleteCookie).toHaveBeenCalledWith(event, 'refresh-token', { path: '/' })
    expect(result).toEqual({
      success: true,
      message: 'Password changed successfully. Please login again.',
    })
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
})
