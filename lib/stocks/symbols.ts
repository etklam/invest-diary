import type { H3Event } from 'h3'
import { z } from 'zod'

export const symbolSchema = z.string().regex(/^[A-Za-z0-9.]{1,10}$/)

export function parseSymbolParam(event: H3Event): string | undefined {
  const rawSymbol = event.context.params?.symbol ?? getRouterParam(event, 'symbol') ?? event.path?.split('/').filter(Boolean).pop()
  if (!rawSymbol) return undefined

  try {
    return decodeURIComponent(String(rawSymbol))
  } catch {
    return String(rawSymbol)
  }
}

export function normalizeStockSymbol(input: string): string {
  return input.toUpperCase().replace(/\.TW$/i, '.TW').replace(/\s+/g, ' ').trim()
}
