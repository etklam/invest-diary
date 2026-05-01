import bcrypt from 'bcryptjs'
import { z } from 'zod'
import prisma from '../../../lib/prisma'
import { clearAuthCookies } from '~/server/utils/auth'
import { Errors } from '~/lib/errors/factory'
import { rateLimiters, getRateLimitIdentifier } from '~/lib/rate-limiter'
import { logger } from '~/lib/logger'
import { enforceRateLimit } from '~/server/utils/rate-limit'
import { handleApiError } from '~/server/utils/error-handler'

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters')
})

export default defineEventHandler(async (event) => {
  const log = logger.auth.withRequestId(event.context.requestId)
  try {
    const userId = event.context.user?.id

    if (!userId) {
      throw Errors.unauthorized()
    }

    const ipIdentifier = getRateLimitIdentifier(event)
    await enforceRateLimit(
      rateLimiters.authPasswordIp,
      ipIdentifier,
      log,
      'Password change rate limited',
      { ip: ipIdentifier }
    )

    await enforceRateLimit(
      rateLimiters.authPasswordIdentity,
      String(userId),
      log,
      'Password change rate limited',
      { ip: ipIdentifier, userId: String(userId) }
    )

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
      throw Errors.userNotFound()
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(validatedData.currentPassword, user.password)

    if (!isValidPassword) {
      log.warn('Password change failed: incorrect current password', { userId: String(userId) })
      throw Errors.invalidCredentials()
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

    log.info('Password changed', { userId: String(userId) })

    return {
      success: true,
      message: 'Password changed successfully. Please login again.'
    }
  } catch (error) {
    handleApiError(error, log)
  }
})
