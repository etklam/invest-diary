import { signAccessToken } from '~/lib/jwt'
import { setAccessTokenCookie } from '~/server/utils/auth'
import { authenticateAccessToken, authenticateRefreshToken } from '~/server/utils/auth-session'
import { logger } from '~/lib/logger'

/**
 * Global API authentication middleware
 * - Checks access-token cookie first, falls back to auth-token for backward compatibility
 * - All protected APIs rely on event.context.user
 */
export default defineEventHandler(async (event) => {
  const url = getRequestURL(event)
  const log = logger.auth

  // Only parse auth for API routes
  if (!url.pathname.startsWith('/api/')) return

  // Try new access token first, then fall back to legacy token
  const accessToken = getCookie(event, 'access-token')
  const legacyToken = getCookie(event, 'auth-token')
  const refreshToken = getCookie(event, 'refresh-token')
  const token = accessToken || legacyToken

  if (!token && !refreshToken) {
    event.context.user = undefined
    return
  }

  if (token) {
    try {
      const user = await authenticateAccessToken(token)
      if (user) {
        event.context.user = user
        return
      }
      // access token parsed but validation returned null (tokenVersion mismatch)
      log.warn('Access token validation returned null, falling back to refresh token', {
        path: url.pathname,
      })
    } catch (error) {
      // access token expired or invalid — fall through to refresh-token recovery
      log.debug('Access token verification failed, falling back to refresh token', {
        path: url.pathname,
        error: String(error),
      })
    }
  }

  if (!refreshToken) {
    event.context.user = undefined
    return
  }

  try {
    const refreshSession = await authenticateRefreshToken(refreshToken)
    if (!refreshSession) {
      log.warn('Refresh token validation returned null', { path: url.pathname })
      event.context.user = undefined
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

    event.context.user = refreshSession.sessionUser
  } catch (error) {
    log.error('Refresh token recovery failed', {
      path: url.pathname,
      error: String(error),
    })
    event.context.user = undefined
  }
})

// Extend H3Event type to include user context
declare module 'h3' {
  interface H3EventContext {
    user?: {
      id: string
      email: string
      role: string
    }
  }
}
