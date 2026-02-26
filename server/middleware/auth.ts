import { verifyToken } from '~/lib/jwt'
import prisma from '~/lib/prisma'

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
  const token = accessToken || legacyToken

  if (!token) {
    event.context.user = undefined
    return
  }

  try {
    const payload = await verifyToken(token)

    // Verify token type if it's a new token
    if (payload.type === 'refresh') {
      // Refresh tokens should not be used for API requests
      event.context.user = undefined
      return
    }

    // Enforce tokenVersion check so password change/logout can immediately revoke access tokens
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
      event.context.user = undefined
      return
    }

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
