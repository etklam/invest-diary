import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mockGetCookie } from '../../vi-setup'

const mockVerifyToken = vi.fn()
const mockUserFindUnique = vi.fn()

vi.mock('~/lib/jwt', () => ({
  verifyToken: mockVerifyToken,
}))

vi.mock('~/lib/prisma', () => ({
  default: {
    user: {
      findUnique: mockUserFindUnique,
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
})
