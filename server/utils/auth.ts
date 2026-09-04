import { H3Event } from 'h3'
import { ACCESS_TOKEN_MAX_AGE_SECONDS, REFRESH_TOKEN_MAX_AGE_SECONDS } from '~/lib/jwt'
import { Errors } from '~/lib/errors/factory'
import { parseRuntimeSettings } from '~/server/config/env'

const ACCESS_TOKEN_COOKIE = 'access-token'
const REFRESH_TOKEN_COOKIE = 'refresh-token'

/**
 * Set both access and refresh token cookies
 */
export function setAuthCookies(
  event: H3Event,
  accessToken: string,
  refreshToken: string
) {
  const secure = parseRuntimeSettings().nodeEnv === 'production'

  // Access token - 1 hour
  setCookie(event, ACCESS_TOKEN_COOKIE, accessToken, {
    httpOnly: true,
    secure,
    sameSite: 'strict',
    maxAge: ACCESS_TOKEN_MAX_AGE_SECONDS,
    path: '/'
  })

  // Refresh token - 30 days
  setCookie(event, REFRESH_TOKEN_COOKIE, refreshToken, {
    httpOnly: true,
    secure,
    sameSite: 'strict',
    maxAge: REFRESH_TOKEN_MAX_AGE_SECONDS,
    path: '/'
  })
}

/**
 * Set access token cookie only (for token refresh)
 */
export function setAccessTokenCookie(event: H3Event, accessToken: string) {
  setCookie(event, ACCESS_TOKEN_COOKIE, accessToken, {
    httpOnly: true,
    secure: parseRuntimeSettings().nodeEnv === 'production',
    sameSite: 'strict',
    maxAge: ACCESS_TOKEN_MAX_AGE_SECONDS,
    path: '/'
  })
}

/**
 * Clear both auth cookies
 */
export function clearAuthCookies(event: H3Event) {
  deleteCookie(event, ACCESS_TOKEN_COOKIE, { path: '/' })
  deleteCookie(event, REFRESH_TOKEN_COOKIE, { path: '/' })
  // Clear the legacy cookie for both the default path and root path.
  deleteCookie(event, 'auth-token')
  deleteCookie(event, 'auth-token', { path: '/' })
}

export function requireUser(event: H3Event) {
  const user = event.context.user
  if (!user) {
    throw Errors.unauthorized().toH3Error()
  }
  return user
}
