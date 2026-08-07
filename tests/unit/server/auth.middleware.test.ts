import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mockGetCookie, mockSetCookie } from '../../vi-setup'
import { createHash } from 'node:crypto'

const mockVerifyToken = vi.fn()
const mockSignAccessToken = vi.fn()
const mockUserFindUnique = vi.fn()
const mockRefreshTokenFindUnique = vi.fn()
const mockRefreshTokenUpdate = vi.fn()

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
      update: mockRefreshTokenUpdate,
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

  const hashToken = (token: string) => createHash('sha256').update(token).digest('hex')

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
      token: hashToken('valid-refresh-token'),
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
    mockGetCookie.mockReturnValueOnce('refresh-token-as-access').mockReturnValueOnce(null)
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

  it('should reject user when database user is missing even if access token verifies', async () => {
    mockGetCookie.mockReturnValueOnce('valid-access-token').mockReturnValueOnce(null)
    mockVerifyToken.mockResolvedValue({
      userId: '999',
      email: 'ghost@example.com',
      role: 'USER',
      tokenVersion: 1,
      type: 'access',
    })
    mockUserFindUnique.mockResolvedValue(null)

    const { default: handler } = await import('~/server/middleware/auth')
    const event = { context: {} } as any
    await handler(event)

    expect(event.context.user).toBeUndefined()
  })

  it('should apply normal JWT processing to the former Telegram webhook path', async () => {
    // The webhook route has been removed; its former path must no longer bypass auth.
    ;(global.getRequestURL as any).mockReturnValue({ pathname: '/api/telegram/webhook' })
    mockGetCookie.mockReturnValueOnce('access').mockReturnValueOnce(null)
    mockVerifyToken.mockResolvedValueOnce({
      userId: '1',
      email: 'a@b.com',
      role: 'USER',
      tokenVersion: 1,
      type: 'access',
    })
    mockUserFindUnique.mockResolvedValueOnce({
      id: 1n,
      email: 'a@b.com',
      role: 'USER',
      tokenVersion: 1,
    })

    const { default: handler } = await import('~/server/middleware/auth')
    const event = { context: {} } as any
    await handler(event)

    expect(mockVerifyToken).toHaveBeenCalled()
    expect(event.context.user).toEqual({ id: '1', email: 'a@b.com', role: 'USER' })
  })

  it('should leave context.user undefined for former Telegram webhook path without credentials', async () => {
    ;(global.getRequestURL as any).mockReturnValue({ pathname: '/api/telegram/webhook' })
    mockGetCookie.mockReset()
    mockGetCookie.mockReturnValue(undefined)

    const { default: handler } = await import('~/server/middleware/auth')
    const event = { context: { user: undefined } } as any
    await handler(event)

    expect(mockVerifyToken).not.toHaveBeenCalled()
    expect(event.context.user).toBeUndefined()
  })

  it('should leave context.user undefined for protected /api paths without any credentials', async () => {
    // ponytail: previous tests' mockResolvedValue/Once implementations leak through
    // beforeEach's clearAllMocks (which clears call history but NOT impl). Reset
    // explicitly so this test truly simulates "no credentials, no token machinery".
    ;(global.getRequestURL as any).mockReturnValue({ pathname: '/api/diaries' })
    mockGetCookie.mockReset()
    mockGetCookie.mockReturnValue(undefined)

    const { default: handler } = await import('~/server/middleware/auth')
    const event = { context: { user: undefined } } as any
    await handler(event)

    expect(event.context.user).toBeUndefined()
    expect(mockVerifyToken).not.toHaveBeenCalled()
  })

  it('should ignore non-API routes entirely (no JWT parsing for /pages/* etc.)', async () => {
    ;(global.getRequestURL as any).mockReturnValue({ pathname: '/blog/some-post' })

    const { default: handler } = await import('~/server/middleware/auth')
    const event = { context: {} } as any
    await handler(event)

    expect(mockGetCookie).not.toHaveBeenCalled()
    expect(mockVerifyToken).not.toHaveBeenCalled()
  })
})
