import { Errors } from '~/lib/errors/factory'

/**
 * Admin authorization middleware
 * Must be used after auth middleware
 * Throws 401 if unauthenticated, 403 if user is not admin
 *
 * NOTE: This only applies to /api/admin/** routes to avoid blocking public pages
 */
export default defineEventHandler(async (event) => {
  const url = getRequestURL(event)

  // Only apply admin check to admin routes
  if (!url.pathname.startsWith('/api/admin')) return

  const user = event.context.user

  if (!user) {
    throw Errors.unauthorized().toH3Error()
  }

  if (user.role !== 'ADMIN') {
    throw Errors.forbidden().toH3Error()
  }
})
