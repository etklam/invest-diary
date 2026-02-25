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
}
