import bcrypt from 'bcryptjs'
import { z } from 'zod'
import prisma from '~/lib/prisma'
import { AppError, Errors } from '~/lib/errors/factory'

const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().optional()
})

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)

    // Validate input
    const validatedData = registerSchema.parse(body)

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

    console.log('[API] User registered:', user.id)

    return {
      success: true,
      user
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw Errors.validationError(
        error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        }))
      ).toH3Error()
    }
    if (error instanceof AppError) {
      throw error.toH3Error()
    }
    throw Errors.internalError(error).toH3Error()
  }
})
