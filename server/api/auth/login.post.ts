import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { signToken } from '~/lib/jwt'
import prisma from '~/lib/prisma'

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

    // Generate JWT token
    const token = await signToken(user.id.toString(), user.email, user.name ?? undefined)

    // Set httpOnly cookie
    setCookie(event, 'auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    })

    console.log('[API] User logged in:', user.id)

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        expectedMonthlyTrades: user.expectedMonthlyTrades,
        expectedProfit: user.expectedProfit,
        expectedAvgHolding: user.expectedAvgHolding
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
