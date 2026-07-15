/**
 * Rate Limiter for API endpoints
 * Uses in-memory storage for rate limiting
 */

import { RateLimiterMemory } from 'rate-limiter-flexible'

const limiters = new Map<string, RateLimiterMemory>()

/**
 * Get or create a rate limiter for a specific key
 */
export function getRateLimiter(key: string, points: number, duration: number): RateLimiterMemory {
  if (!limiters.has(key)) {
    limiters.set(
      key,
      new RateLimiterMemory({
        points,
        duration,
      })
    )
  }
  return limiters.get(key)!
}

/**
 * Consume a rate limit point
 * @throws Error if rate limit exceeded
 */
export async function consumeRateLimit(
  key: string,
  identifier: string,
  points: number,
  duration: number
): Promise<void> {
  const limiter = getRateLimiter(key, points, duration)
  await limiter.consume(identifier)
}

const authRateLimits = {
  login: { points: 5, duration: 60 },
  register: { points: 3, duration: 60 },
  password: { points: 3, duration: 60 },
}

const makeLimiter = (key: string, config: { points: number; duration: number }) => {
  return (identifier: string) => consumeRateLimit(key, identifier, config.points, config.duration)
}

/**
 * Rate limiters for different use cases
 */
export const rateLimiters = {
  // Yahoo Finance API: 60 requests per minute
  yahooFinance: (identifier: string) =>
    consumeRateLimit('yahoo-finance', identifier, 60, 60),

  // General API: 100 requests per minute
  generalApi: (identifier: string) =>
    consumeRateLimit('general-api', identifier, 100, 60),

  // Auth: login — 5 attempts per minute per IP
  authLoginIp: makeLimiter('auth-login-ip', authRateLimits.login),
  // Auth: login identity (email)
  authLoginIdentity: makeLimiter('auth-login-email', authRateLimits.login),

  // Auth: register — 3 attempts per minute per IP
  authRegisterIp: makeLimiter('auth-register-ip', authRateLimits.register),
  // Auth: register identity (email)
  authRegisterIdentity: makeLimiter('auth-register-email', authRateLimits.register),

  // Auth: password change — 3 attempts per minute per IP
  authPasswordIp: makeLimiter('auth-password-ip', authRateLimits.password),
  // Auth: password change identity (user)
  authPasswordIdentity: makeLimiter('auth-password-user', authRateLimits.password),

  secMetadata: (identifier: string) => consumeRateLimit('sec-metadata', identifier, 60, 60),
  secDownload: (identifier: string) => consumeRateLimit('sec-download', identifier, 20, 60),
  secPackage: (identifier: string) => consumeRateLimit('sec-package', identifier, 5, 600),
  secBatch: (identifier: string) => consumeRateLimit('sec-batch', identifier, 3, 600),
}

/**
 * Get client IP from H3 event for rate limiting
 */
export function getRateLimitIdentifier(event: { node?: { req?: { headers?: Record<string, string | string[] | undefined>, socket?: { remoteAddress?: string } } } }): string {
  const req = event.node?.req
  const forwarded = req?.headers?.['x-forwarded-for']
  if (typeof forwarded === 'string') {
    const first = forwarded.split(',')[0]
    return first ? first.trim() : 'unknown'
  }
  return req?.socket?.remoteAddress ?? 'unknown'
}
