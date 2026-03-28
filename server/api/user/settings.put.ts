import { z } from 'zod'
import prisma from '../../../lib/prisma'
import { AppError, Errors } from '~/lib/errors/factory'
import { logger } from '~/lib/logger'
import { ErrorCodes } from '~/lib/errors/codes'
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
  const log = logger.api.withRequestId(event.context.requestId)
  let currentUserId: string | undefined
  try {
    const user = requireUser(event)
    currentUserId = user.id

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

    log.info('User settings updated', { userId: user.id })

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
      log.warn(error.message, {
        code: error.code,
        userId: currentUserId,
      })
      throw error.toH3Error()
    }
    if (error instanceof z.ZodError) {
      const validationDetails = error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }))
      log.warn('Validation failed', {
        code: ErrorCodes.SYS_VALIDATION_ERROR,
        userId: currentUserId,
        issues: validationDetails,
      })
      throw Errors.validationError(validationDetails).toH3Error()
    }
    log.error('Failed to update user settings', {
      userId: currentUserId,
      error: String(error),
    })
    throw error
  }
})
