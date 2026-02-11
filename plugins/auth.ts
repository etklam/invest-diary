export default defineNuxtPlugin(async () => {
  // ✅ Only initialize auth on client to avoid SSR/client mismatch
  if (process.client) {
    const { fetchMe } = useAuth()
    // ✅ Ensure auth state is fully resolved before middleware logic
    await fetchMe()
  }
})
