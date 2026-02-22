import { verifyToken, signAccessToken, signRefreshToken } from '~/lib/jwt'
import prisma from '~/lib/prisma'
import { setAccessTokenCookie } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const refreshToken = getCookie(event, 'refresh-token')

  if (!refreshToken) {
    throw createError({
      statusCode: 401,
      statusMessage: 'No refresh token provided'
    })
  }

  try {
    // Verify the refresh token
    const payload = await verifyToken(refreshToken)

    // Make sure it's actually a refresh token
    if (payload.type !== 'refresh') {
      throw createError({
        statusCode: 401,
        statusMessage: 'Invalid token type'
      })
    }

    // Check if refresh token exists in database and is not expired
    // @ts-ignore Prisma model access
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true }
    })

    if (!storedToken) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Refresh token not found'
      })
    }

    // Check if token is expired
    if (storedToken.expiresAt < new Date()) {
      // Delete expired token
      // @ts-ignore Prisma model access
      await prisma.refreshToken.delete({
        where: { token: refreshToken }
      })

      throw createError({
        statusCode: 401,
        statusMessage: 'Refresh token expired'
      })
    }

    // Check if user's token version has changed (logout/password change)
    const user = storedToken.user
    if ((user.tokenVersion || 0) !== payload.tokenVersion) {
      // Delete the token
      // @ts-ignore Prisma model access
      await prisma.refreshToken.delete({
        where: { token: refreshToken }
      })

      throw createError({
        statusCode: 401,
        statusMessage: 'Token has been revoked'
      })
    }

    // Generate new access token
    const newAccessToken = await signAccessToken(
      user.id.toString(),
      user.email,
      (user as any).role,
      user.tokenVersion || 0
    )

    // Optional: Rotate refresh token for better security
    const newRefreshToken = await signRefreshToken(
      user.id.toString(),
      user.email,
      (user as any).role,
      user.tokenVersion || 0
    )

    // Delete old refresh token and create new one
    // @ts-ignore Prisma model access
    await prisma.refreshToken.delete({
      where: { token: refreshToken }
    })

    // @ts-ignore Prisma model access
    await prisma.refreshToken.create({
      data: {
        token: newRefreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      }
    })

    // Set new access token cookie
    setAccessTokenCookie(event, newAccessToken)

    // Set new refresh token cookie
    setCookie(event, 'refresh-token', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/'
    })

    return {
      ok: true
    }
  } catch (error: any) {
    // If it's a H3 error, re-throw it
    if (error.statusCode) {
      throw error
    }

    // Log other errors but return generic message
    console.error('Token refresh error:', error)
    throw createError({
      statusCode: 401,
      statusMessage: 'Invalid refresh token'
    })
  }
})
