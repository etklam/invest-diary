import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  user: null as any,
  findUserByEmail: vi.fn(),
  compare: vi.fn(),
  signAccessToken: vi.fn(),
  signRefreshToken: vi.fn(),
  verifyToken: vi.fn(),
  refreshCreate: vi.fn(),
  refreshFindUnique: vi.fn(),
  refreshUpdate: vi.fn(),
  refreshUpdateMany: vi.fn(),
  transaction: vi.fn(),
}))

vi.mock('bcryptjs', () => ({ default: { compare: mocks.compare } }))
vi.mock('~/server/utils/user-queries', () => ({ findUserByEmail: mocks.findUserByEmail }))
vi.mock('~/server/utils/hash', () => ({ sha256Hex: (value: string) => `hash:${value}` }))
vi.mock('~/lib/jwt', () => ({
  ACCESS_TOKEN_MAX_AGE_SECONDS: 3600,
  REFRESH_TOKEN_MAX_AGE_SECONDS: 2592000,
  signAccessToken: mocks.signAccessToken,
  signRefreshToken: mocks.signRefreshToken,
  verifyToken: mocks.verifyToken,
}))
vi.mock('~/lib/prisma', () => ({
  default: {
    refreshToken: {
      create: mocks.refreshCreate,
      findUnique: mocks.refreshFindUnique,
      update: mocks.refreshUpdate,
      updateMany: mocks.refreshUpdateMany,
    },
    $transaction: mocks.transaction,
  },
}))

import {
  loginNative,
  logoutNativeFamily,
  rotateNativeRefreshToken,
} from '~/server/utils/native-auth-session'

const user = {
  id: 7n,
  email: 'native@example.com',
  password: 'hash',
  name: 'Native User',
  role: 'USER' as const,
  tokenVersion: 3,
  expectedMonthlyTrades: 12,
  expectedProfit: { toString: () => '100.00' },
  expectedAvgHolding: { toString: () => '5.00' },
  timezone: 'Asia/Taipei',
}

describe('native auth sessions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.findUserByEmail.mockResolvedValue(user)
    mocks.compare.mockResolvedValue(true)
    mocks.signAccessToken.mockResolvedValue('access-A')
    mocks.signRefreshToken.mockResolvedValue('refresh-A')
    mocks.verifyToken.mockResolvedValue({
      userId: '7', email: user.email, role: 'USER', tokenVersion: 3, type: 'refresh',
    })
    mocks.refreshCreate.mockResolvedValue({ id: 11n })
    mocks.refreshUpdate.mockResolvedValue({ id: 10n })
    mocks.refreshUpdateMany.mockResolvedValue({ count: 1 })
    mocks.transaction.mockImplementation(async (callback: (tx: any) => unknown) => callback({
      refreshToken: {
        create: mocks.refreshCreate,
        update: mocks.refreshUpdate,
        updateMany: mocks.refreshUpdateMany,
      },
    }))
  })

  it('issues a cookie-independent JSON token pair in a new native family', async () => {
    const result = await loginNative({
      email: user.email,
      password: 'secret',
      deviceName: 'iPhone',
    })

    expect(result).toMatchObject({
      accessToken: 'access-A',
      refreshToken: 'refresh-A',
      user: { id: '7', email: user.email, expectedProfit: '100.00' },
    })
    expect(result.accessTokenExpiresAt).toMatch(/Z$/)
    expect(result.refreshTokenExpiresAt).toMatch(/Z$/)
    expect(mocks.refreshCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        token: 'hash:refresh-A',
        userId: 7n,
        clientType: 'NATIVE',
        familyId: expect.any(String),
        deviceName: 'iPhone',
      }),
    })
  })

  it('atomically revokes A, creates B, and records both lineage links', async () => {
    mocks.signAccessToken.mockResolvedValue('access-B')
    mocks.signRefreshToken.mockResolvedValue('refresh-B')
    mocks.refreshFindUnique.mockResolvedValue({
      id: 10n,
      token: 'hash:refresh-A',
      userId: 7n,
      clientType: 'NATIVE',
      familyId: 'family-1',
      deviceName: 'iPhone',
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      user,
    })

    const result = await rotateNativeRefreshToken('refresh-A')

    expect(result.refreshToken).toBe('refresh-B')
    expect(mocks.transaction).toHaveBeenCalledTimes(1)
    expect(mocks.refreshUpdateMany).toHaveBeenCalledWith({
      where: { id: 10n, revokedAt: null },
      data: { revokedAt: expect.any(Date), revocationReason: 'ROTATED' },
    })
    expect(mocks.refreshCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        token: 'hash:refresh-B',
        familyId: 'family-1',
        parentId: 10n,
      }),
    })
    expect(mocks.refreshUpdate).toHaveBeenCalledWith({
      where: { id: 10n },
      data: { replacementId: 11n },
    })
  })

  it('contains stale-token replay to the matching family', async () => {
    mocks.refreshFindUnique.mockResolvedValue({
      id: 10n,
      userId: 7n,
      clientType: 'NATIVE',
      familyId: 'compromised-family',
      revokedAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
      user,
    })

    await expect(rotateNativeRefreshToken('refresh-A')).rejects.toMatchObject({ statusCode: 401 })
    expect(mocks.refreshUpdateMany).toHaveBeenCalledWith({
      where: {
        userId: 7n,
        familyId: 'compromised-family',
        clientType: 'NATIVE',
        revokedAt: null,
      },
      data: { revokedAt: expect.any(Date), revocationReason: 'REUSE_DETECTED' },
    })
  })

  it('logout-one is idempotent and revokes only its native family', async () => {
    mocks.refreshFindUnique
      .mockResolvedValueOnce({ userId: 7n, familyId: 'family-1', clientType: 'NATIVE' })
      .mockResolvedValueOnce(null)

    await logoutNativeFamily('refresh-A')
    await logoutNativeFamily('already-gone')

    expect(mocks.refreshUpdateMany).toHaveBeenCalledTimes(1)
    expect(mocks.refreshUpdateMany).toHaveBeenCalledWith({
      where: {
        userId: 7n,
        familyId: 'family-1',
        clientType: 'NATIVE',
        revokedAt: null,
      },
      data: { revokedAt: expect.any(Date), revocationReason: 'LOGOUT' },
    })
  })
})
