import prisma from '~/lib/prisma'
import type { TokenPayload } from '~/lib/jwt'
import { verifyToken } from '~/lib/jwt'
import { sha256Hex } from '~/server/utils/hash'
import { decodeJwt } from 'jose'

export interface SessionUser {
  id: string
  email: string
  role: string
}

export interface WebSocketAccessSession {
  user: SessionUser
  expiresAt: Date
  tokenVersion: number
}

interface SessionUserRecord {
  id: bigint
  email: string
  role: string
  tokenVersion: number
}

export interface RefreshTokenRecord {
  token: string
  expiresAt: Date
  revokedAt: Date | null
  clientType: 'WEB' | 'NATIVE'
  familyId: string
  user: SessionUserRecord
}

function toSessionUser(user: SessionUserRecord): SessionUser {
  return {
    id: user.id.toString(),
    email: user.email,
    role: user.role,
  }
}

function isUserActive(user: SessionUserRecord, payload: TokenPayload): boolean {
  return user.tokenVersion === payload.tokenVersion
}

async function findSessionUser(userId: string): Promise<SessionUserRecord | null> {
  return prisma.user.findUnique({
    where: { id: BigInt(userId) },
    select: {
      id: true,
      email: true,
      role: true,
      tokenVersion: true,
    },
  })
}

async function findRefreshTokenRecord(token: string): Promise<RefreshTokenRecord | null> {
  const tokenHash = sha256Hex(token)
  const include = {
    user: {
      select: {
        id: true,
        email: true,
        role: true,
        tokenVersion: true,
      },
    },
  } as const

  const hashedRecord = await prisma.refreshToken.findUnique({
    where: { token: tokenHash },
    include,
  })

  if (hashedRecord) {
    return hashedRecord
  }

  const legacyRecord = await prisma.refreshToken.findUnique({
    where: { token },
    include,
  })

  if (!legacyRecord) {
    return null
  }

  await prisma.refreshToken.update({
    where: { token },
    data: { token: tokenHash },
  })

  return {
    ...legacyRecord,
    token: tokenHash,
  }
}

async function resolveAccessToken(token: string) {
  const payload = await verifyToken(token)

  if (payload.type !== 'access') {
    return null
  }

  const user = await findSessionUser(payload.userId)
  if (!user || !isUserActive(user, payload)) {
    return null
  }

  return { payload, user }
}

export async function authenticateAccessToken(token: string): Promise<SessionUser | null> {
  const session = await resolveAccessToken(token)
  if (!session) return null

  return toSessionUser(session.user)
}

/** Authenticate an access JWT and expose its expiry for the WebSocket lifetime. */
export async function authenticateWebSocketAccessToken(
  token: string,
): Promise<WebSocketAccessSession | null> {
  const session = await resolveAccessToken(token)
  if (!session) return null

  const expiresAtSeconds = decodeJwt(token).exp
  if (typeof expiresAtSeconds !== 'number' || !Number.isFinite(expiresAtSeconds)) {
    return null
  }

  const expiresAt = new Date(expiresAtSeconds * 1000)
  if (expiresAt.getTime() <= Date.now()) return null

  return {
    user: toSessionUser(session.user),
    expiresAt,
    tokenVersion: session.payload.tokenVersion,
  }
}

export async function authenticateRefreshToken(
  token: string,
  expectedClientType: RefreshTokenRecord['clientType'] = 'WEB',
): Promise<{
  payload: TokenPayload
  sessionUser: SessionUser
  storedToken: RefreshTokenRecord
} | null> {
  const payload = await verifyToken(token)

  if (payload.type !== 'refresh') {
    return null
  }

  const storedToken = await findRefreshTokenRecord(token)
  if (
    !storedToken
    || storedToken.clientType !== expectedClientType
    || storedToken.revokedAt
    || storedToken.expiresAt < new Date()
  ) {
    return null
  }

  if (!isUserActive(storedToken.user, payload)) {
    return null
  }

  return {
    payload,
    sessionUser: toSessionUser(storedToken.user),
    storedToken,
  }
}

export async function deleteStoredRefreshToken(token: string, userId?: bigint) {
  const tokenHash = sha256Hex(token)

  return prisma.refreshToken.deleteMany({
    where: {
      token: { in: [tokenHash, token] },
      ...(userId ? { userId } : {}),
    },
  })
}
