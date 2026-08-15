import authMiddleware from '~/server/middleware/auth'
import { Errors } from '~/lib/errors/factory'

/**
 * Global admin guard for admin APIs and blog write routes.
 *
 * This is the single owner of the admin-protected route definition. Handlers
 * under these routes must not call this middleware again.
 */
export default defineEventHandler(async (event) => {
  const url = getRequestURL(event)
  const path = url.pathname
  const method = event.method?.toUpperCase() || 'GET'

  const isBlogWriteRoute = (
    (path === '/api/blog' && method === 'POST')
    || (/^\/api\/blog\/[^/]+$/.test(path) && ['PUT', 'PATCH', 'DELETE'].includes(method))
    || path === '/api/blog/admin'
    || path.startsWith('/api/blog/admin/')
  )
  const isAdminRoute = path === '/api/admin' || path.startsWith('/api/admin/')
  const isProtectedRoute = isAdminRoute || isBlogWriteRoute
  if (!isProtectedRoute) return

  // 防止保護路由被誤快取（例如 401/403 被 CDN 或瀏覽器快取）
  setHeader(event, 'Cache-Control', 'no-store')

  // 若全域執行順序早於 auth middleware，這裡補跑一次 auth 以取得 user context。
  if (!event.context.user) {
    await authMiddleware(event)
  }

  const user = event.context.user
  if (!user) {
    throw Errors.unauthorized().toH3Error()
  }

  if (user.role !== 'ADMIN') {
    throw Errors.forbidden().toH3Error()
  }
})
