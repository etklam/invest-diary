/**
 * Admin route middleware
 * Protects admin routes by checking if user is authenticated and has ADMIN role
 */
export default defineNuxtRouteMiddleware(async (to) => {
  // Only protect admin routes
  if (!to.path.startsWith('/admin')) {
    return
  }

  const { isAuthenticated, isAdmin, fetchMe } = useAuth()

  // Fetch current user info
  await fetchMe()

  // Check if user is authenticated
  if (!isAuthenticated.value) {
    return navigateTo('/auth/login')
  }

  // Check if user is admin
  if (!isAdmin.value) {
    return navigateTo('/')
  }
})
