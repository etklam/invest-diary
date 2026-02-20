import { clearAuthCookies } from '~/server/utils/auth'
import prisma from '~/lib/prisma'

export default defineEventHandler(async (event) => {
  // Get the refresh token from cookie
  const refreshToken = getCookie(event, 'refresh-token')

  // Delete refresh token from database if it exists
  if (refreshToken && event.context.user) {
    try {
      // @ts-ignore Prisma model access
      await prisma.refreshToken.deleteMany({
        where: {
          token: refreshToken,
          userId: BigInt(event.context.user.id)
        }
      })
    } catch (error) {
      // Log but don't throw - logout should succeed even if db cleanup fails
      console.error('Error deleting refresh token:', error)
    }
  }

  // Clear all auth cookies (both old and new)
  clearAuthCookies(event)

  return {
    ok: true
  }
})
