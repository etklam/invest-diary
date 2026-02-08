export default defineNuxtRouteMiddleware((to) => {
  const { isAuthenticated } = useAuth()

  const publicRoutes = ['/auth/login', '/auth/register']

  if (!isAuthenticated.value && !publicRoutes.includes(to.path)) {
    return navigateTo('/auth/login')
  }

  if (isAuthenticated.value && publicRoutes.includes(to.path)) {
    return navigateTo('/')
  }
})
