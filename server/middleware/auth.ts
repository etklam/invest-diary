import { verifyToken } from '~/lib/jwt'

/**
 * Global API authentication middleware
 * - Server is the single source of truth
 * - All protected APIs rely on event.context.user
 */
export default defineEventHandler(async (event) => {
  const url = getRequestURL(event)

  // Only parse auth for API routes
  if (!url.pathname.startsWith('/api/')) return

  const token = getCookie(event, 'auth-token')
  if (!token) {
    event.context.user = undefined
    return
  }

  try {
    const payload = await verifyToken(token)

    event.context.user = {
      id: payload.userId,
      email: payload.email,
      role: payload.role
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
