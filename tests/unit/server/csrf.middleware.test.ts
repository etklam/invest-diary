import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockGetHeader, mockGetCookie, mockSetCookie } from '../../vi-setup'

describe('server/middleware/csrf', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetHeader.mockReset()
    mockGetCookie.mockReset()
    mockSetCookie.mockReset()
  })

  const buildEvent = (
    method: string,
    _pathname: string,
    context: Record<string, unknown> = { authResolved: true },
  ) => ({ method, context }) as any

  const stubHeaders = (headers: Record<string, string | undefined>) => {
    mockGetHeader.mockImplementation((_e: unknown, name: string) => {
      const key = String(name).toLowerCase()
      return headers[key] ?? headers[name] ?? undefined
    })
  }

  const loadHandler = async () => (await import('~/server/middleware/csrf')).default

  // ── Safe methods (GET/HEAD/OPTIONS) ──

  it('GET /api/* without cookie sets a new csrf cookie and passes through', async () => {
    ;(global.getRequestURL as any).mockReturnValue({ pathname: '/api/diaries' })
    mockGetCookie.mockReturnValue(undefined)
    stubHeaders({})

    const handler = await loadHandler()
    await expect(handler(buildEvent('GET', '/api/diaries'))).resolves.toBeUndefined()

    expect(mockSetCookie).toHaveBeenCalledWith(
      expect.any(Object),
      'csrf-token',
      expect.any(String),
      expect.objectContaining({ sameSite: 'strict', httpOnly: false, path: '/' })
    )
  })

  it('GET /api/* with existing cookie does NOT rotate it', async () => {
    ;(global.getRequestURL as any).mockReturnValue({ pathname: '/api/diaries' })
    mockGetCookie.mockReturnValue('existing-token')
    stubHeaders({})

    const handler = await loadHandler()
    await expect(handler(buildEvent('GET', '/api/diaries'))).resolves.toBeUndefined()
    expect(mockSetCookie).not.toHaveBeenCalled()
  })

  it('ignores non-API routes entirely', async () => {
    ;(global.getRequestURL as any).mockReturnValue({ pathname: '/diary/123' })
    const handler = await loadHandler()
    await expect(handler(buildEvent('POST', '/diary/123'))).resolves.toBeUndefined()
    expect(mockSetCookie).not.toHaveBeenCalled()
    expect(mockGetCookie).not.toHaveBeenCalled()
  })

  // ── State-changing methods: rejection paths ──

  it('POST without csrf cookie or header is rejected (403)', async () => {
    ;(global.getRequestURL as any).mockReturnValue({ pathname: '/api/diaries' })
    mockGetCookie.mockReturnValue(undefined)
    stubHeaders({})

    const handler = await loadHandler()
    await expect(handler(buildEvent('POST', '/api/diaries'))).rejects.toMatchObject({
      statusCode: 403,
    })
  })

  it('POST with mismatched cookie/header tokens is rejected (403)', async () => {
    ;(global.getRequestURL as any).mockReturnValue({ pathname: '/api/diaries' })
    mockGetCookie.mockReturnValue('cookie-token')
    stubHeaders({ 'x-csrf-token': 'different-header-token' })

    const handler = await loadHandler()
    await expect(handler(buildEvent('POST', '/api/diaries'))).rejects.toMatchObject({
      statusCode: 403,
    })
  })

  it('POST with cookie but missing header token is rejected (403)', async () => {
    ;(global.getRequestURL as any).mockReturnValue({ pathname: '/api/diaries' })
    mockGetCookie.mockReturnValue('cookie-token')
    stubHeaders({})

    const handler = await loadHandler()
    await expect(handler(buildEvent('POST', '/api/diaries'))).rejects.toMatchObject({
      statusCode: 403,
    })
  })

  // ── State-changing methods: acceptance paths ──

  it('POST with matching csrf cookie + header passes', async () => {
    ;(global.getRequestURL as any).mockReturnValue({ pathname: '/api/diaries' })
    mockGetCookie.mockReturnValue('match-token')
    stubHeaders({ 'x-csrf-token': 'match-token' })

    const handler = await loadHandler()
    await expect(handler(buildEvent('POST', '/api/diaries'))).resolves.toBeUndefined()
  })

  it('PUT /api/diaries with matching tokens passes', async () => {
    ;(global.getRequestURL as any).mockReturnValue({ pathname: '/api/diaries/1' })
    mockGetCookie.mockReturnValue('t')
    stubHeaders({ 'x-csrf-token': 't' })

    const handler = await loadHandler()
    await expect(handler(buildEvent('PUT', '/api/diaries/1'))).resolves.toBeUndefined()
  })

  it('DELETE /api/diaries/1 with matching tokens passes', async () => {
    ;(global.getRequestURL as any).mockReturnValue({ pathname: '/api/diaries/1' })
    mockGetCookie.mockReturnValue('t')
    stubHeaders({ 'x-csrf-token': 't' })

    const handler = await loadHandler()
    await expect(handler(buildEvent('DELETE', '/api/diaries/1'))).resolves.toBeUndefined()
  })

  // ── B1 regression: API key prefix must be `dva_`, not the legacy `sk_` ──

  it('POST with an unverified Authorization: Bearer dva_... does not skip CSRF', async () => {
    ;(global.getRequestURL as any).mockReturnValue({ pathname: '/api/diaries' })
    mockGetCookie.mockReturnValue(undefined)
    stubHeaders({ authorization: 'Bearer dva_abcdef123456' })

    const handler = await loadHandler()
    await expect(handler(buildEvent('POST', '/api/diaries'))).rejects.toMatchObject({
      statusCode: 403,
    })
  })

  it('POST with an unverified x-api-key does not skip CSRF', async () => {
    ;(global.getRequestURL as any).mockReturnValue({ pathname: '/api/diaries' })
    mockGetCookie.mockReturnValue(undefined)
    stubHeaders({ 'x-api-key': 'dva_abcdef123456' })

    const handler = await loadHandler()
    await expect(handler(buildEvent('POST', '/api/diaries'))).rejects.toMatchObject({
      statusCode: 403,
    })
  })

  it('POST with a raw legacy Authorization header does not skip CSRF', async () => {
    ;(global.getRequestURL as any).mockReturnValue({ pathname: '/api/diaries' })
    mockGetCookie.mockReturnValue(undefined)
    stubHeaders({ authorization: 'Bearer sk_legacytoken' })

    const handler = await loadHandler()
    await expect(handler(buildEvent('POST', '/api/diaries'))).rejects.toMatchObject({
      statusCode: 403,
    })
  })

  it('POST with a raw non-dva Bearer token does not skip CSRF', async () => {
    ;(global.getRequestURL as any).mockReturnValue({ pathname: '/api/diaries' })
    mockGetCookie.mockReturnValue(undefined)
    stubHeaders({ authorization: 'Bearer jwt-or-something-else' })

    const handler = await loadHandler()
    await expect(handler(buildEvent('POST', '/api/diaries'))).rejects.toMatchObject({
      statusCode: 403,
    })
  })

  // ── SKIP_PATHS invariant ──

  it('POST /api/auth/login skips CSRF (login can happen before cookie exists)', async () => {
    ;(global.getRequestURL as any).mockReturnValue({ pathname: '/api/auth/login' })
    mockGetCookie.mockReturnValue(undefined)
    stubHeaders({})

    const handler = await loadHandler()
    await expect(handler(buildEvent('POST', '/api/auth/login'))).resolves.toBeUndefined()
  })

  it('POST /api/agent/diary without verified API key still requires CSRF', async () => {
    ;(global.getRequestURL as any).mockReturnValue({ pathname: '/api/agent/diary' })
    mockGetCookie.mockReturnValue(undefined)
    stubHeaders({})

    const handler = await loadHandler()
    await expect(handler(buildEvent('POST', '/api/agent/diary'))).rejects.toMatchObject({
      statusCode: 403,
    })
  })

  it('POST with verified API key auth skips CSRF', async () => {
    ;(global.getRequestURL as any).mockReturnValue({ pathname: '/api/agent/diary' })
    mockGetCookie.mockReturnValue(undefined)
    stubHeaders({})

    const handler = await loadHandler()
    await expect(handler(buildEvent('POST', '/api/agent/diary', {
      authResolved: true,
      auth: {
        transport: 'api-key',
        user: { id: '7', email: 'agent@example.com', role: 'USER' },
      },
    }))).resolves.toBeUndefined()
  })

  it('POST with verified Bearer auth skips CSRF without inspecting Authorization', async () => {
    ;(global.getRequestURL as any).mockReturnValue({ pathname: '/api/diaries' })
    mockGetCookie.mockReturnValue(undefined)
    stubHeaders({ authorization: 'Bearer garbage' })

    const handler = await loadHandler()
    await expect(handler(buildEvent('POST', '/api/diaries', {
      authResolved: true,
      auth: {
        transport: 'bearer',
        user: { id: '7', email: 'native@example.com', role: 'USER' },
      },
    }))).resolves.toBeUndefined()

    expect(mockGetHeader).not.toHaveBeenCalledWith(expect.anything(), 'authorization')
  })

  it('POST to the former Telegram webhook path still requires CSRF', async () => {
    ;(global.getRequestURL as any).mockReturnValue({ pathname: '/api/telegram/webhook' })
    mockGetCookie.mockReturnValue(undefined)
    stubHeaders({})

    const handler = await loadHandler()
    await expect(handler(buildEvent('POST', '/api/telegram/webhook'))).rejects.toMatchObject({
      statusCode: 403,
    })
  })
})
