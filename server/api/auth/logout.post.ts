import { clearAuthCookies } from '~/server/utils/auth'
import { deleteStoredRefreshToken } from '~/server/utils/auth-session'
import { logger } from '~/lib/logger'
import { formatErrorContext } from '~/lib/error-context'

export default defineEventHandler(async (event) => {
  const log = logger.auth.withRequestId(event.context.requestId)
  const transport = event.context.auth?.transport
  // An explicit Bearer/API-key request must not mutate a browser session that
  // happened to be sent alongside it. Direct handler calls without middleware
  // context retain the legacy cookie logout behavior.
  const isCookieSession = transport === undefined || transport === 'cookie'
  const refreshToken = isCookieSession ? getCookie(event, 'refresh-token') : undefined

  // Delete refresh token from database if it exists
  if (isCookieSession && refreshToken && event.context.user) {
    try {
      await deleteStoredRefreshToken(refreshToken, BigInt(event.context.user.id))
    } catch (error) {
      // Log but don't throw - logout should succeed even if db cleanup fails
      log.error('Error deleting refresh token', {
        operation: 'auth_logout_cleanup',
        userId: event.context.user.id,
        ...formatErrorContext(error),
      })
    }
  }

  // Clear browser cookies only for cookie/anonymous logout. Explicit clients
  // own their bearer credentials and must not clear another session's jar.
  if (isCookieSession) clearAuthCookies(event)

  return {
    ok: true
  }
})
