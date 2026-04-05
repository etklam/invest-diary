const publicRoutes = new Set(['/auth/login', '/auth/register'])

const isPublicRoute = (path: string, requiresAuth: unknown) => {
  if (requiresAuth === false) return true
  return publicRoutes.has(path) || path.startsWith('/articles')
}

const hasServerAuthCookies = () => {
  if (!process.server) return false

  const cookieHeader = useRequestHeaders(['cookie']).cookie ?? ''
  return cookieHeader.includes('access-token=')
    || cookieHeader.includes('refresh-token=')
    || cookieHeader.includes('auth-token=')
}

export default defineNuxtPlugin(async () => {
  const { fetchMe, isInitialized } = useAuth()
  const route = useRoute()

  if (isInitialized.value) return

  const shouldFetchSession = !isPublicRoute(route.path, route.meta?.requiresAuth)
    || hasServerAuthCookies()

  // Public pages without auth cookies should not spam fetch/refresh during bootstrap.
  if (!shouldFetchSession) {
    isInitialized.value = true
    return
  }

  await fetchMe()
})
