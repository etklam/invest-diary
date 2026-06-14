/**
 * Discipline query layer — CRUD operations for trading disciplines.
 *
 * Validation via Zod schemas, ownership verification for update/delete.
 * Returns raw Prisma results; handlers call serialize().
 *
 * Symmetric with price-alert-queries.ts in structure.
 */

import { z } from 'zod'
import prisma from '~/lib/prisma'
import { Errors } from '~/lib/errors/factory'

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

/**
 * Create: content is required, 1-255 chars (DB VarChar(255)).
 */
export const CreateDisciplineSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, { message: 'Content is required' })
    .max(255, { message: 'Content must be at most 255 characters' }),
})

/**
 * Update: same content constraint, wrapped as an object.
 */
export const UpdateDisciplineSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, { message: 'Content is required' })
    .max(255, { message: 'Content must be at most 255 characters' }),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided',
})

/**
 * Reorder: non-empty array of { id: positive number, order: integer }.
 */
export const ReorderDisciplineSchema = z
  .array(
    z.object({
      id: z.number().int().positive(),
      order: z.number().int(),
    }),
  )
  .min(1, { message: 'Orders array is required' })

/**
 * Import: disciplines array with content + optional replaceExisting.
 * Empty-content items are filtered out at parse time, then validated
 * for min length. This two-phase approach prevents one bad row from
 * aborting an otherwise valid import (symmetric with parseShareData
 * filtering in lib/disciplineShare.ts).
 */
export const ImportDisciplineSchema = z
  .object({
    disciplines: z.array(
      z.object({
        content: z.string().trim().max(255),
      }),
    ),
    replaceExisting: z.boolean().optional().default(false),
  })
  .transform((data) => ({
    ...data,
    disciplines: data.disciplines.filter((d) => d.content.length > 0),
  }))
  .refine((data) => data.disciplines.length > 0, {
    message: 'At least one valid discipline is required',
  })

export type CreateDisciplineInput = z.infer<typeof CreateDisciplineSchema>
export type UpdateDisciplineInput = z.infer<typeof UpdateDisciplineSchema>
export type ReorderDisciplineInput = z.infer<typeof ReorderDisciplineSchema>
export type ImportDisciplineInput = z.infer<typeof ImportDisciplineSchema>

// ─── Select helpers (DRY) ─────────────────────────────────────────────────────

const DISCIPLINE_SELECT = {
  id: true,
  content: true,
  order: true,
  createdAt: true,
} as const

// ─── Query Functions ──────────────────────────────────────────────────────────

/**
 * List all disciplines for a user, ordered by display order ascending.
 */
export async function listDisciplines(userId: bigint) {
  return prisma.discipline.findMany({
    where: { userId },
    orderBy: { order: 'asc' },
    select: DISCIPLINE_SELECT,
  })
}

/**
 * Create a new discipline. Validates input via Zod.
 * Auto-assigns order = (max existing order) + 1.
 */
export async function createDiscipline(userId: bigint, input: unknown) {
  const validated = CreateDisciplineSchema.parse(input)

  const maxOrderDiscipline = await prisma.discipline.findFirst({
    where: { userId },
    orderBy: { order: 'desc' },
    select: { order: true },
  })

  const nextOrder = (maxOrderDiscipline?.order ?? -1) + 1

  return prisma.discipline.create({
    data: {
      content: validated.content,
      userId,
      order: nextOrder,
    },
    select: DISCIPLINE_SELECT,
  })
}

/**
 * Update a discipline. Verifies ownership via findFirst({ id, userId }).
 * Throws notFound if discipline doesn't exist or isn't owned by user.
 */
export async function updateDiscipline(
  disciplineId: bigint | string,
  userId: bigint,
  input: unknown,
) {
  const id = typeof disciplineId === 'string' ? BigInt(disciplineId) : disciplineId
  const validated = UpdateDisciplineSchema.parse(input)

  const existing = await prisma.discipline.findFirst({
    where: { id, userId },
  })

  if (!existing) {
    throw Errors.disciplineNotFound().toH3Error()
  }

  return prisma.discipline.update({
    where: { id },
    data: {
      content: validated.content,
    },
    select: DISCIPLINE_SELECT,
  })
}

/**
 * Delete a discipline. Verifies ownership via findFirst({ id, userId }).
 * Throws notFound if discipline doesn't exist or isn't owned by user.
 */
export async function deleteDiscipline(
  disciplineId: bigint | string,
  userId: bigint,
) {
  const id = typeof disciplineId === 'string' ? BigInt(disciplineId) : disciplineId

  const existing = await prisma.discipline.findFirst({
    where: { id, userId },
  })

  if (!existing) {
    throw Errors.disciplineNotFound().toH3Error()
  }

  await prisma.discipline.delete({
    where: { id },
  })
}

/**
 * Reorder disciplines. Verifies all provided IDs belong to the user.
 * Uses $transaction to update all orders atomically.
 * Returns the updated list ordered by the new sequence.
 */
export async function reorderDisciplines(
  userId: bigint,
  input: unknown,
) {
  const orders = ReorderDisciplineSchema.parse(input)

  const disciplineIds = orders.map((item) => BigInt(item.id))

  const existingDisciplines = await prisma.discipline.findMany({
    where: {
      id: { in: disciplineIds },
      userId,
    },
    select: { id: true },
  })

  if (existingDisciplines.length !== orders.length) {
    throw Errors.forbidden('One or more disciplines not found or access denied').toH3Error()
  }

  await prisma.$transaction(
    orders.map((item) =>
      prisma.discipline.updateMany({
        where: {
          id: BigInt(item.id),
          userId,
        },
        data: {
          order: item.order,
        },
      }),
    ),
  )

  return prisma.discipline.findMany({
    where: { userId },
    orderBy: { order: 'asc' },
    select: DISCIPLINE_SELECT,
  })
}

/**
 * Get a random discipline content for the user.
 * Returns null if user has no disciplines.
 */
export async function getRandomDiscipline(
  userId: bigint,
): Promise<{ content: string } | null> {
  const disciplines = await prisma.discipline.findMany({
    where: { userId },
    select: { content: true },
  })

  if (disciplines.length === 0) {
    return null
  }

  const randomIndex = Math.floor(Math.random() * disciplines.length)
  return disciplines[randomIndex] ?? null
}

/**
 * Import disciplines (append or replace mode).
 *
 * Append mode: adds new disciplines after the current max order.
 * Replace mode: deletes all existing user disciplines, then imports.
 *
 * Returns { count } from createMany.
 */
export async function importDisciplines(
  userId: bigint,
  input: unknown,
): Promise<{ count: number }> {
  const validated = ImportDisciplineSchema.parse(input)
  const { disciplines, replaceExisting } = validated

  if (replaceExisting) {
    await prisma.discipline.deleteMany({
      where: { userId },
    })
  }

  // Get current max order for append mode
  let startOrder = 0
  if (!replaceExisting) {
    const maxOrderDiscipline = await prisma.discipline.findFirst({
      where: { userId },
      orderBy: { order: 'desc' },
      select: { order: true },
    })
    startOrder = (maxOrderDiscipline?.order ?? -1) + 1
  }

  const result = await prisma.discipline.createMany({
    data: disciplines.map((d, index) => ({
      userId,
      content: d.content,
      order: startOrder + index,
    })),
  })

  return { count: result.count }
}

/**
 * Export raw disciplines for external processing (e.g. share data generation).
 * Returns the raw Prisma result — BigInt id/userId NOT converted.
 * The handler is responsible for serialize()/format conversion.
 */
export async function exportDisciplinesRaw(userId: bigint) {
  return prisma.discipline.findMany({
    where: { userId },
    orderBy: { order: 'asc' },
  })
}
