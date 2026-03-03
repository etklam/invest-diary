import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('server/middleware/admin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should reject unauthenticated requests with 401', async () => {
    const { default: handler } = await import('~/server/middleware/admin')
    ;(global.getRequestURL as any).mockReturnValue({ pathname: '/api/admin/users' })

    await expect(handler({ context: {} } as any)).rejects.toMatchObject({
      statusCode: 401,
      statusMessage: 'UNAUTHORIZED',
    })
  })

  it('should reject non-admin users with 403', async () => {
    const { default: handler } = await import('~/server/middleware/admin')
    ;(global.getRequestURL as any).mockReturnValue({ pathname: '/api/admin/users' })

    await expect(handler({
      context: { user: { id: '1', role: 'USER' } },
    } as any)).rejects.toMatchObject({
      statusCode: 403,
      statusMessage: 'ADMIN_ONLY',
    })
  })

  it('should allow admin users', async () => {
    const { default: handler } = await import('~/server/middleware/admin')
    ;(global.getRequestURL as any).mockReturnValue({ pathname: '/api/admin/users' })

    await expect(handler({
      context: { user: { id: '1', role: 'ADMIN' } },
    } as any)).resolves.toBeUndefined()
  })

  it('should skip admin check for non-admin routes', async () => {
    const { default: handler } = await import('~/server/middleware/admin')
    ;(global.getRequestURL as any).mockReturnValue({ pathname: '/api/diaries' })

    await expect(handler({
      context: { user: { id: '1', role: 'USER' } },
    } as any)).resolves.toBeUndefined()
  })

  it('should reject non-admin users on /api/admin routes with 403', async () => {
    const { default: handler } = await import('~/server/middleware/admin')
    ;(global.getRequestURL as any).mockReturnValue({ pathname: '/api/admin/etf' })

    await expect(handler({
      context: { user: { id: '1', role: 'USER' } },
    } as any)).rejects.toMatchObject({
      statusCode: 403,
      statusMessage: 'ADMIN_ONLY',
    })
  })
})
