import { z } from 'zod'
import prisma from '../../../lib/prisma'
import { handleApiError } from '~/server/utils/error-handler'
import { logger } from '~/lib/logger'
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
    handleApiError(error, log)
  }
})
