import authMiddleware from '~/server/middleware/auth'
import { Errors } from '~/lib/errors/factory'

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

  // 此 middleware 同時被作為 Nitro 全域 middleware 與 handler 內部 guard 使用。
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
