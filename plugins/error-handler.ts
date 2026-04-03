import { isAuthSessionError, isUnauthorizedStatus } from '~/lib/auth/session-error'

export default defineNuxtPlugin((nuxtApp) => {
  const { user, refreshAccessToken } = useAuth()

  // Track if we've already attempted a refresh to prevent infinite loops
  let hasAttemptedRefresh = false

  // Handle app errors globally
  nuxtApp.hook('app:error', async (error: Error | unknown) => {
    // Handle 401 Unauthorized errors
    if (isUnauthorizedStatus(error)) {
      if (!isAuthSessionError(error)) {
        hasAttemptedRefresh = false
        return
      }

      // First, try to refresh the token
      if (!hasAttemptedRefresh) {
        hasAttemptedRefresh = true

        const refreshed = await refreshAccessToken()

        if (refreshed) {
          // Refresh successful - reset flag and allow the operation to be retried
          hasAttemptedRefresh = false
          return
        }
      }

      // Refresh failed or wasn't possible - clear user state and redirect
      user.value = null
      hasAttemptedRefresh = false

      // Check if current route is public before redirecting
      const route = useRoute()
      const isPublicRoute = route.meta?.requiresAuth === false

      // Only redirect if not on a public route
      if (!isPublicRoute) {
        await navigateTo('/auth/login')
      }
    } else {
      // Reset the flag on non-401 errors
      hasAttemptedRefresh = false
    }
  })
})
