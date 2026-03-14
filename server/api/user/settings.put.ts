import { z } from 'zod'
import prisma from '../../../lib/prisma'
import { AppError, Errors } from '~/lib/errors/factory'
import { isValidIanaTimezone, normalizeInput, optionalNormalizedString } from '~/server/utils/validation'
import { requireUser } from '~/server/utils/auth'

const settingsSchema = z.object({
  name: optionalNormalizedString(100),
  expectedMonthlyTrades: z.coerce.number().int().min(0).optional(),
  expectedProfit: z.coerce.number().optional(),
  expectedAvgHolding: z.coerce.number().optional(),
  timezone: z.union([z.string(), z.undefined()])
    .transform((value) => value ? normalizeInput(value) : undefined)
    .refine((value) => value === undefined || isValidIanaTimezone(value), {
      message: 'Invalid timezone',
    }),
})

export default defineEventHandler(async (event) => {
  try {
    const user = requireUser(event)

    const body = await readBody(event)
    const validatedData = settingsSchema.parse(body)

    const updatedUser = await prisma.user.update({
      where: { id: BigInt(user.id) },
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

    console.log('[API] User settings updated:', user.id)

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
    if (error instanceof AppError) {
      throw error.toH3Error()
    }
    if (error instanceof z.ZodError) {
      throw Errors.validationError(
        error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        }))
      ).toH3Error()
    }
    throw error
  }
})
