import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { signAccessToken, signRefreshToken, REFRESH_TOKEN_MAX_AGE_SECONDS } from '~/lib/jwt'
import prisma from '~/lib/prisma'
import { setAuthCookies } from '~/server/utils/auth'
import { Errors, AppError } from '~/lib/errors/factory'
import { logger } from '~/lib/logger'
import { hashToken } from '~/server/utils/auth-session'
import { rateLimiters, getRateLimitIdentifier } from '~/lib/rate-limiter'

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required')
})

type RateLimitLogger = {
  warn: (message: string, meta?: Record<string, unknown>) => void
}

async function enforceRateLimit(
  limitFn: (identifier: string) => Promise<void>,
  identifier: string,
  log: RateLimitLogger,
  message: string,
  meta: Record<string, unknown>
): Promise<void> {
  try {
    await limitFn(identifier)
  } catch {
    log.warn(message, meta)
    throw Errors.rateLimited(60)
  }
}

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

    await prisma.refreshToken.create({
      data: {
        token: hashToken(refreshToken),
        userId: user.id,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_MAX_AGE_SECONDS * 1000)
      }
    })

    setAuthCookies(event, accessToken, refreshToken)

    log.info('Login success', { userId: user.id.toString() })

    return {
      ok: true,
      data: {
        id: user.id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
        expectedMonthlyTrades: user.expectedMonthlyTrades,
        expectedProfit: user.expectedProfit,
        expectedAvgHolding: user.expectedAvgHolding,
        timezone: user.timezone
      }
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      log.warn('Login validation failed', { issues: error.issues })
      throw Errors.validationError(error.issues.map(i => ({ field: i.path.join('.'), message: i.message }))).toH3Error()
    }
    if (error instanceof AppError) {
      throw error.toH3Error()
    }
    log.error('Login unexpected error', { error: String(error) })
    throw Errors.internalError(error).toH3Error()
  }
})
