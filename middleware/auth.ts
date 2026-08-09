import { AUTHENTICATED_HOME_ROUTE } from '~/lib/routes'

export default defineNuxtRouteMiddleware((to) => {
  const { isAuthenticated, isInitialized } = useAuth()

  const publicRoutes = ['/auth/login', '/auth/register']

  // Check if the route is blog-related (public)
  const isBlogRoute = to.path.startsWith('/articles')

  // Check route meta for requiresAuth
  const metaRequiresAuth = to.meta.requiresAuth
  const isPublicByMeta = metaRequiresAuth === false

  // Determine if route is public
  const isPublicRoute = isPublicByMeta || publicRoutes.includes(to.path) || isBlogRoute

  // Wait for auth to be initialized before making decisions
  if (!isInitialized.value) {
    // Don't redirect yet, let the auth plugin finish initializing
    return
  }

  // Redirect unauthenticated users from protected routes
  if (!isAuthenticated.value && !isPublicRoute) {
    return navigateTo('/auth/login')
  }

  // Authenticated users return to their chronological workspace.
  if (isAuthenticated.value && (to.path === '/' || publicRoutes.includes(to.path))) {
    return navigateTo(AUTHENTICATED_HOME_ROUTE)
  }
})
