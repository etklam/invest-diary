export default defineNuxtRouteMiddleware((to) => {
  const { isAuthenticated, isInitialized } = useAuth()

  const publicRoutes = ['/auth/login', '/auth/register']
  
  // Check if the route is blog-related (public)
  const isBlogRoute = to.path.startsWith('/blog')

  // Wait for auth to be initialized before making decisions
  if (!isInitialized.value) {
    // Don't redirect yet, let the auth plugin finish initializing
    return
  }

  if (!isAuthenticated.value && !publicRoutes.includes(to.path) && !isBlogRoute) {
    return navigateTo('/auth/login')
  }

  // If authenticated user tries to access auth pages, redirect to calendar instead of home
  // to avoid the redirect loop from home -> calendar
  if (isAuthenticated.value && publicRoutes.includes(to.path)) {
    return navigateTo('/calendar')
  }
})
