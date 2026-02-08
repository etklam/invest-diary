export default defineNuxtPlugin((nuxtApp) => {
  const { user } = useAuth()

  // Handle app errors globally
  nuxtApp.hook('app:error', async (error) => {
    // Handle 401 Unauthorized errors
    if (error?.statusCode === 401 || error?.response?.status === 401) {
      // Clear user state
      user.value = null
      // ✅ 未授權一律導向登入頁，避免顯示 500 畫面
      await navigateTo('/auth/login')
    }
  })
})
