import bcrypt from 'bcryptjs'
import { Errors } from '~/lib/errors/factory'
import { rateLimiters, getRateLimitIdentifier } from '~/lib/rate-limiter'
import { logger } from '~/lib/logger'
import { handleApiError } from '~/server/utils/error-handler'
import { serialize } from '~/server/utils/serialize'
import { isUniqueConstraintError } from '~/server/utils/diary-write'
import {
  registerUserSchema,
  findUserByEmail,
  createUserForRegistration,
} from '~/server/utils/user-queries'

export default defineEventHandler(async (event) => {
  const log = logger.auth.withRequestId(event.context.requestId)
  try {
    const ipIdentifier = getRateLimitIdentifier(event)
    try {
      await rateLimiters.authRegisterIp(ipIdentifier)
    } catch {
      log.warn('Registration rate limited', { ip: ipIdentifier })
      throw Errors.rateLimited(60).toH3Error()
    }
    const body = await readBody(event)

    // Validate input
    const validatedData = registerUserSchema.parse(body)

    const emailIdentity = validatedData.email.trim().toLowerCase()
    try {
      await rateLimiters.authRegisterIdentity(emailIdentity)
    } catch {
      log.warn('Registration rate limited', { ip: ipIdentifier, email: validatedData.email })
      throw Errors.rateLimited(60).toH3Error()
    }

    // Check if user already exists
    const existingUser = await findUserByEmail(validatedData.email)

    if (existingUser) {
      throw Errors.userEmailExists(validatedData.email)
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(validatedData.password, 10)

    // Create user. The pre-check above is a fast UX path only — two
    // concurrent registrations of the same email lose the race and surface
    // as P2002, which must map to the same 409 the pre-check returns.
    let user
    try {
      user = await createUserForRegistration({
        email: validatedData.email,
        hashedPassword,
        name: validatedData.name,
      })
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw Errors.userEmailExists(validatedData.email)
      }
      throw error
    }

    log.info('User registered', { userId: String(user.id) })

    return serialize({
      success: true,
      user
    })
  } catch (error) {
    handleApiError(error, log)
  }
})
