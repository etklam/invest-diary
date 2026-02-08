export default defineEventHandler(async (event) => {
  // Clear auth cookie
  deleteCookie(event, 'auth-token')

  console.log('[API] User logged out')

  return {
    success: true,
    message: 'Logged out successfully'
  }
})
