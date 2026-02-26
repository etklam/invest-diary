/**
 * Admin authorization middleware
 * Must be used after auth middleware
 * Throws 401 if unauthenticated, 403 if user is not admin
 */
export default defineEventHandler(async (event) => {
  const user = event.context.user

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'UNAUTHORIZED'
    })
  }

  if (user.role !== 'ADMIN') {
    throw createError({
      statusCode: 403,
      statusMessage: 'ADMIN_ONLY'
    })
  }
})
