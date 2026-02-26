import bcrypt from 'bcryptjs'
import { z } from 'zod'
import prisma from '../../../lib/prisma'
import { clearAuthCookies } from '~/server/utils/auth'

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters')
})

export default defineEventHandler(async (event) => {
  try {
    const userId = event.context.user?.id

    if (!userId) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized'
      })
    }

    const body = await readBody(event)

    // Validate input
    const validatedData = passwordSchema.parse(body)

    // Get user with password
    const user = await prisma.user.findUnique({
      where: { id: BigInt(userId) },
      select: {
        id: true,
        password: true
      }
    })

    if (!user) {
      throw createError({
        statusCode: 404,
        statusMessage: 'User not found'
      })
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(validatedData.currentPassword, user.password)

    if (!isValidPassword) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Current password is incorrect'
      })
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(validatedData.newPassword, 10)

    const userIdBigInt = BigInt(userId)

    // Update password and revoke all tokens atomically
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userIdBigInt },
        data: {
          password: hashedPassword,
          tokenVersion: { increment: 1 }
        }
      }),
      prisma.refreshToken.deleteMany({
        where: { userId: userIdBigInt }
      })
    ])

    // Clear current session cookies as well
    clearAuthCookies(event)

    console.log('[API] User password changed:', userId)

    return {
      success: true,
      message: 'Password changed successfully. Please login again.'
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw createError({
        statusCode: 400,
        statusMessage: error.issues[0]?.message ?? 'Invalid input'
      })
    }
    throw error
  }
})
