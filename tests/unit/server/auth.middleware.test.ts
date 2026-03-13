import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mockGetCookie, mockSetCookie } from '../../vi-setup'

const mockVerifyToken = vi.fn()
const mockSignAccessToken = vi.fn()
const mockUserFindUnique = vi.fn()
const mockRefreshTokenFindUnique = vi.fn()

vi.mock('~/lib/jwt', () => ({
  verifyToken: mockVerifyToken,
  signAccessToken: mockSignAccessToken,
  ACCESS_TOKEN_MAX_AGE_SECONDS: 60 * 60,
}))

vi.mock('~/lib/prisma', () => ({
  default: {
    user: {
      findUnique: mockUserFindUnique,
    },
    refreshToken: {
      findUnique: mockRefreshTokenFindUnique,
    },
  },
}))

describe('server/middleware/auth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should set user when token is valid and tokenVersion matches', async () => {
    mockGetCookie.mockReturnValueOnce('valid-access-token').mockReturnValueOnce(null)
    mockVerifyToken.mockResolvedValue({
      userId: '1',
      email: 'token@example.com',
      role: 'USER',
      tokenVersion: 2,
      type: 'access',
    })
    mockUserFindUnique.mockResolvedValue({
      id: 1n,
      email: 'db@example.com',
      role: 'ADMIN',
      tokenVersion: 2,
    })

    const { default: handler } = await import('~/server/middleware/auth')
    const event = { context: {} } as any
    await handler(event)

    expect(event.context.user).toEqual({
      id: '1',
      email: 'db@example.com',
      role: 'ADMIN',
    })
  })

  it('should clear user when tokenVersion mismatches', async () => {
    mockGetCookie.mockReturnValueOnce('valid-access-token').mockReturnValueOnce(null)
    mockVerifyToken.mockResolvedValue({
      userId: '1',
      email: 'token@example.com',
      role: 'USER',
      tokenVersion: 1,
      type: 'access',
    })
    mockUserFindUnique.mockResolvedValue({
      id: 1n,
      email: 'db@example.com',
      role: 'USER',
      tokenVersion: 2,
    })

    const { default: handler } = await import('~/server/middleware/auth')
    const event = { context: { user: { id: 'old' } } } as any
    await handler(event)

    expect(event.context.user).toBeUndefined()
  })

  it('should recover session via refresh token when access token is expired', async () => {
    mockGetCookie
      .mockReturnValueOnce('expired-access-token')
      .mockReturnValueOnce(null)
      .mockReturnValueOnce('valid-refresh-token')

    mockVerifyToken
      .mockRejectedValueOnce(new Error('jwt expired'))
      .mockResolvedValueOnce({
        userId: '1',
        email: 'token@example.com',
        role: 'USER',
        tokenVersion: 2,
        type: 'refresh',
      })

    mockRefreshTokenFindUnique.mockResolvedValue({
      token: 'valid-refresh-token',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      user: {
        id: 1n,
        email: 'db@example.com',
        role: 'ADMIN',
        tokenVersion: 2,
      },
    })

    mockSignAccessToken.mockResolvedValue('new-access-token')

    const { default: handler } = await import('~/server/middleware/auth')
    const event = { context: {} } as any
    await handler(event)

    expect(event.context.user).toEqual({
      id: '1',
      email: 'db@example.com',
      role: 'ADMIN',
    })
    expect(mockSignAccessToken).toHaveBeenCalledWith('1', 'db@example.com', 'ADMIN', 2)
    expect(mockSetCookie).toHaveBeenCalled()
  })

  it('should clear context when access token is a refresh token', async () => {
    mockGetCookie.mockReturnValueOnce('refresh-token-as-access').mockReturnValueOnce(null).mockReturnValueOnce(null)
    mockVerifyToken.mockResolvedValue({
      userId: '1',
      email: 'token@example.com',
      role: 'USER',
      tokenVersion: 1,
      type: 'refresh',
    })

    const { default: handler } = await import('~/server/middleware/auth')
    const event = { context: {} } as any
    await handler(event)

    expect(event.context.user).toBeUndefined()
    expect(mockUserFindUnique).not.toHaveBeenCalled()
  })

  it('should clear context when refresh token is missing in storage', async () => {
    mockGetCookie
      .mockReturnValueOnce('expired-access-token')
      .mockReturnValueOnce(null)
      .mockReturnValueOnce('valid-refresh-token')

    mockVerifyToken
      .mockRejectedValueOnce(new Error('jwt expired'))
      .mockResolvedValueOnce({
        userId: '1',
        email: 'token@example.com',
        role: 'USER',
        tokenVersion: 2,
        type: 'refresh',
      })

    mockRefreshTokenFindUnique.mockResolvedValue(null)

    const { default: handler } = await import('~/server/middleware/auth')
    const event = { context: {} } as any
    await handler(event)

    expect(event.context.user).toBeUndefined()
    expect(mockSetCookie).not.toHaveBeenCalled()
  })
})
