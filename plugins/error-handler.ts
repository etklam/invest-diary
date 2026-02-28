export default defineNuxtPlugin((nuxtApp) => {
  const { user, refreshAccessToken } = useAuth()

  // Track if we've already attempted a refresh to prevent infinite loops
  let hasAttemptedRefresh = false
  const authSessionErrorCodes = new Set([
    'AUTH_UNAUTHORIZED',
    'AUTH_TOKEN_EXPIRED',
    'AUTH_TOKEN_INVALID',
    'AUTH_TOKEN_NOT_FOUND',
    'AUTH_TOKEN_REVOKED',
    'AUTH_NO_REFRESH_TOKEN'
  ])

  const extractErrorCode = (error: any): string | undefined => {
    return error?.data?.code || error?.response?._data?.data?.code || error?.response?._data?.code
  }

  const extractStatusMessage = (error: any): string => {
    return String(
      error?.statusMessage ||
      error?.data?.statusMessage ||
      error?.response?._data?.statusMessage ||
      ''
    )
  }

  const shouldHandle401 = (error: any): boolean => {
    const code = extractErrorCode(error)
    if (code) return authSessionErrorCodes.has(code)

    const message = extractStatusMessage(error)
    return [
      'UNAUTHORIZED',
      'Unauthorized',
      'Authentication required',
      'Token expired',
      'Invalid token',
      'Token not found',
      'Token has been revoked',
      'No refresh token provided'
    ].includes(message)
  }

  // Handle app errors globally
  nuxtApp.hook('app:error', async (error: any) => {
    // Handle 401 Unauthorized errors
    if (error?.statusCode === 401 || error?.response?.status === 401) {
      if (!shouldHandle401(error)) {
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
