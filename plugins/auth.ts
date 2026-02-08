export default defineNuxtPlugin(async () => {
  const { fetchMe } = useAuth()

  // Initialize auth state when app starts
  // This ensures we know if user is authenticated before any middleware runs
  await fetchMe()
})
