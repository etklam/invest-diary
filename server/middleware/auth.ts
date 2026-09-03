import { signAccessToken } from '~/lib/jwt'
import { setAccessTokenCookie } from '~/server/utils/auth'
import { authenticateAccessToken, authenticateRefreshToken } from '~/server/utils/auth-session'
import { API_KEY_TOKEN_PREFIX, authenticateApiKey, type ApiKeyAuthResult } from '~/server/utils/api-key'
import { Errors } from '~/lib/errors/factory'
import { logger } from '~/lib/logger'
import type { H3Event } from 'h3'

export type AuthTransport = 'cookie' | 'bearer' | 'api-key'

export interface AuthContext {
  transport: AuthTransport
  user: {
    id: string
    email: string
    role: string
  }
  apiKey?: ApiKeyAuthResult
}

function hasHeader(value: string | null | undefined): value is string {
  return value !== undefined && value !== null
}

function parseBearerCredential(value: string): { kind: 'api-key' | 'jwt'; token: string } | null {
  const match = /^Bearer\s+(.+)$/i.exec(value)
  if (!match?.[1]) return null

  const token = match[1].trim()
  if (!token) return null

  return token.startsWith(API_KEY_TOKEN_PREFIX)
    ? { kind: 'api-key', token }
    : { kind: 'jwt', token }
}

function clearAuthContext(event: H3Event) {
  event.context.auth = undefined
  event.context.user = undefined
}

function setAuthContext(
  event: H3Event,
  transport: AuthTransport,
  user: AuthContext['user'],
  apiKey?: ApiKeyAuthResult,
) {
  event.context.auth = {
    transport,
    user,
    ...(apiKey ? { apiKey } : {}),
  }

  // API keys remain restricted to handlers that explicitly enforce their scope.
  if (transport !== 'api-key') {
    event.context.user = user
  }
}

function rejectExplicitCredential(): never {
  throw Errors.tokenInvalid().toH3Error()
}

async function authenticateExplicitCredential(
  event: H3Event,
  authHeader: string | null | undefined,
  apiKeyHeader: string | null | undefined,
  path: string,
) {
  const explicitSources = [
    hasHeader(authHeader) ? 'authorization' : null,
    hasHeader(apiKeyHeader) ? 'x-api-key' : null,
  ].filter((source): source is string => source !== null)

  if (explicitSources.length > 1) {
    rejectExplicitCredential()
  }

  if (explicitSources.length === 0) return false

  let transport: Extract<AuthTransport, 'bearer' | 'api-key'>
  let user: AuthContext['user']
  let apiKey: ApiKeyAuthResult | undefined

  try {
    if (explicitSources[0] === 'authorization') {
      const parsed = parseBearerCredential(authHeader!)
      if (!parsed) rejectExplicitCredential()

      if (parsed.kind === 'api-key') {
        apiKey = await authenticateApiKey(parsed.token)
        transport = 'api-key'
        user = apiKey.user
      } else {
        const authenticatedUser = await authenticateAccessToken(parsed.token)
        if (!authenticatedUser) rejectExplicitCredential()
        transport = 'bearer'
        user = authenticatedUser
      }
    } else {
      const rawKey = apiKeyHeader!.trim()
      if (!rawKey) rejectExplicitCredential()
      apiKey = await authenticateApiKey(rawKey)
      transport = 'api-key'
      user = apiKey.user
    }
  } catch {
    rejectExplicitCredential()
  }

  const accessToken = getCookie(event, 'access-token')
  const refreshToken = getCookie(event, 'refresh-token')
  if (accessToken || refreshToken) {
    logger.auth.warn('Explicit credential takes priority over cookie authentication', {
      path,
      transport,
      hasCookie: true,
    })
  }

  setAuthContext(event, transport!, user!, apiKey)
  return true
}

/** Resolve authentication once; csrf calls this too to make ordering explicit. */
export async function resolveAuth(event: H3Event) {
  const url = getRequestURL(event)
  const log = logger.auth

  if (!url.pathname.startsWith('/api/')) return
  if (event.context.authResolved) return

  event.context.authResolved = true
  clearAuthContext(event)

  const authHeader = getHeader(event, 'authorization')
  const apiKeyHeader = getHeader(event, 'x-api-key')
  if (await authenticateExplicitCredential(event, authHeader, apiKeyHeader, url.pathname)) return

  // The refresh endpoint owns the one WEB refresh-token lookup that issues a
  // replacement access cookie. Explicit credentials were already resolved
  // above, so the endpoint cannot accidentally fall back to an ambient cookie.
  if (url.pathname === '/api/auth/refresh') return

  const accessToken = getCookie(event, 'access-token')
  const refreshToken = getCookie(event, 'refresh-token')

  if (!accessToken && !refreshToken) return

  if (accessToken) {
    try {
      const user = await authenticateAccessToken(accessToken)
      if (user) {
        setAuthContext(event, 'cookie', user)
        return
      }
      log.warn('Access token validation returned null, falling back to refresh token', {
        path: url.pathname,
      })
    } catch (error) {
      log.debug('Access token verification failed, falling back to refresh token', {
        path: url.pathname,
        error: String(error),
      })
    }
  }

  if (!refreshToken) return

  try {
    const refreshSession = await authenticateRefreshToken(refreshToken, 'WEB')
    if (!refreshSession) {
      log.warn('Refresh token validation returned null', { path: url.pathname })
      return
    }

    const user = refreshSession.storedToken.user
    const newAccessToken = await signAccessToken(
      user.id.toString(),
      user.email,
      user.role,
      user.tokenVersion
    )
    setAccessTokenCookie(event, newAccessToken)
    setAuthContext(event, 'cookie', refreshSession.sessionUser)
  } catch (error) {
    log.error('Refresh token recovery failed', {
      path: url.pathname,
      error: String(error),
    })
  }
}

/**
 * Global API authentication middleware
 * - Resolves explicit credentials before ambient cookies (fail-closed)
 * - Cookie access-token → refresh-token recovery remains transparent
 * - Web/JWT callers rely on event.context.user; API keys retain handler scopes
 */
export default defineEventHandler(async (event) => {
  await resolveAuth(event)
})

// Extend H3Event type to include user context
declare module 'h3' {
  interface H3EventContext {
    auth?: AuthContext
    authResolved?: boolean
    user?: {
      id: string
      email: string
      role: string
    }
  }
}
