import {
  signAccessToken
} from '~/lib/jwt'
import { setAccessTokenCookie } from '~/server/utils/auth'
import { logger } from '~/lib/logger'
import { Errors, AppError } from '~/lib/errors/factory'
import { authenticateRefreshToken, deleteStoredRefreshToken } from '~/server/utils/auth-session'

export default defineEventHandler(async (event) => {
  const log = logger.auth.withRequestId(event.context.requestId)

  // `/api/auth/refresh` is a browser-cookie endpoint. If auth middleware
  // resolved an explicit Bearer/API-key credential, never let this handler
  // switch identity sources and refresh an ambient browser cookie instead.
  if (event.context.auth && event.context.auth.transport !== 'cookie') {
    throw Errors.tokenInvalid().toH3Error()
  }

  const refreshToken = getCookie(event, 'refresh-token')

  if (!refreshToken) {
    throw Errors.noRefreshToken().toH3Error()
  }

  try {
    const refreshSession = await authenticateRefreshToken(refreshToken, 'WEB')
    if (!refreshSession) {
      throw Errors.tokenNotFound().toH3Error()
    }

    const storedToken = refreshSession.storedToken
    if (storedToken.expiresAt < new Date()) {
      await deleteStoredRefreshToken(refreshToken)
      throw Errors.tokenExpired().toH3Error()
    }

    const user = storedToken.user

    // Generate new access token
    const newAccessToken = await signAccessToken(
      user.id.toString(),
      user.email,
      user.role,
      user.tokenVersion
    )

    // Set new access token cookie only.
    // Keep refresh token stable to avoid cross-tab refresh races causing forced logout.
    setAccessTokenCookie(event, newAccessToken)

    log.info('Token refreshed', { userId: String(user.id) })
    return { ok: true }
  } catch (error: unknown) {
    if (error instanceof AppError) {
      throw error.toH3Error()
    }
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }
    log.error('Token refresh error', { error: String(error) })
    throw Errors.tokenInvalid().toH3Error()
  }
})
