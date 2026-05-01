import crypto from 'node:crypto'
import { logger } from '~/lib/logger'

const CSRF_COOKIE = 'csrf-token'
const CSRF_HEADER = 'x-csrf-token'
const STATE_CHANGE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])
const SKIP_PATHS = ['/api/auth']

const log = logger.auth

/**
 * Generate a cryptographically secure random token (32 bytes hex)
 */
function generateToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Check if the request uses API key authentication (header-based auth).
 * API key authenticated requests skip CSRF since they don't use cookies.
 */
function isApiKeyAuth(event: Parameters<typeof getRequestURL>[0]): boolean {
  const authHeader = getHeader(event, 'authorization')
  return !!(authHeader && authHeader.startsWith('Bearer sk_'))
}

/**
 * CSRF protection middleware using double-submit cookie pattern.
 *
 * 1. On GET/HEAD/OPTIONS requests: if no csrf cookie exists, generate and set one.
 * 2. On state-changing methods (POST, PUT, PATCH, DELETE):
 *    - Skip if API key auth (header-based, no cookies)
 *    - Skip for /api/auth/* paths
 *    - Verify X-CSRF-Token header matches the csrf cookie value
 */
export default defineEventHandler(async (event) => {
  const url = getRequestURL(event)

  // Only apply to API routes
  if (!url.pathname.startsWith('/api/')) return

  const method = (event.method || 'GET').toUpperCase()

  // For GET requests, ensure a CSRF token cookie exists
  if (!STATE_CHANGE_METHODS.has(method)) {
    const existingToken = getCookie(event, CSRF_COOKIE)
    if (!existingToken) {
      const token = generateToken()
      setCookie(event, CSRF_COOKIE, token, {
        httpOnly: false, // Must be readable by client JS to send in header
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 60 * 60 * 24, // 24 hours
      })
    }
    return
  }

  // For state-changing methods, verify CSRF
  // Skip CSRF for API key authenticated requests
  if (isApiKeyAuth(event)) return

  // Skip CSRF for auth routes (login, register, etc.)
  for (const skipPath of SKIP_PATHS) {
    if (url.pathname.startsWith(skipPath)) return
  }

  const cookieToken = getCookie(event, CSRF_COOKIE)
  const headerToken = getHeader(event, CSRF_HEADER)

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    log.warn('CSRF validation failed', {
      path: url.pathname,
      method,
      hasCookie: !!cookieToken,
      hasHeader: !!headerToken,
      tokensMatch: cookieToken === headerToken,
    })

    throw createError({
      statusCode: 403,
      statusMessage: 'CSRF token validation failed',
    })
  }
})
