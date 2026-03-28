import { clearAuthCookies } from '~/server/utils/auth'
import { deleteStoredRefreshToken } from '~/server/utils/auth-session'
import { logger } from '~/lib/logger'

export default defineEventHandler(async (event) => {
  const log = logger.auth.withRequestId(event.context.requestId)
  // Get the refresh token from cookie
  const refreshToken = getCookie(event, 'refresh-token')

  // Delete refresh token from database if it exists
  if (refreshToken && event.context.user) {
    try {
      await deleteStoredRefreshToken(refreshToken, BigInt(event.context.user.id))
    } catch (error) {
      // Log but don't throw - logout should succeed even if db cleanup fails
      log.error('Error deleting refresh token', {
        userId: event.context.user.id,
        error: String(error),
      })
    }
  }

  // Clear all auth cookies (both old and new)
  clearAuthCookies(event)

  return {
    ok: true
  }
})
