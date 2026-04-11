/**
 * Backward-compatible admin middleware.
 *
 * Used by many handlers via `~/server/middleware/admin`.
 * We only enforce checks on known admin-protected route families.
 */
export default defineEventHandler(async (event) => {
  const url = getRequestURL(event)
  const path = url.pathname

  const isProtectedRoute = path.startsWith('/api/admin') || path.startsWith('/api/blog')
  if (!isProtectedRoute) return

  const user = event.context.user
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'UNAUTHORIZED',
    })
  }

  if (user.role !== 'ADMIN') {
    throw createError({
      statusCode: 403,
      statusMessage: 'ADMIN_ONLY',
    })
  }
})
