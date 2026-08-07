import { SignJWT, jwtVerify } from 'jose'
import { randomUUID } from 'node:crypto'

export const ACCESS_TOKEN_EXPIRY = '1h' // 1 hour
export const REFRESH_TOKEN_EXPIRY = '30d' // 30 days
export const ACCESS_TOKEN_MAX_AGE_SECONDS = 60 * 60 // 1 hour
export const REFRESH_TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24 * 30 // 30 days

export interface TokenPayload {
  userId: string
  email: string
  role: string
  tokenVersion: number
  type: 'access' | 'refresh'
  jti?: string
}

function getSecret() {
  // Try multiple sources for JWT_SECRET to support different Nitro environments
  // 1. process.env (standard Node.js)
  // 2. globalThis.process.env (some Nitro presets)
  // 3. runtimeConfig (Nuxt's official way — also handles Docker runtime overrides)
  let secret = process.env.JWT_SECRET
    || globalThis.process?.env?.JWT_SECRET

  // Fallback to runtimeConfig when available (inside Nitro request context)
  if (!secret && process.server) {
    try {
      const config = useRuntimeConfig()
      secret = config.jwtSecret as string | undefined
    } catch {
      // useRuntimeConfig() not available outside request context — ignore
    }
  }

  if (!secret) {
    console.error('[JWT] JWT_SECRET is not defined — checked process.env, globalThis, and runtimeConfig')
    throw new Error('JWT_SECRET is not defined')
  }

  if (process.server && secret === 'CHANGE_THIS_RANDOM_SECRET') {
    console.error('[JWT] WARNING: JWT_SECRET is still using the placeholder value!')
  }

  return new TextEncoder().encode(secret)
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
    .setJti(sessionId)
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_EXPIRY)
    .sign(getSecret())
}

/**
 * Verify and decode a JWT token
 */
export async function verifyToken(token: string): Promise<TokenPayload> {
  const { payload } = await jwtVerify(token, getSecret())

  return {
    userId: payload.userId as string,
    email: payload.email as string,
    role: payload.role as string,
    tokenVersion: payload.tokenVersion as number,
    type: payload.type as 'access' | 'refresh',
    ...(typeof payload.jti === 'string' ? { jti: payload.jti } : {}),
  }
}
