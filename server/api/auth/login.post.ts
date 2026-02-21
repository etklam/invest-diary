import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { signAccessToken, signRefreshToken } from '~/lib/jwt'
import prisma from '~/lib/prisma'
import { setAuthCookies } from '~/server/utils/auth'
import { createError } from 'h3'

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required')
})

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)

    // Validate input
    const validatedData = loginSchema.parse(body)

    // Find user
    // @ts-ignore Prisma model access
    const user = await prisma.user.findUnique({
      where: { email: validatedData.email }
    })

    if (!user) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Invalid email or password'
      })
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(validatedData.password, user.password)

    if (!isValidPassword) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Invalid email or password'
      })
    }

    // Generate access and refresh tokens
    const role = (user as any).role
    const tokenVersion = (user as any).tokenVersion || 0

    const accessToken = await signAccessToken(user.id.toString(), user.email, role, tokenVersion)
    const refreshToken = await signRefreshToken(user.id.toString(), user.email, role, tokenVersion)

    // Store refresh token in database
    // @ts-ignore Prisma model access
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      }
    })

    // Set both cookies
    setAuthCookies(event, accessToken, refreshToken)

    return {
      ok: true,
      data: {
        id: user.id.toString(),
        email: user.email,
        name: user.name,
        role: (user as any).role,
        expectedMonthlyTrades: user.expectedMonthlyTrades,
        expectedProfit: user.expectedProfit,
        expectedAvgHolding: user.expectedAvgHolding,
        timezone: (user as any).timezone
      }
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw createError({
        statusCode: 400,
        statusMessage: error.issues[0]?.message ?? 'Invalid request'
      })
    }
    throw error
  }
})
