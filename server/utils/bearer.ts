/**
 * Parse an HTTP Authorization Bearer credential without accepting a prefix
 * embedded later in the value or an empty token.
 */
export function parseBearerToken(value: string | null | undefined): string | null {
  const match = /^Bearer\s+(.+)$/i.exec(value ?? '')
  const token = match?.[1]?.trim()
  return token || null
}
