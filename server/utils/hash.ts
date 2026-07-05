/**
 * Single source of truth for SHA-256 hex hashing.
 *
 * Used by both `auth-session.ts` (refresh tokens) and `api-key.ts` (API keys)
 * to avoid duplicate `createHash('sha256').update(...).digest('hex')` impls.
 */
import { createHash } from 'node:crypto'

export function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}
