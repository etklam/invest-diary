import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockGetCookie, mockGetHeader, mockSetCookie } from '../vi-setup'

const {
  mockAccessAuth,
  mockRefreshAuth,
  mockApiKeyAuth,
  mockSignAccessToken,
  mockWarn,
  mockDebug,
  mockError,
} = vi.hoisted(() => ({
  mockAccessAuth: vi.fn(),
  mockRefreshAuth: vi.fn(),
  mockApiKeyAuth: vi.fn(),
  mockSignAccessToken: vi.fn(),
  mockWarn: vi.fn(),
  mockDebug: vi.fn(),
  mockError: vi.fn(),
}))

vi.mock('~/server/utils/auth-session', () => ({
  authenticateAccessToken: mockAccessAuth,
  authenticateRefreshToken: mockRefreshAuth,
}))

vi.mock('~/server/utils/api-key', () => ({
  API_KEY_TOKEN_PREFIX: 'dva_',
  authenticateApiKey: mockApiKeyAuth,
}))

vi.mock('~/lib/jwt', () => ({
  signAccessToken: mockSignAccessToken,
  ACCESS_TOKEN_MAX_AGE_SECONDS: 60 * 60,
}))

const authLog = {
  warn: mockWarn,
  debug: mockDebug,
  error: mockError,
  withRequestId: vi.fn(() => authLog),
}

vi.mock('~/lib/logger', () => ({
  logger: { auth: authLog },
}))

vi.mock('~/server/utils/user-queries', () => ({
  getUserProfile: vi.fn(async (id: bigint) => ({
    id,
    email: 'bearer@example.com',
    name: 'Bearer User',
    role: 'USER',
  })),
}))

const bearerUser = { id: '7', email: 'bearer@example.com', role: 'USER' }
const apiKeyAuth = {
  apiKeyId: '31',
  label: 'Agent key',
  scope: 'AGENT_WRITE',
  user: { id: '8', email: 'agent@example.com', role: 'USER', name: 'Agent' },
}

function setPath(path: string) {
  ;(global.getRequestURL as any).mockReturnValue({ pathname: path })
}

function setHeaders(headers: Record<string, string | undefined>) {
  mockGetHeader.mockImplementation((_event: unknown, name: string) => headers[name] ?? undefined)
}

function event(context: Record<string, unknown> = {}) {
  return { context } as any
}

describe('fail-closed credential resolution', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setPath('/api/diaries')
    mockGetCookie.mockReset()
    mockGetHeader.mockReset()
    mockSetCookie.mockReset()
    mockAccessAuth.mockReset()
    mockRefreshAuth.mockReset()
    mockApiKeyAuth.mockReset()
    mockSignAccessToken.mockResolvedValue('refreshed-access-token')
    setHeaders({})
  })

  it('leaves an API request anonymous when no credential is supplied', async () => {
    mockGetCookie.mockReturnValue(undefined)
    const { default: auth } = await import('~/server/middleware/auth')
    const request = event()

    await expect(auth(request)).resolves.toBeUndefined()

    expect(request.context.auth).toBeUndefined()
    expect(request.context.user).toBeUndefined()
  })

  it('uses a valid cookie and preserves cookie access-to-refresh recovery', async () => {
    mockGetCookie.mockReturnValueOnce('expired-access').mockReturnValueOnce('valid-refresh')
    mockAccessAuth.mockRejectedValueOnce(new Error('expired'))
    mockRefreshAuth.mockResolvedValueOnce({
      sessionUser: bearerUser,
      storedToken: {
        user: { id: 7n, email: bearerUser.email, role: bearerUser.role, tokenVersion: 0 },
      },
    })

    const { default: auth } = await import('~/server/middleware/auth')
    const request = event()
    await auth(request)

    expect(request.context.auth).toMatchObject({ transport: 'cookie', user: bearerUser })
    expect(request.context.user).toEqual(bearerUser)
    expect(mockSetCookie).toHaveBeenCalled()
  })

  it.each([
    ['invalid', 'rejects'],
    ['expired', 'rejects'],
    ['malformed', 'rejects'],
    ['tokenVersion mismatch', 'returns null'],
  ])('rejects an %s Bearer token without consulting cookies', async (_case, behavior) => {
    setHeaders({ authorization: 'Bearer invalid-access-token' })
    mockGetCookie.mockReturnValue('valid-cookie')
    if (behavior === 'returns null') mockAccessAuth.mockResolvedValueOnce(null)
    else mockAccessAuth.mockRejectedValueOnce(new Error('invalid access token'))

    const { default: auth } = await import('~/server/middleware/auth')
    await expect(auth(event({ user: bearerUser }))).rejects.toMatchObject({
      statusCode: 401,
    })

    expect(mockGetCookie).not.toHaveBeenCalled()
    expect(mockRefreshAuth).not.toHaveBeenCalled()
  })

  it('rejects malformed Authorization with a valid cookie', async () => {
    setHeaders({ authorization: 'Basic credentials' })
    mockGetCookie.mockReturnValue('valid-cookie')

    const { default: auth } = await import('~/server/middleware/auth')
    await expect(auth(event())).rejects.toMatchObject({ statusCode: 401 })

    expect(mockGetCookie).not.toHaveBeenCalled()
  })

  it('rejects an invalid API key with a valid cookie without consulting cookies', async () => {
    setHeaders({ 'x-api-key': 'dva_invalid-key' })
    mockGetCookie.mockReturnValue('valid-cookie')
    mockApiKeyAuth.mockRejectedValueOnce(new Error('invalid API key'))

    const { default: auth } = await import('~/server/middleware/auth')
    await expect(auth(event())).rejects.toMatchObject({ statusCode: 401 })

    expect(mockGetCookie).not.toHaveBeenCalled()
    expect(mockAccessAuth).not.toHaveBeenCalled()
  })

  it('rejects ambiguous explicit credentials before verifying either source', async () => {
    setHeaders({ authorization: 'Bearer access-token', 'x-api-key': 'dva_key' })
    mockGetCookie.mockReturnValue('valid-cookie')

    const { default: auth } = await import('~/server/middleware/auth')
    await expect(auth(event())).rejects.toMatchObject({ statusCode: 401 })

    expect(mockAccessAuth).not.toHaveBeenCalled()
    expect(mockApiKeyAuth).not.toHaveBeenCalled()
    expect(mockGetCookie).not.toHaveBeenCalled()
  })

  it('uses a valid Bearer identity over a valid cookie and warns once without token contents', async () => {
    setHeaders({ authorization: 'Bearer bearer-access-token' })
    mockAccessAuth.mockResolvedValueOnce(bearerUser)
    mockGetCookie.mockReturnValueOnce('cookie-access').mockReturnValueOnce('cookie-refresh')

    const { default: auth } = await import('~/server/middleware/auth')
    const request = event()
    await auth(request)

    expect(request.context.auth).toEqual({ transport: 'bearer', user: bearerUser })
    expect(request.context.user).toEqual(bearerUser)
    expect(mockWarn).toHaveBeenCalledTimes(1)
    expect(JSON.stringify(mockWarn.mock.calls[0])).not.toContain('bearer-access-token')
    expect(JSON.stringify(mockWarn.mock.calls[0])).not.toContain('cookie-access')
  })

  it('stores a verified API key in auth without granting unrestricted user compatibility', async () => {
    setHeaders({ 'x-api-key': 'dva_valid-key' })
    mockApiKeyAuth.mockResolvedValueOnce(apiKeyAuth)
    mockGetCookie.mockReturnValue(undefined)

    const { default: auth } = await import('~/server/middleware/auth')
    const request = event()
    await auth(request)

    expect(request.context.auth).toEqual({
      transport: 'api-key',
      user: apiKeyAuth.user,
      apiKey: apiKeyAuth,
    })
    expect(request.context.user).toBeUndefined()
  })

  it('uses a valid API key over a valid cookie', async () => {
    setHeaders({ 'x-api-key': 'dva_valid-key' })
    mockApiKeyAuth.mockResolvedValueOnce(apiKeyAuth)
    mockGetCookie.mockReturnValueOnce('cookie-access').mockReturnValueOnce('cookie-refresh')

    const { default: auth } = await import('~/server/middleware/auth')
    const request = event()
    await auth(request)

    expect(request.context.auth).toMatchObject({ transport: 'api-key', user: apiKeyAuth.user })
    expect(mockWarn).toHaveBeenCalledTimes(1)
  })

  it('rejects invalid explicit credentials on public API routes', async () => {
    setPath('/api/blog')
    setHeaders({ authorization: 'Bearer invalid-access-token' })
    mockAccessAuth.mockRejectedValueOnce(new Error('invalid access token'))

    const { default: auth } = await import('~/server/middleware/auth')
    await expect(auth(event())).rejects.toMatchObject({ statusCode: 401 })
  })

  it('authenticates a Bearer access token through GET /api/auth/me', async () => {
    setPath('/api/auth/me')
    setHeaders({ authorization: 'Bearer bearer-access-token' })
    mockAccessAuth.mockResolvedValueOnce(bearerUser)

    const { default: auth } = await import('~/server/middleware/auth')
    const request = event()
    await auth(request)

    const { default: me } = await import('~/server/api/auth/me.get')
    const result = await me(request)

    expect(result).toMatchObject({ ok: true })
    expect(result.data.email).toBe(bearerUser.email)
  })
})

describe('auth and csrf middleware ordering', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setPath('/api/diaries')
    mockGetCookie.mockReset()
    mockGetHeader.mockReset()
    mockAccessAuth.mockRejectedValue(new Error('invalid access token'))
    setHeaders({ authorization: 'Bearer invalid-access-token' })
  })

  it('resolves auth before CSRF even when the middleware handlers are invoked in reverse order', async () => {
    const { default: csrf } = await import('~/server/middleware/csrf')

    await expect(csrf(event())).rejects.toMatchObject({ statusCode: 401 })

    expect(mockGetCookie).not.toHaveBeenCalled()
  })

  it('does not let an invalid Bearer credential fall back to a valid cookie for CSRF', async () => {
    mockGetCookie.mockReturnValue('valid-cookie')

    const { default: csrf } = await import('~/server/middleware/csrf')

    await expect(csrf(event())).rejects.toMatchObject({ statusCode: 401 })
    expect(mockGetCookie).not.toHaveBeenCalled()
  })
})
