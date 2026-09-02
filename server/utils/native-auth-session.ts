import bcrypt from 'bcryptjs'
import { randomUUID } from 'node:crypto'
import type { Prisma } from '@prisma/client'
import prisma from '~/lib/prisma'
import { Errors } from '~/lib/errors/factory'
import {
  ACCESS_TOKEN_MAX_AGE_SECONDS,
  REFRESH_TOKEN_MAX_AGE_SECONDS,
  signAccessToken,
  signRefreshToken,
  verifyToken,
} from '~/lib/jwt'
import type { AuthUser, NativeLoginRequest, NativeTokenPair } from '~/lib/contracts/auth'
import { sha256Hex } from '~/server/utils/hash'
import { findUserByEmail } from '~/server/utils/user-queries'

const AUTH_USER_SELECT = {
  id: true,
  email: true,
  password: true,
  name: true,
  role: true,
  tokenVersion: true,
  expectedMonthlyTrades: true,
  expectedProfit: true,
  expectedAvgHolding: true,
  timezone: true,
} as const

type NativeAuthUserRecord = NonNullable<Awaited<ReturnType<typeof findUserByEmail>>>

function mapAuthUser(user: NativeAuthUserRecord): AuthUser {
  return {
    id: user.id.toString(),
    email: user.email,
    name: user.name,
    role: user.role,
    expectedMonthlyTrades: user.expectedMonthlyTrades,
    expectedProfit: user.expectedProfit.toString(),
    expectedAvgHolding: user.expectedAvgHolding.toString(),
    timezone: user.timezone,
  }
}

async function buildTokenPair(
  user: NativeAuthUserRecord,
): Promise<{
  pair: NativeTokenPair
  rawRefreshToken: string
  refreshExpiresAt: Date
}> {
  const issuedAt = Date.now()
  const accessToken = await signAccessToken(
    user.id.toString(), user.email, user.role, user.tokenVersion,
  )
  const rawRefreshToken = await signRefreshToken(
    user.id.toString(), user.email, user.role, user.tokenVersion,
  )

  const refreshExpiresAt = new Date(issuedAt + REFRESH_TOKEN_MAX_AGE_SECONDS * 1000)

  return {
    rawRefreshToken,
    refreshExpiresAt,
    pair: {
      accessToken,
      refreshToken: rawRefreshToken,
      accessTokenExpiresAt: new Date(issuedAt + ACCESS_TOKEN_MAX_AGE_SECONDS * 1000).toISOString(),
      refreshTokenExpiresAt: refreshExpiresAt.toISOString(),
      user: mapAuthUser(user),
    },
  }
}

export async function loginNative(input: NativeLoginRequest): Promise<NativeTokenPair> {
  const user = await findUserByEmail(input.email)
  if (!user || !(await bcrypt.compare(input.password, user.password))) {
    throw Errors.invalidCredentials().toH3Error()
  }

  const familyId = randomUUID()
  const { pair, rawRefreshToken, refreshExpiresAt } = await buildTokenPair(user)
  await prisma.refreshToken.create({
    data: {
      token: sha256Hex(rawRefreshToken),
      userId: user.id,
      clientType: 'NATIVE',
      familyId,
      deviceName: input.deviceName,
      expiresAt: refreshExpiresAt,
    },
  })
  return pair
}

class ConcurrentRefreshReuseError extends Error {}

async function revokeFamily(userId: bigint, familyId: string, reason: 'LOGOUT' | 'REUSE_DETECTED') {
  await prisma.refreshToken.updateMany({
    where: { userId, familyId, clientType: 'NATIVE', revokedAt: null },
    data: { revokedAt: new Date(), revocationReason: reason },
  })
}

export async function rotateNativeRefreshToken(rawToken: string): Promise<NativeTokenPair> {
  const payload = await verifyToken(rawToken).catch(() => null)
  if (!payload || payload.type !== 'refresh') throw Errors.tokenInvalid().toH3Error()

  const stored = await prisma.refreshToken.findUnique({
    where: { token: sha256Hex(rawToken) },
    include: { user: { select: AUTH_USER_SELECT } },
  })
  if (!stored || stored.clientType !== 'NATIVE') throw Errors.tokenNotFound().toH3Error()

  if (stored.revokedAt) {
    await revokeFamily(stored.userId, stored.familyId, 'REUSE_DETECTED')
    throw Errors.tokenRevoked().toH3Error()
  }
  if (stored.expiresAt <= new Date()) {
    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date(), revocationReason: 'EXPIRED' },
    })
    throw Errors.tokenExpired().toH3Error()
  }
  if (stored.user.tokenVersion !== payload.tokenVersion) {
    throw Errors.tokenRevoked().toH3Error()
  }

  const tokenMaterial = await buildTokenPair(stored.user as NativeAuthUserRecord)
  try {
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const claimed = await tx.refreshToken.updateMany({
        where: { id: stored.id, revokedAt: null },
        data: { revokedAt: new Date(), revocationReason: 'ROTATED' },
      })
      if (claimed.count !== 1) throw new ConcurrentRefreshReuseError()

      const replacement = await tx.refreshToken.create({
        data: {
          token: sha256Hex(tokenMaterial.rawRefreshToken),
          userId: stored.userId,
          clientType: 'NATIVE',
          familyId: stored.familyId,
          deviceName: stored.deviceName,
          parentId: stored.id,
          expiresAt: tokenMaterial.refreshExpiresAt,
        },
      })
      await tx.refreshToken.update({
        where: { id: stored.id },
        data: { replacementId: replacement.id },
      })
    })
  } catch (error) {
    if (!(error instanceof ConcurrentRefreshReuseError)) throw error
    await revokeFamily(stored.userId, stored.familyId, 'REUSE_DETECTED')
    throw Errors.tokenRevoked().toH3Error()
  }

  return tokenMaterial.pair
}

export async function logoutNativeFamily(rawToken: string): Promise<void> {
  const stored = await prisma.refreshToken.findUnique({
    where: { token: sha256Hex(rawToken) },
    select: { userId: true, familyId: true, clientType: true },
  })
  if (!stored || stored.clientType !== 'NATIVE') return
  await revokeFamily(stored.userId, stored.familyId, 'LOGOUT')
}
