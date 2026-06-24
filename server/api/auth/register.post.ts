import bcrypt from 'bcryptjs'
import { z } from 'zod'
import prisma from '~/lib/prisma'
import { Errors } from '~/lib/errors/factory'
import { rateLimiters, getRateLimitIdentifier } from '~/lib/rate-limiter'
import { logger } from '~/lib/logger'
import { handleApiError } from '~/server/utils/error-handler'
import { serialize } from '~/server/utils/serialize'

const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().optional()
})

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
    const validatedData = registerSchema.parse(body)

    const emailIdentity = validatedData.email.trim().toLowerCase()
    try {
      await rateLimiters.authRegisterIdentity(emailIdentity)
    } catch {
      log.warn('Registration rate limited', { ip: ipIdentifier, identity: validatedData.email })
      throw Errors.rateLimited(60).toH3Error()
    }

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

    log.info('User registered', { userId: String(user.id) })

    return serialize({
      success: true,
      user
    })
  } catch (error) {
    handleApiError(error, log)
  }
})
