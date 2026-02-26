import { SignJWT, jwtVerify } from 'jose'

const ACCESS_TOKEN_EXPIRY = '1h' // 1 hour
const REFRESH_TOKEN_EXPIRY = '30d' // 30 days

export interface TokenPayload {
  userId: string
  email: string
  role: string
  tokenVersion: number
  type: 'access' | 'refresh'
}

function getSecret() {
  // Try multiple sources for JWT_SECRET to support different Nitro environments
  const secret = process.env.JWT_SECRET || globalThis.process?.env?.JWT_SECRET

  if (!secret) {
    // Log for debugging
    if (process.server) {
      console.error('[JWT] JWT_SECRET is not defined in process.env')
      console.error('[JWT] Available env vars:', Object.keys(process.env).filter(k => k.includes('JWT') || k.includes('NUXT')))
    }
    throw new Error('JWT_SECRET is not defined')
  }

  // Log secret length for debugging (don't log the actual secret)
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
  tokenVersion: number
): Promise<string> {
  return await new SignJWT({ userId, email, role, tokenVersion, type: 'refresh' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_EXPIRY)
    .sign(getSecret())
}

/**
 * Legacy: Generate a JWT token for a user (defaults to access token)
 * @deprecated Use signAccessToken or signRefreshToken instead
 */
export async function signToken(
  userId: string,
  email: string,
  role: string,
  tokenVersion: number
): Promise<string> {
  return await signAccessToken(userId, email, role, tokenVersion)
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
    type: payload.type as 'access' | 'refresh'
  }
}
