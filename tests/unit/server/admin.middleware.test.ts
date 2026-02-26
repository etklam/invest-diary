import { describe, it, expect } from 'vitest'

describe('server/middleware/admin', () => {
  it('should reject unauthenticated requests with 401', async () => {
    const { default: handler } = await import('~/server/middleware/admin')

    await expect(handler({ context: {} } as any)).rejects.toMatchObject({
      statusCode: 401,
      statusMessage: 'UNAUTHORIZED',
    })
  })

  it('should reject non-admin users with 403', async () => {
    const { default: handler } = await import('~/server/middleware/admin')

    await expect(handler({
      context: { user: { id: '1', role: 'USER' } },
    } as any)).rejects.toMatchObject({
      statusCode: 403,
      statusMessage: 'ADMIN_ONLY',
    })
  })

  it('should allow admin users', async () => {
    const { default: handler } = await import('~/server/middleware/admin')

    await expect(handler({
      context: { user: { id: '1', role: 'ADMIN' } },
    } as any)).resolves.toBeUndefined()
  })
})
