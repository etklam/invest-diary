/**
 * Price Alert query layer — CRUD operations for stock price alerts.
 *
 * Validation via Zod schemas, ownership verification for update/delete.
 * Returns raw Prisma results; handlers call serialize().
 */

import { z } from 'zod'
import prisma from '~/lib/prisma'
import { Errors } from '~/lib/errors/factory'
import { isSupportedPriceAlertType } from '~/server/utils/price-alert-condition'

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

export const AlertTypeEnum = z.enum([
  'PRICE_ABOVE',
  'PRICE_BELOW',
  'CHANGE_PERCENT',
  'MOVING_AVG',
])

export const CreatePriceAlertSchema = z.object({
  symbol: z.string()
    .transform((v) => v.toUpperCase().trim())
    .refine((v) => v.length >= 1 && v.length <= 20, {
      message: 'Symbol must be between 1 and 20 characters',
    }),
  type: AlertTypeEnum.refine((v) => isSupportedPriceAlertType(v), {
    message: 'Alert type is not supported yet',
  }),
  threshold: z.number({ required_error: 'Required' }),
  message: z.string().max(500).optional(),
})

export const UpdatePriceAlertSchema = z.object({
  threshold: z.number().optional(),
  message: z.string().max(500).optional(),
  isTriggered: z.boolean().optional(),
  triggeredAt: z.union([z.string(), z.date()]).nullable().optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided',
})

export type CreatePriceAlertInput = z.infer<typeof CreatePriceAlertSchema>
export type UpdatePriceAlertInput = z.infer<typeof UpdatePriceAlertSchema>

// ─── Query Functions ──────────────────────────────────────────────────────────

/**
 * List all price alerts for a user, ordered by creation date descending.
 */
export async function listPriceAlerts(userId: bigint) {
  return prisma.priceAlert.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  })
}

/**
 * Create a new price alert. Validates input via Zod schema.
 */
export async function createPriceAlert(userId: bigint, input: unknown) {
  const validated = CreatePriceAlertSchema.parse(input)

  const defaultMsg = `${validated.type} alert for ${validated.symbol} at ${validated.threshold}`

  return prisma.priceAlert.create({
    data: {
      userId,
      symbol: validated.symbol,
      type: validated.type,
      threshold: validated.threshold.toString(),
      message: validated.message || defaultMsg,
    },
  })
}

/**
 * Update a price alert. Verifies ownership.
 * Throws notFound if alert doesn't exist or isn't owned by user.
 */
export async function updatePriceAlert(
  alertId: bigint | string,
  userId: bigint,
  input: unknown,
) {
  const id = typeof alertId === 'string' ? BigInt(alertId) : alertId
  const validated = UpdatePriceAlertSchema.parse(input)

  const alert = await prisma.priceAlert.findUnique({
    where: { id },
  })

  if (!alert || String(alert.userId) !== String(userId)) {
    throw Errors.notFound(`Price alert ${String(id)} not found`)
  }

  return prisma.priceAlert.update({
    where: { id },
    data: {
      ...(validated.threshold !== undefined && { threshold: validated.threshold.toString() }),
      ...(validated.message !== undefined && { message: validated.message }),
      ...(validated.isTriggered !== undefined && { isTriggered: validated.isTriggered }),
      ...(validated.triggeredAt !== undefined && {
        triggeredAt: validated.triggeredAt ? new Date(validated.triggeredAt) : null,
      }),
    },
  })
}

/**
 * Delete a price alert. Verifies ownership.
 * Throws notFound if alert doesn't exist or isn't owned by user.
 */
export async function deletePriceAlert(
  alertId: bigint | string,
  userId: bigint,
) {
  const id = typeof alertId === 'string' ? BigInt(alertId) : alertId

  const alert = await prisma.priceAlert.findUnique({
    where: { id },
  })

  if (!alert || String(alert.userId) !== String(userId)) {
    throw Errors.notFound(`Price alert ${String(id)} not found`)
  }

  await prisma.priceAlert.delete({
    where: { id },
  })
}
