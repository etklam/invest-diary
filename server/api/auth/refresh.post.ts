import {
  verifyToken,
  signAccessToken
} from '~/lib/jwt'
import prisma from '~/lib/prisma'
import { setAccessTokenCookie } from '~/server/utils/auth'
import { logger } from '~/lib/logger'
import { Errors, AppError } from '~/lib/errors/factory'

export default defineEventHandler(async (event) => {
  const log = logger.auth.withRequestId(event.context.requestId)
  const refreshToken = getCookie(event, 'refresh-token')

  if (!refreshToken) {
    throw Errors.noRefreshToken().toH3Error()
  }

  try {
    // Verify the refresh token
    const payload = await verifyToken(refreshToken)

    // Make sure it's actually a refresh token
    if (payload.type !== 'refresh') {
      throw Errors.tokenInvalid().toH3Error()
    }

    // Check if refresh token exists in database and is not expired
    // @ts-ignore Prisma model access
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true }
    })

    if (!storedToken) {
      throw Errors.tokenNotFound().toH3Error()
    }

    // Check if token is expired
    if (storedToken.expiresAt < new Date()) {
      // Delete expired token
      // @ts-ignore Prisma model access
      await prisma.refreshToken.delete({
        where: { token: refreshToken }
      })

      throw Errors.tokenExpired().toH3Error()
    }

    // Check if user's token version has changed (logout/password change)
    const user = storedToken.user
    if ((user.tokenVersion || 0) !== payload.tokenVersion) {
      // Delete the token
      // @ts-ignore Prisma model access
      await prisma.refreshToken.delete({
        where: { token: refreshToken }
      })

      throw Errors.tokenRevoked().toH3Error()
    }

    // Generate new access token
    const newAccessToken = await signAccessToken(
      user.id.toString(),
      user.email,
      (user as any).role,
      user.tokenVersion || 0
    )

    // Set new access token cookie only.
    // Keep refresh token stable to avoid cross-tab refresh races causing forced logout.
    setAccessTokenCookie(event, newAccessToken)

    log.info('Token refreshed', { userId: user.id.toString() })
    return { ok: true }
  } catch (error: any) {
    if (error instanceof AppError) {
      throw error.toH3Error()
    }
    if (error.statusCode) {
      throw error
    }
    log.error('Token refresh error', { error: String(error) })
    throw Errors.tokenInvalid().toH3Error()
  }
})
