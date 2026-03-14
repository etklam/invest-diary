import type { H3Event } from 'h3'
import { z } from 'zod'
import { Errors } from '~/lib/errors/factory'

export function normalizeInput(value: string): string {
  return value.trim().normalize('NFKC')
}

export function isValidIanaTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone })
    return true
  } catch {
    return false
  }
}

export function optionalNormalizedString(maxLength: number) {
  return z.union([z.string(), z.null(), z.undefined()])
    .transform((value) => typeof value === 'string' ? normalizeInput(value) : undefined)
    .refine((value) => value === undefined || value.length <= maxLength, {
      message: `Must be at most ${maxLength} characters`,
    })
    .transform((value) => value && value.length > 0 ? value : undefined)
}

export function normalizedRequiredString(field: string, maxLength: number, minLength = 1) {
  return z.string()
    .transform(normalizeInput)
    .refine((value) => value.length >= minLength, {
      message: `${field} is required`,
    })
    .refine((value) => value.length <= maxLength, {
      message: `${field} must be at most ${maxLength} characters`,
    })
}

export function parsePositiveBigIntParam(event: H3Event, name: string): bigint {
  const rawFromParams = event.context.params?.[name]
  const rawFromRouter = (
    globalThis as typeof globalThis & {
      getRouterParam?: (event: H3Event, name: string) => string | undefined
    }
  ).getRouterParam?.(event, name)
  const pathSegments = event.path?.split('/').filter(Boolean) ?? []
  const rawFromPath = pathSegments.at(-1)
  const fallbackPathValue = rawFromPath && /^[1-9]\d*$/.test(rawFromPath) ? rawFromPath : undefined
  const rawValue = rawFromParams ?? rawFromRouter ?? fallbackPathValue

  if (!rawValue) {
    throw Errors.validationError([{ field: name, message: `${name} is required` }]).toH3Error()
  }

  const normalized = String(rawValue).trim()
  if (!/^[1-9]\d*$/.test(normalized)) {
    throw Errors.validationError([{ field: name, message: `Invalid ${name}`, value: normalized }]).toH3Error()
  }

  return BigInt(normalized)
}
