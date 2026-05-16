import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('server/middleware/admin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(global.setHeader as any) = vi.fn()
  })

  // ── /api/admin/** routes ──

  it('should reject unauthenticated requests with 401', async () => {
    const { default: handler } = await import('~/server/middleware/admin')
    ;(global.getRequestURL as any).mockReturnValue({ pathname: '/api/admin/users' })

    await expect(handler({ context: {} } as any)).rejects.toMatchObject({
      statusCode: 401,
      statusMessage: 'Authentication required',
    })
    expect(global.setHeader).toHaveBeenCalledWith(
      expect.any(Object),
      'Cache-Control',
      'no-store'
    )
  })

  it('should reject non-admin users with 403', async () => {
    const { default: handler } = await import('~/server/middleware/admin')
    ;(global.getRequestURL as any).mockReturnValue({ pathname: '/api/admin/users' })

    await expect(handler({
      context: { user: { id: '1', role: 'USER' } },
    } as any)).rejects.toMatchObject({
      statusCode: 403,
      statusMessage: 'Forbidden',
    })
  })

  it('should allow admin users', async () => {
    const { default: handler } = await import('~/server/middleware/admin')
    ;(global.getRequestURL as any).mockReturnValue({ pathname: '/api/admin/users' })

    await expect(handler({
      context: { user: { id: '1', role: 'ADMIN' } },
    } as any)).resolves.toBeUndefined()
  })

  it('should reject non-admin users on /api/admin routes with 403', async () => {
    const { default: handler } = await import('~/server/middleware/admin')
    ;(global.getRequestURL as any).mockReturnValue({ pathname: '/api/admin/etf' })

    await expect(handler({
      context: { user: { id: '1', role: 'USER' } },
    } as any)).rejects.toMatchObject({
      statusCode: 403,
      statusMessage: 'Forbidden',
    })
  })

  // ── non-protected routes (pass-through) ──

  it('should skip admin check for non-admin routes', async () => {
    const { default: handler } = await import('~/server/middleware/admin')
    ;(global.getRequestURL as any).mockReturnValue({ pathname: '/api/diaries' })

    await expect(handler({
      context: { user: { id: '1', role: 'USER' } },
    } as any)).resolves.toBeUndefined()
    expect(global.setHeader).not.toHaveBeenCalled()
  })

  it('should allow public GET /api/blog without admin', async () => {
    const { default: handler } = await import('~/server/middleware/admin')
    ;(global.getRequestURL as any).mockReturnValue({ pathname: '/api/blog' })

    await expect(handler({
      method: 'GET',
      context: {},
    } as any)).resolves.toBeUndefined()
    expect(global.setHeader).not.toHaveBeenCalled()
  })

  it('should pass through GET /api/blog/slug for public reads', async () => {
    const { default: handler } = await import('~/server/middleware/admin')
    ;(global.getRequestURL as any).mockReturnValue({ pathname: '/api/blog/my-post-slug' })

    await expect(handler({
      method: 'GET',
      context: {},
    } as any)).resolves.toBeUndefined()
    expect(global.setHeader).not.toHaveBeenCalled()
  })

  // ── blog write routes ──

  it('should reject unauthenticated POST /api/blog with 401', async () => {
    const { default: handler } = await import('~/server/middleware/admin')
    ;(global.getRequestURL as any).mockReturnValue({ pathname: '/api/blog' })

    await expect(handler({
      method: 'POST',
      context: {},
    } as any)).rejects.toMatchObject({
      statusCode: 401,
      statusMessage: 'Authentication required',
    })
    expect(global.setHeader).toHaveBeenCalledWith(
      expect.any(Object),
      'Cache-Control',
      'no-store'
    )
  })

  it('should reject non-admin PUT /api/blog/:slug with 403', async () => {
    const { default: handler } = await import('~/server/middleware/admin')
    ;(global.getRequestURL as any).mockReturnValue({ pathname: '/api/blog/my-post' })

    await expect(handler({
      method: 'PUT',
      context: { user: { id: '1', role: 'USER' } },
    } as any)).rejects.toMatchObject({
      statusCode: 403,
      statusMessage: 'Forbidden',
    })
  })

  it('should reject non-admin PATCH /api/blog/:slug with 403', async () => {
    const { default: handler } = await import('~/server/middleware/admin')
    ;(global.getRequestURL as any).mockReturnValue({ pathname: '/api/blog/my-post' })

    await expect(handler({
      method: 'PATCH',
      context: { user: { id: '1', role: 'USER' } },
    } as any)).rejects.toMatchObject({
      statusCode: 403,
      statusMessage: 'Forbidden',
    })
  })

  it('should reject non-admin DELETE /api/blog/:slug with 403', async () => {
    const { default: handler } = await import('~/server/middleware/admin')
    ;(global.getRequestURL as any).mockReturnValue({ pathname: '/api/blog/my-post' })

    await expect(handler({
      method: 'DELETE',
      context: { user: { id: '1', role: 'USER' } },
    } as any)).rejects.toMatchObject({
      statusCode: 403,
      statusMessage: 'Forbidden',
    })
  })

  it('should allow admin POST /api/blog', async () => {
    const { default: handler } = await import('~/server/middleware/admin')
    ;(global.getRequestURL as any).mockReturnValue({ pathname: '/api/blog' })

    await expect(handler({
      method: 'POST',
      context: { user: { id: '1', role: 'ADMIN' } },
    } as any)).resolves.toBeUndefined()
  })

  it('should allow admin DELETE /api/blog/:slug', async () => {
    const { default: handler } = await import('~/server/middleware/admin')
    ;(global.getRequestURL as any).mockReturnValue({ pathname: '/api/blog/old-post' })

    await expect(handler({
      method: 'DELETE',
      context: { user: { id: '1', role: 'ADMIN' } },
    } as any)).resolves.toBeUndefined()
  })

  // ── /api/blog/admin/** routes ──

  it('should reject unauthenticated GET /api/blog/admin with 401', async () => {
    const { default: handler } = await import('~/server/middleware/admin')
    ;(global.getRequestURL as any).mockReturnValue({ pathname: '/api/blog/admin' })

    await expect(handler({
      method: 'GET',
      context: {},
    } as any)).rejects.toMatchObject({
      statusCode: 401,
      statusMessage: 'Authentication required',
    })
    expect(global.setHeader).toHaveBeenCalledWith(
      expect.any(Object),
      'Cache-Control',
      'no-store'
    )
  })

  it('should reject non-admin GET /api/blog/admin/stats with 403', async () => {
    const { default: handler } = await import('~/server/middleware/admin')
    ;(global.getRequestURL as any).mockReturnValue({ pathname: '/api/blog/admin/stats' })

    await expect(handler({
      method: 'GET',
      context: { user: { id: '1', role: 'USER' } },
    } as any)).rejects.toMatchObject({
      statusCode: 403,
      statusMessage: 'Forbidden',
    })
  })

  it('should allow admin GET /api/blog/admin', async () => {
    const { default: handler } = await import('~/server/middleware/admin')
    ;(global.getRequestURL as any).mockReturnValue({ pathname: '/api/blog/admin' })

    await expect(handler({
      method: 'GET',
      context: { user: { id: '1', role: 'ADMIN' } },
    } as any)).resolves.toBeUndefined()
  })

  // ── Cache-Control header ──

  it('should set Cache-Control: no-store on all protected routes', async () => {
    const { default: handler } = await import('~/server/middleware/admin')

    // POST /api/blog is a protected route — even though auth fails, header should be set
    ;(global.getRequestURL as any).mockReturnValue({ pathname: '/api/blog' })

    await expect(handler({
      method: 'POST',
      context: { user: { id: '1', role: 'ADMIN' } },
    } as any)).resolves.toBeUndefined()

    expect(global.setHeader).toHaveBeenCalledWith(
      expect.any(Object),
      'Cache-Control',
      'no-store'
    )
  })

  it('should NOT set Cache-Control on non-protected routes', async () => {
    const { default: handler } = await import('~/server/middleware/admin')
    ;(global.getRequestURL as any).mockReturnValue({ pathname: '/api/diaries' })

    await expect(handler({
      context: { user: { id: '1', role: 'USER' } },
    } as any)).resolves.toBeUndefined()

    expect(global.setHeader).not.toHaveBeenCalled()
  })
})
