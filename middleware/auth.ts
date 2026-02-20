export default defineNuxtRouteMiddleware((to) => {
  const { isAuthenticated, isInitialized } = useAuth()

  const publicRoutes = ['/auth/login', '/auth/register']

  // Check if the route is blog-related (public)
  const isBlogRoute = to.path.startsWith('/blog')

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

  // If authenticated user tries to access auth pages, redirect to calendar
  if (isAuthenticated.value && publicRoutes.includes(to.path)) {
    return navigateTo('/calendar')
  }
})
