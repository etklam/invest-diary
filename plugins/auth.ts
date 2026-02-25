export default defineNuxtPlugin(async () => {
  const { fetchMe, isInitialized } = useAuth()

  // Keep SSR/client initial auth state aligned to avoid hydration branch mismatch.
  if (!isInitialized.value) {
    await fetchMe()
  }
})
