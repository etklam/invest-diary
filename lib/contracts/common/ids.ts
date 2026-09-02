import { z } from 'zod'

/** Canonical public ID. Database BigInt values leave the server as base-10 strings. */
export const serializedIdSchema = z.string().regex(/^[1-9]\d*$/, 'ID must be a positive decimal string')
export type SerializedId = z.infer<typeof serializedIdSchema>

/** Calendar-only business date; never interpret it as an instant. */
export const calendarDateSchema = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must use YYYY-MM-DD format')
  .refine((value) => {
    const [year, month, day] = value.split('-').map(Number)
    const date = new Date(Date.UTC(year!, month! - 1, day!))
    return date.getUTCFullYear() === year
      && date.getUTCMonth() === month! - 1
      && date.getUTCDate() === day
  }, 'Date must be a valid calendar date')

/** UTC RFC 3339 instant. Offsets are intentionally rejected; the wire always uses Z. */
export const utcInstantSchema = z.string()
  .datetime({ offset: false })
  .refine(value => value.endsWith('Z'), 'Instant must use UTC Z notation')

export const decimalStringSchema = z.string().regex(/^-?\d+(?:\.\d+)?$/, 'Value must be a decimal string')
