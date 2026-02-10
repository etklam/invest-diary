/**
 * Admin authorization middleware
 * Must be used after auth middleware
 * Throws 403 if user is not admin
 */
export default defineEventHandler(async (event) => {
  const user = event.context.user

  // 若尚未登入，交由實際 API / page 決定是否需要登入
  if (!user) return

  if (user.role !== 'ADMIN') {
    throw createError({
      statusCode: 403,
      statusMessage: 'ADMIN_ONLY'
    })
  }
})
