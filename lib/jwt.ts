import { SignJWT, jwtVerify } from 'jose'

const TOKEN_EXPIRY = '7d'

export interface TokenPayload {
  userId: string
  email: string
  role: string
  tokenVersion: number
}

function getSecret() {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined')
  }
  return new TextEncoder().encode(process.env.JWT_SECRET)
}

/**
 * Generate a JWT token for a user
 * tokenVersion allows global invalidation (logout / password change)
 */
export async function signToken(
  userId: string,
  email: string,
  role: string,
  tokenVersion: number
): Promise<string> {
  return await new SignJWT({ userId, email, role, tokenVersion })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
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
    tokenVersion: payload.tokenVersion as number
  }
}
