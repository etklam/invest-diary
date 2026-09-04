import { SignJWT, jwtVerify } from 'jose'
import { randomUUID } from 'node:crypto'
import { getJwtSecret } from '~/server/config/env'
export { JWT_PLACEHOLDER_SECRET } from '~/server/config/env'

export const ACCESS_TOKEN_EXPIRY = '1h' // 1 hour
export const REFRESH_TOKEN_EXPIRY = '30d' // 30 days
export const ACCESS_TOKEN_MAX_AGE_SECONDS = 60 * 60 // 1 hour
export const REFRESH_TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24 * 30 // 30 days
export const JWT_ISSUER = 'invest-diary'
export const JWT_AUDIENCE = 'invest-diary-api'

export interface TokenPayload {
  userId: string
  email: string
  role: string
  tokenVersion: number
  type: 'access' | 'refresh'
  jti?: string
}

function getSecret() {
  return new TextEncoder().encode(getJwtSecret())
}

/** Called by the Nitro startup plugin so unsafe configuration fails before serving traffic. */
export function assertJwtConfiguration(): void {
  getSecret()
}

/**
 * Generate an access token (short-lived)
 */
export async function signAccessToken(
  userId: string,
  email: string,
  role: string,
  tokenVersion: number
): Promise<string> {
  return await new SignJWT({ userId, email, role, tokenVersion, type: 'access' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .sign(getSecret())
}

/**
 * Generate a refresh token (long-lived)
 */
export async function signRefreshToken(
  userId: string,
  email: string,
  role: string,
  tokenVersion: number,
  sessionId = randomUUID(),
): Promise<string> {
  return await new SignJWT({ userId, email, role, tokenVersion, type: 'refresh' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setJti(sessionId)
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_EXPIRY)
    .sign(getSecret())
}

/**
 * Verify and decode a JWT token
 */
export async function verifyToken(token: string): Promise<TokenPayload> {
  const { payload } = await jwtVerify(token, getSecret(), {
    algorithms: ['HS256'],
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  })

  if (
    typeof payload.userId !== 'string'
    || payload.userId.length === 0
    || typeof payload.email !== 'string'
    || typeof payload.role !== 'string'
    || typeof payload.tokenVersion !== 'number'
    || !Number.isInteger(payload.tokenVersion)
    || (payload.type !== 'access' && payload.type !== 'refresh')
  ) {
    throw new Error('Invalid token payload')
  }

  return {
    userId: payload.userId,
    email: payload.email,
    role: payload.role,
    tokenVersion: payload.tokenVersion,
    type: payload.type,
    ...(typeof payload.jti === 'string' ? { jti: payload.jti } : {}),
  }
}
