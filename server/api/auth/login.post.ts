import bcrypt from 'bcryptjs'
import { signAccessToken, signRefreshToken } from '~/lib/jwt'
import { setAuthCookies } from '~/server/utils/auth'
import { Errors } from '~/lib/errors/factory'
import { logger } from '~/lib/logger'
import { rateLimiters, getRateLimitIdentifier } from '~/lib/rate-limiter'
import { handleApiError } from '~/server/utils/error-handler'
import { serialize } from '~/server/utils/serialize'
import {
  loginUserSchema,
  findUserByEmail,
  createRefreshToken,
} from '~/server/utils/user-queries'

export default defineEventHandler(async (event) => {
  const log = logger.auth.withRequestId(event.context.requestId)
  try {
    const ipIdentifier = getRateLimitIdentifier(event)
    try {
      await rateLimiters.authLoginIp(ipIdentifier)
    } catch {
      log.warn('Login rate limited', { ip: ipIdentifier })
      throw Errors.rateLimited(60).toH3Error()
    }
    const body = await readBody(event)
    const validatedData = loginUserSchema.parse(body)

    const emailIdentity = validatedData.email.trim().toLowerCase()
    try {
      await rateLimiters.authLoginIdentity(emailIdentity)
    } catch {
      log.warn('Login rate limited', { ip: ipIdentifier, email: validatedData.email })
      throw Errors.rateLimited(60).toH3Error()
    }

    // Find user
    const user = await findUserByEmail(validatedData.email)

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

    await createRefreshToken(user.id, refreshToken)

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
