import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { signToken } from '~/lib/jwt'
import prisma from '~/lib/prisma'
import { setAuthCookie } from '~/server/utils/auth'

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
    const role = (user as any).role
    const token = await signToken(user.id.toString(), user.email, role, 0)

    setAuthCookie(event, token)

    return {
      ok: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: (user as any).role,
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
