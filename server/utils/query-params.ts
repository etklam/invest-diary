/**
 * Shared query parameter parsing utilities for API GET list endpoints.
 * Provides safe, validated parsing with sensible defaults.
 */

const MAX_LIMIT = 100
const DEFAULT_LIMIT = 20
const DEFAULT_PAGE = 1

/**
 * Parse pagination parameters from query object.
 * Returns validated page, limit, and computed skip (offset).
 */
export function parsePagination(
  query: Record<string, unknown>,
  options?: { defaultLimit?: number; maxLimit?: number }
) {
  const defaultLimit = options?.defaultLimit ?? DEFAULT_LIMIT
  const maxLimit = options?.maxLimit ?? MAX_LIMIT

  const rawPage = Number(query.page)
  const rawLimit = Number(query.limit)

  const page = Number.isFinite(rawPage) && rawPage >= 1
    ? Math.floor(rawPage)
    : DEFAULT_PAGE

  const limit = Number.isFinite(rawLimit) && rawLimit >= 1 && rawLimit <= maxLimit
    ? Math.floor(rawLimit)
    : defaultLimit

  const skip = (page - 1) * limit

  return { page, limit, skip }
}

/**
 * Parse a positive integer from a query value.
 * Returns undefined if the value is not a valid positive integer.
 */
export function parsePositiveInt(
  value: unknown,
  options?: { max?: number }
): number | undefined {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 1) return undefined
  if (options?.max && parsed > options.max) return options.max
  return Math.floor(parsed)
}

/**
 * Parse and validate a search string from query.
 * Returns undefined if empty, truncates if too long.
 */
export function parseSearchQuery(
  value: unknown,
  maxLength: number = 500
): string | undefined {
  if (value === undefined || value === null) return undefined
  const str = String(value).trim()
  if (!str) return undefined
  return str.slice(0, maxLength)
}
