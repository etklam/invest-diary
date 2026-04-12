/**
 * Backward-compatible admin middleware.
 *
 * Used by many handlers via `~/server/middleware/admin`.
 * We only enforce checks on known admin-protected route families.
 */
export default defineEventHandler(async (event) => {
  const url = getRequestURL(event)
  const path = url.pathname
  const method = event.method?.toUpperCase() || 'GET'

  const isBlogWriteRoute = (
    (path === '/api/blog' && method === 'POST')
    || (/^\/api\/blog\/[^/]+$/.test(path) && ['PUT', 'PATCH', 'DELETE'].includes(method))
    || path.startsWith('/api/blog/admin')
  )
  const isProtectedRoute = path.startsWith('/api/admin') || isBlogWriteRoute
  if (!isProtectedRoute) return

  // 防止保護路由被誤快取（例如 401/403 被 CDN 或瀏覽器快取）
  setHeader(event, 'Cache-Control', 'no-store')

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
