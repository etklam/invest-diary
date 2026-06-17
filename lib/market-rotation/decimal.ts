/**
 * Prisma Decimal-coercion helper.
 *
 * Prisma may return Decimal columns as Prisma.Decimal (with toNumber()),
 * number, string, or null depending on the query shape and serialization
 * path. This normalises any of those into `number | null`.
 *
 * Used by the market rotation query layers (batch + monitor) and any
 * other path that reads Decimal columns from Prisma.
 */

export type DecimalLike =
  | number
  | string
  | { toNumber?: () => number; valueOf?: () => unknown }
  | null
  | undefined

export function toNumber(value: DecimalLike): number | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'number') return value
  if (typeof value === 'string') return Number(value)
  if (typeof value.toNumber === 'function') return value.toNumber()
  const primitive = value.valueOf?.()
  return typeof primitive === 'number' ? primitive : Number(primitive)
}
