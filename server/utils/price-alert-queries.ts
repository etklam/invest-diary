/**
 * Price Alert query layer — CRUD operations for stock price alerts.
 *
 * Validation via Zod schemas, ownership verification for update/delete.
 * Returns raw Prisma results; handlers call serialize().
 */

import prisma from '~/lib/prisma'
import { Errors } from '~/lib/errors/factory'
import { isSupportedPriceAlertType } from '~/server/utils/price-alert-condition'
import {
  PRICE_ALERT_MAX_ITEMS,
  createPriceAlertRequestSchema,
  priceAlertTypeSchema,
  updatePriceAlertRequestSchema,
  type CreatePriceAlertRequest,
  type UpdatePriceAlertRequest,
} from '~/lib/contracts/alerts'

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

export const AlertTypeEnum = priceAlertTypeSchema
export const CreatePriceAlertSchema = createPriceAlertRequestSchema.superRefine((value, context) => {
  if (!isSupportedPriceAlertType(value.type)) {
    context.addIssue({ code: 'custom', path: ['type'], message: 'Alert type is not supported yet' })
  }
})
export const UpdatePriceAlertSchema = updatePriceAlertRequestSchema

export type CreatePriceAlertInput = CreatePriceAlertRequest
export type UpdatePriceAlertInput = UpdatePriceAlertRequest

// ─── Query Functions ──────────────────────────────────────────────────────────

/**
 * List all price alerts for a user, ordered by creation date descending.
 */
export async function listPriceAlerts(userId: bigint) {
  return prisma.priceAlert.findMany({
    where: { userId },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: PRICE_ALERT_MAX_ITEMS,
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
      threshold: validated.threshold,
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
    throw Errors.priceAlertNotFound(String(id)).toH3Error()
  }

  if (validated.threshold !== undefined
    && alert.type !== 'CHANGE_PERCENT'
    && validated.threshold.startsWith('-')) {
    throw Errors.validationError([{
      field: 'threshold',
      message: 'Threshold must be non-negative for this alert type',
    }]).toH3Error()
  }

  return prisma.priceAlert.update({
    where: { id },
    data: {
      ...(validated.threshold !== undefined && { threshold: validated.threshold }),
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
    throw Errors.priceAlertNotFound(String(id)).toH3Error()
  }

  await prisma.priceAlert.delete({
    where: { id },
  })
}
