import { Prisma } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { signAccessToken, signRefreshToken, REFRESH_TOKEN_MAX_AGE_SECONDS } from '~/lib/jwt'
import prisma from '~/lib/prisma'
import { setAuthCookies } from '~/server/utils/auth'
import { Errors } from '~/lib/errors/factory'
import { logger } from '~/lib/logger'
import { hashToken } from '~/server/utils/auth-session'
import { rateLimiters, getRateLimitIdentifier } from '~/lib/rate-limiter'
import { enforceRateLimit } from '~/server/utils/rate-limit'
import { handleApiError } from '~/server/utils/error-handler'
import { serialize } from '~/server/utils/serialize'

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required')
})

export default defineEventHandler(async (event) => {
  const log = logger.auth.withRequestId(event.context.requestId)
  try {
    const ipIdentifier = getRateLimitIdentifier(event)
    await enforceRateLimit(
      rateLimiters.authLoginIp,
      ipIdentifier,
      log,
      'Login rate limited',
      { ip: ipIdentifier }
    )
    const body = await readBody(event)
    const validatedData = loginSchema.parse(body)

    const emailIdentity = validatedData.email.trim().toLowerCase()
    await enforceRateLimit(
      rateLimiters.authLoginIdentity,
      emailIdentity,
      log,
      'Login rate limited',
      { ip: ipIdentifier, identity: validatedData.email }
    )

    // Find user
    const user = await prisma.user.findUnique({ where: { email: validatedData.email } })

    if (!user) {
      log.warn('Login failed: user not found', { email: validatedData.email })
      throw Errors.invalidCredentials()
    }

    const isValidPassword = await bcrypt.compare(validatedData.password, user.password)
    if (!isValidPassword) {
      log.warn('Login failed: invalid password', { userId: user.id.toString() })
      throw Errors.invalidCredentials()
    }

    const role = user.role
    const tokenVersion = user.tokenVersion || 0

    const accessToken = await signAccessToken(user.id.toString(), user.email, role, tokenVersion)
    const refreshToken = await signRefreshToken(user.id.toString(), user.email, role, tokenVersion)

    const hashedRefreshToken = hashToken(refreshToken)
    const refreshExpiresAt = new Date(Date.now() + REFRESH_TOKEN_MAX_AGE_SECONDS * 1000)

    try {
      await prisma.refreshToken.create({
        data: {
          token: hashedRefreshToken,
          userId: user.id,
          expiresAt: refreshExpiresAt,
        }
      })
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
        throw error
      }

      await prisma.refreshToken.update({
        where: {
          token: hashedRefreshToken,
        },
        data: {
          userId: user.id,
          expiresAt: refreshExpiresAt,
        }
      })
    }

    setAuthCookies(event, accessToken, refreshToken)

    log.info('Login success', { userId: user.id.toString() })

    return serialize({
      ok: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        expectedMonthlyTrades: user.expectedMonthlyTrades,
        expectedProfit: user.expectedProfit,
        expectedAvgHolding: user.expectedAvgHolding,
        timezone: user.timezone
      }
    })
  } catch (error) {
    handleApiError(error, log)
  }
})
