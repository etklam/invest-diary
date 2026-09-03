import { isAuthSessionError } from '~/lib/auth/session-error'

export const useAuthRecovery = () => {
  const { user } = useAuth()
  const route = useRoute()
  const router = useRouter()

  const redirectToLogin = async () => {
    if (route.meta?.requiresAuth === false) return
    await router.push('/auth/login')
  }

  const runWithAuthRecovery = async <T>(
    operation: () => Promise<T>,
  ): Promise<T> => {
    try {
      return await operation()
    } catch (error) {
      if (isAuthSessionError(error)) {
        // Every `/api/**` request is resolved by the server middleware. A
        // session error here means that both access and refresh credentials
        // were rejected; another client refresh/retry would only race the
        // canonical resolver.
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
