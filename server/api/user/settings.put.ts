import { z } from 'zod'
import prisma from '../../../lib/prisma'

const settingsSchema = z.object({
  name: z.string().optional(),
  expectedMonthlyTrades: z.number().int().min(0).optional(),
  expectedProfit: z.number().optional(),
  expectedAvgHolding: z.number().optional(),
  timezone: z.string().optional()
})

export default defineEventHandler(async (event) => {
  try {
    const userId = event.context.user?.id

    if (!userId) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized'
      })
    }

    const body = await readBody(event)

    // Validate input
    const validatedData = settingsSchema.parse(body)

    // Update user settings
    const updatedUser = await prisma.user.update({
      where: { id: BigInt(userId) },
      data: validatedData,
      select: {
        id: true,
        email: true,
        name: true,
        expectedMonthlyTrades: true,
        expectedProfit: true,
        expectedAvgHolding: true,
        timezone: true
      }
    })

    console.log('[API] User settings updated:', userId)

    return {
      success: true,
      settings: {
        name: updatedUser.name,
        expectedMonthlyTrades: updatedUser.expectedMonthlyTrades,
        expectedProfit: updatedUser.expectedProfit,
        expectedAvgHolding: updatedUser.expectedAvgHolding,
        timezone: updatedUser.timezone
      }
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw createError({
        statusCode: 400,
        statusMessage: error.errors[0].message
      })
    }
    throw error
  }
})
