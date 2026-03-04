import { signAccessToken, verifyToken } from '~/lib/jwt'
import prisma from '~/lib/prisma'
import { setAccessTokenCookie } from '~/server/utils/auth'

/**
 * Global API authentication middleware
 * - Checks access-token cookie first, falls back to auth-token for backward compatibility
 * - All protected APIs rely on event.context.user
 */
export default defineEventHandler(async (event) => {
  const url = getRequestURL(event)

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

  const resolveUserFromPayload = async (payload: any) => {
    const user = await prisma.user.findUnique({
      where: { id: BigInt(payload.userId) },
      select: {
        id: true,
        email: true,
        role: true,
        tokenVersion: true
      }
    })

    if (!user || (user.tokenVersion || 0) !== (payload.tokenVersion || 0)) {
      return undefined
    }

    return user
  }

  if (token) {
    try {
      const payload = await verifyToken(token)

      // Refresh tokens should not be used for API requests
      if (payload.type === 'refresh') {
        event.context.user = undefined
        return
      }

      const user = await resolveUserFromPayload(payload)
      if (!user) {
        event.context.user = undefined
        return
      }

      event.context.user = {
        id: user.id.toString(),
        email: user.email,
        role: user.role
      }
      return
    } catch {
      // Fall through to refresh-token recovery path.
    }
  }

  if (!refreshToken) {
    event.context.user = undefined
    return
  }

  try {
    const refreshPayload = await verifyToken(refreshToken)
    if (refreshPayload.type !== 'refresh') {
      event.context.user = undefined
      return
    }

    // Refresh token must still be present in DB and not expired.
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true }
    })

    if (!storedToken || storedToken.expiresAt < new Date()) {
      event.context.user = undefined
      return
    }

    const user = storedToken.user
    if ((user.tokenVersion || 0) !== (refreshPayload.tokenVersion || 0)) {
      event.context.user = undefined
      return
    }

    const newAccessToken = await signAccessToken(
      user.id.toString(),
      user.email,
      user.role,
      user.tokenVersion || 0
    )
    setAccessTokenCookie(event, newAccessToken)

    event.context.user = {
      id: user.id.toString(),
      email: user.email,
      role: user.role
    }
  } catch {
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
