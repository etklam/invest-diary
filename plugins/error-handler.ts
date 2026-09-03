import { isAuthSessionError } from '~/lib/auth/session-error'

export default defineNuxtPlugin((nuxtApp) => {
  const { user } = useAuth()

  // Handle app errors globally
  nuxtApp.hook('app:error', async (error: Error | unknown) => {
    if (!isAuthSessionError(error)) return

    // `/api/**` has already attempted access→WEB-refresh recovery in the
    // server middleware. An auth error here is terminal for this session.
    user.value = null

    const route = useRoute()
    if (route.meta?.requiresAuth !== false) {
      await navigateTo('/auth/login')
    }
  })
})
