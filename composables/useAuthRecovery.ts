import { isAuthSessionError } from '~/lib/auth/session-error'

export const useAuthRecovery = () => {
  const { user, refreshAccessToken } = useAuth()

  const redirectToLogin = async () => {
    const route = useRoute()
    if (route.meta?.requiresAuth === false) return
    await navigateTo('/auth/login')
  }

  const runWithAuthRecovery = async <T>(
    operation: () => Promise<T>,
    hasRetried = false,
  ): Promise<T> => {
    try {
      return await operation()
    } catch (error) {
      if (isAuthSessionError(error)) {
        if (!hasRetried) {
          const refreshed = await refreshAccessToken()
          if (refreshed) {
            return runWithAuthRecovery(operation, true)
          }
        }

        user.value = null
        await redirectToLogin()
      }

      throw error
    }
  }

  return {
    runWithAuthRecovery,
  }
}
