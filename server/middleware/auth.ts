import { verifyToken } from '~/lib/jwt'

/**
 * Global API authentication middleware
 * - Server is the single source of truth
 * - All protected APIs rely on event.context.user
 */
export default defineEventHandler(async (event) => {
  const url = getRequestURL(event)

  // Only guard API routes
  if (!url.pathname.startsWith('/api/')) return

  // Public API routes
  if (
    url.pathname.startsWith('/api/auth') ||
    url.pathname.startsWith('/api/health')
  ) {
    return
  }

  const token = getCookie(event, 'auth-token')
  if (!token) {
    throw createError({ statusCode: 401 })
  }

  try {
    const payload = await verifyToken(token)

    event.context.user = {
      id: payload.userId,
      email: payload.email,
      tokenVersion: payload.tokenVersion
    }
  } catch {
    throw createError({ statusCode: 401 })
  }
})

// Extend H3Event type to include user context
declare module 'h3' {
  interface H3EventContext {
    user?: {
      id: string
      email: string
    }
  }
}
