import bcrypt from 'bcryptjs'
import { z } from 'zod'
import prisma from '~/lib/prisma'
import { Errors } from '~/lib/errors/factory'
import { rateLimiters, getRateLimitIdentifier } from '~/lib/rate-limiter'
import { logger } from '~/lib/logger'
import { enforceRateLimit } from '~/server/utils/rate-limit'
import { handleApiError } from '~/server/utils/error-handler'

const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().optional()
})

export default defineEventHandler(async (event) => {
  const log = logger.auth.withRequestId(event.context.requestId)
  try {
    const ipIdentifier = getRateLimitIdentifier(event)
    await enforceRateLimit(
      rateLimiters.authRegisterIp,
      ipIdentifier,
      log,
      'Registration rate limited',
      { ip: ipIdentifier }
    )
    const body = await readBody(event)

    // Validate input
    const validatedData = registerSchema.parse(body)

    const emailIdentity = validatedData.email.trim().toLowerCase()
    await enforceRateLimit(
      rateLimiters.authRegisterIdentity,
      emailIdentity,
      log,
      'Registration rate limited',
      { ip: ipIdentifier, identity: validatedData.email }
    )

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email }
    })

    if (existingUser) {
      throw Errors.userEmailExists(validatedData.email)
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(validatedData.password, 10)

    // Create user
    const user = await prisma.user.create({
      data: {
        email: validatedData.email,
        password: hashedPassword,
        name: validatedData.name,
        role: 'USER'
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        expectedMonthlyTrades: true,
        expectedProfit: true,
        expectedAvgHolding: true,
        createdAt: true
      }
    })

    log.info('User registered', { userId: user.id.toString() })

    return {
      success: true,
      user
    }
  } catch (error) {
    handleApiError(error, log)
  }
})
