import { clearAuthCookies } from '~/server/utils/auth'
import { deleteStoredRefreshToken } from '~/server/utils/auth-session'

export default defineEventHandler(async (event) => {
  // Get the refresh token from cookie
  const refreshToken = getCookie(event, 'refresh-token')

  // Delete refresh token from database if it exists
  if (refreshToken && event.context.user) {
    try {
      await deleteStoredRefreshToken(refreshToken, BigInt(event.context.user.id))
    } catch (error) {
      // Log but don't throw - logout should succeed even if db cleanup fails
      console.error('Error deleting refresh token:', error)
    }
  }

  // Clear all auth cookies (both old and new)
  clearAuthCookies(event)

  return {
    ok: true
  }
})
