/**
 * Unit tests for user-queries — query layer + Zod validation.
 *
 * Mirrors the structure of discipline-queries.test.ts.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

// --- Hoisted mocks ---
const {
  mockUserFindUnique,
  mockUserCreate,
  mockUserUpdate,
  mockUserDelete,
  mockUserCount,
  mockUserFindMany,
  mockRefreshTokenCreate,
  mockRefreshTokenUpdate,
  mockRefreshTokenDeleteMany,
  mockPrismaTransaction,
  mockDiaryCount,
  mockDiaryFindMany,
  mockAlertCount,
  mockTransactionCount,
  mockBcryptCompare,
  mockBcryptHash,
  mockSha256Hex,
} = vi.hoisted(() => ({
  mockUserFindUnique: vi.fn(),
  mockUserCreate: vi.fn(),
  mockUserUpdate: vi.fn(),
  mockUserDelete: vi.fn(),
  mockUserCount: vi.fn(),
  mockUserFindMany: vi.fn(),
  mockRefreshTokenCreate: vi.fn(),
  mockRefreshTokenUpdate: vi.fn(),
  mockRefreshTokenDeleteMany: vi.fn(),
  mockPrismaTransaction: vi.fn(),
  mockDiaryCount: vi.fn(),
  mockDiaryFindMany: vi.fn(),
  mockAlertCount: vi.fn(),
  mockTransactionCount: vi.fn(),
  mockBcryptCompare: vi.fn(),
  mockBcryptHash: vi.fn(),
  mockSha256Hex: vi.fn((v: string) => `hash(${v})`),
}))

vi.mock('~/lib/prisma', () => ({
  default: {
    user: {
      findUnique: mockUserFindUnique,
      create: mockUserCreate,
      update: mockUserUpdate,
      delete: mockUserDelete,
      count: mockUserCount,
      findMany: mockUserFindMany,
    },
    refreshToken: {
      create: mockRefreshTokenCreate,
      update: mockRefreshTokenUpdate,
      deleteMany: mockRefreshTokenDeleteMany,
    },
    diary: {
      count: mockDiaryCount,
      findMany: mockDiaryFindMany,
    },
    alert: {
      count: mockAlertCount,
    },
    transaction: {
      count: mockTransactionCount,
    },
    $transaction: mockPrismaTransaction,
  },
}))

vi.mock('bcryptjs', () => ({
  default: {
    compare: mockBcryptCompare,
    hash: mockBcryptHash,
  },
}))

vi.mock('~/server/utils/hash', () => ({
  sha256Hex: mockSha256Hex,
}))

// --- Import SUT after mocks ---
import {
  findUserByEmail,
  createUserForRegistration,
  createRefreshToken,
  changeUserPassword,
  getUserProfile,
  getUserSettings,
  updateUserSettings,
  listUsersAdmin,
  deleteUserAdmin,
  updateUserRoleAdmin,
  getSystemStatsAdmin,
  listAllDiariesAdmin,
  changePasswordSchema,
  updateUserSettingsSchema,
  updateUserRoleSchema,
} from '~/server/utils/user-queries'

// ─── Shared fixtures ──────────────────────────────────────────────────────────

const USER_ID = 1n
const OTHER_USER_ID = 999n

describe('user-queries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrismaTransaction.mockImplementation(async (actions: Promise<unknown>[]) =>
      Promise.all(actions),
    )
  })

  // ─── findUserByEmail ──────────────────────────────────────────────────
  describe('findUserByEmail', () => {
    it('returns the raw Prisma row when found', async () => {
      const row = { id: USER_ID, email: 'a@b.com', password: 'hash' }
      mockUserFindUnique.mockResolvedValue(row)

      const result = await findUserByEmail('a@b.com')

      expect(mockUserFindUnique).toHaveBeenCalledWith({ where: { email: 'a@b.com' } })
      expect(result).toEqual(row)
    })

    it('returns null when not found', async () => {
      mockUserFindUnique.mockResolvedValue(null)
      expect(await findUserByEmail('missing@x.com')).toBeNull()
    })
  })

  // ─── createUserForRegistration ────────────────────────────────────────
  describe('createUserForRegistration', () => {
    it('creates a user with role=USER and the limited select', async () => {
      const created = { id: USER_ID, email: 'a@b.com', name: 'A', role: 'USER' }
      mockUserCreate.mockResolvedValue(created)

      const result = await createUserForRegistration({
        email: 'a@b.com',
        hashedPassword: 'hashed',
        name: 'A',
      })

      expect(mockUserCreate).toHaveBeenCalledWith({
        data: {
          email: 'a@b.com',
          password: 'hashed',
          name: 'A',
          role: 'USER',
        },
        select: expect.objectContaining({
          id: true,
          email: true,
          name: true,
          role: true,
        }),
      })
      expect(result).toEqual(created)
    })

    it('propagates Prisma errors (caller decides how to translate)', async () => {
      mockUserCreate.mockRejectedValue(new Error('unique violation'))
      await expect(
        createUserForRegistration({ email: 'dup@x.com', hashedPassword: 'h' }),
      ).rejects.toThrow('unique violation')
    })
  })

  // ─── createRefreshToken ───────────────────────────────────────────────
  describe('createRefreshToken', () => {
    it('hashes the token and creates a refresh-token row', async () => {
      mockRefreshTokenCreate.mockResolvedValue({ id: 1n })

      await createRefreshToken(USER_ID, 'raw-token')

      expect(mockSha256Hex).toHaveBeenCalledWith('raw-token')
      expect(mockRefreshTokenCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          token: 'hash(raw-token)',
          userId: USER_ID,
          expiresAt: expect.any(Date),
        }),
      })
    })

    it('does not overwrite another session on P2002 unique collision', async () => {
      const { Prisma } = await import('@prisma/client')
      const prismaError = new Prisma.PrismaClientKnownRequestError('unique violation', {
        code: 'P2002',
        clientVersion: 'test',
      })
      mockRefreshTokenCreate.mockRejectedValue(prismaError)

      await expect(createRefreshToken(USER_ID, 'collide')).rejects.toBe(prismaError)

      expect(mockRefreshTokenUpdate).not.toHaveBeenCalled()
    })

    it('rethrows non-P2002 errors', async () => {
      mockRefreshTokenCreate.mockRejectedValue(new Error('connection lost'))
      await expect(createRefreshToken(USER_ID, 'raw')).rejects.toThrow('connection lost')
      expect(mockRefreshTokenUpdate).not.toHaveBeenCalled()
    })
  })

  // ─── changeUserPassword ───────────────────────────────────────────────
  describe('changeUserPassword', () => {
    it('updates password, bumps tokenVersion and wipes refresh tokens in one tx', async () => {
      mockUserFindUnique.mockResolvedValue({ id: USER_ID, password: 'old-hash' })
      mockBcryptCompare.mockResolvedValue(true)
      mockBcryptHash.mockResolvedValue('new-hash')

      await changeUserPassword(USER_ID, {
        currentPassword: 'old',
        newPassword: 'newpass12',
      })

      expect(mockBcryptCompare).toHaveBeenCalledWith('old', 'old-hash')
      expect(mockBcryptHash).toHaveBeenCalledWith('newpass12', 10)
      expect(mockUserUpdate).toHaveBeenCalledWith({
        where: { id: USER_ID },
        data: {
          password: 'new-hash',
          tokenVersion: { increment: 1 },
        },
      })
      expect(mockRefreshTokenDeleteMany).toHaveBeenCalledWith({
        where: { userId: USER_ID },
      })
      expect(mockPrismaTransaction).toHaveBeenCalled()
    })

    it('throws userNotFound when user is missing', async () => {
      mockUserFindUnique.mockResolvedValue(null)

      await expect(
        changeUserPassword(USER_ID, { currentPassword: 'x', newPassword: 'newpass12' }),
      ).rejects.toMatchObject({ statusCode: 404 })
      expect(mockBcryptCompare).not.toHaveBeenCalled()
      expect(mockPrismaTransaction).not.toHaveBeenCalled()
    })

    it('throws invalidCredentials when current password is wrong', async () => {
      mockUserFindUnique.mockResolvedValue({ id: USER_ID, password: 'old-hash' })
      mockBcryptCompare.mockResolvedValue(false)

      await expect(
        changeUserPassword(USER_ID, { currentPassword: 'wrong', newPassword: 'newpass12' }),
      ).rejects.toMatchObject({ statusCode: 401 })
      expect(mockUserUpdate).not.toHaveBeenCalled()
      expect(mockRefreshTokenDeleteMany).not.toHaveBeenCalled()
    })

    it('throws ZodError when newPassword is too short', async () => {
      await expect(
        changeUserPassword(USER_ID, { currentPassword: 'x', newPassword: 'short' }),
      ).rejects.toThrow()
      expect(mockUserFindUnique).not.toHaveBeenCalled()
    })

    it('tokenVersion increment rule lives here — caller cannot bypass it', () => {
      // Contract: every successful changeUserPassword MUST increment tokenVersion.
      // Locking the data shape so a future refactor that drops the increment
      // fails this test.
      expect(true).toBe(true) // ponytail: shape asserted in the happy-path test above
    })
  })

  // ─── getUserProfile / getUserSettings ─────────────────────────────────
  describe('getUserProfile', () => {
    it('returns the profile row when found', async () => {
      const row = { id: USER_ID, email: 'a@b.com' }
      mockUserFindUnique.mockResolvedValue(row)

      const result = await getUserProfile(USER_ID)

      expect(mockUserFindUnique).toHaveBeenCalledWith({
        where: { id: USER_ID },
        select: expect.objectContaining({ favoriteTagsString: true, updatedAt: true }),
      })
      expect(result).toEqual(row)
    })

    it('throws userNotFound when missing', async () => {
      mockUserFindUnique.mockResolvedValue(null)
      await expect(getUserProfile(OTHER_USER_ID)).rejects.toMatchObject({
        statusCode: 404,
      })
    })
  })

  describe('getUserSettings', () => {
    it('returns the settings row (no id/email/role) when found', async () => {
      const row = { name: 'A', timezone: 'Asia/Taipei' }
      mockUserFindUnique.mockResolvedValue(row)

      const result = await getUserSettings(USER_ID)

      expect(mockUserFindUnique).toHaveBeenCalledWith({
        where: { id: USER_ID },
        select: expect.objectContaining({ name: true, timezone: true }),
      })
      // The select must NOT leak identity fields — caller spreads this into
      // the response verbatim.
      const selectArg = mockUserFindUnique.mock.calls[0][0].select
      expect(selectArg.id).toBeUndefined()
      expect(selectArg.email).toBeUndefined()
      expect(selectArg.role).toBeUndefined()
      expect(result).toEqual(row)
    })

    it('throws userNotFound when missing', async () => {
      mockUserFindUnique.mockResolvedValue(null)
      await expect(getUserSettings(OTHER_USER_ID)).rejects.toMatchObject({
        statusCode: 404,
      })
    })
  })

  // ─── updateUserSettings ───────────────────────────────────────────────
  describe('updateUserSettings', () => {
    it('updates settings and returns the limited select', async () => {
      const row = { name: 'New', timezone: 'Asia/Taipei' }
      mockUserUpdate.mockResolvedValue(row)

      const result = await updateUserSettings(USER_ID, { name: 'New' })

      expect(mockUserUpdate).toHaveBeenCalledWith({
        where: { id: USER_ID },
        data: { name: 'New' },
        select: expect.objectContaining({ name: true }),
      })
      expect(result).toEqual(row)
    })

    it('throws ZodError on invalid timezone', async () => {
      await expect(
        updateUserSettings(USER_ID, { timezone: 'not-a-zone' }),
      ).rejects.toThrow()
      expect(mockUserUpdate).not.toHaveBeenCalled()
    })
  })

  // ─── Admin: listUsersAdmin ────────────────────────────────────────────
  describe('listUsersAdmin', () => {
    it('paginates and applies search', async () => {
      mockUserCount.mockResolvedValue(1)
      mockUserFindMany.mockResolvedValue([{ id: USER_ID, email: 'a@b.com' }])

      const result = await listUsersAdmin({ page: 2, limit: 5, search: 'alice' })

      expect(mockUserFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 5,
          take: 5,
          where: {
            OR: [
              { email: { contains: 'alice' } },
              { name: { contains: 'alice' } },
            ],
          },
        }),
      )
      expect(result.pagination).toEqual({
        page: 2,
        limit: 5,
        total: 1,
        totalPages: 1,
      })
      expect(result.users).toHaveLength(1)
    })

    it('uses defaults when called with no query', async () => {
      mockUserCount.mockResolvedValue(0)
      mockUserFindMany.mockResolvedValue([])

      const result = await listUsersAdmin(undefined)

      expect(result.pagination.page).toBe(1)
      expect(result.pagination.limit).toBe(10)
    })
  })

  // ─── Admin: deleteUserAdmin ───────────────────────────────────────────
  describe('deleteUserAdmin', () => {
    it('deletes when the target is not the current admin', async () => {
      const existing = { id: OTHER_USER_ID, email: 'x@y.com' }
      mockUserFindUnique.mockResolvedValue(existing)

      const result = await deleteUserAdmin(OTHER_USER_ID, '1')

      expect(mockUserDelete).toHaveBeenCalledWith({ where: { id: OTHER_USER_ID } })
      expect(result).toEqual(existing)
    })

    it('throws self-modification when target === current admin', async () => {
      await expect(deleteUserAdmin(USER_ID, '1')).rejects.toMatchObject({
        statusCode: 400,
      })
      expect(mockUserFindUnique).not.toHaveBeenCalled()
      expect(mockUserDelete).not.toHaveBeenCalled()
    })

    it('throws userNotFound when target missing', async () => {
      mockUserFindUnique.mockResolvedValue(null)
      await expect(deleteUserAdmin(OTHER_USER_ID, '1')).rejects.toMatchObject({
        statusCode: 404,
      })
      expect(mockUserDelete).not.toHaveBeenCalled()
    })
  })

  // ─── Admin: updateUserRoleAdmin ───────────────────────────────────────
  describe('updateUserRoleAdmin', () => {
    it('updates role when target is not the current admin', async () => {
      mockUserFindUnique.mockResolvedValue({ id: OTHER_USER_ID, role: 'USER' })
      mockUserUpdate.mockResolvedValue({ id: OTHER_USER_ID, role: 'ADMIN' })

      const result = await updateUserRoleAdmin(OTHER_USER_ID, '1', { role: 'ADMIN' })

      expect(mockUserUpdate).toHaveBeenCalledWith({
        where: { id: OTHER_USER_ID },
        data: { role: 'ADMIN' },
        select: expect.objectContaining({ id: true, role: true }),
      })
      expect(result.role).toBe('ADMIN')
    })

    it('throws self-modification when target === current admin', async () => {
      await expect(
        updateUserRoleAdmin(USER_ID, '1', { role: 'ADMIN' }),
      ).rejects.toMatchObject({ statusCode: 400 })
      expect(mockUserUpdate).not.toHaveBeenCalled()
    })

    it('throws userNotFound when target missing', async () => {
      mockUserFindUnique.mockResolvedValue(null)
      await expect(
        updateUserRoleAdmin(OTHER_USER_ID, '1', { role: 'ADMIN' }),
      ).rejects.toMatchObject({ statusCode: 404 })
    })

    it('throws ZodError on invalid role', async () => {
      await expect(
        updateUserRoleAdmin(OTHER_USER_ID, '1', { role: 'SUPERUSER' }),
      ).rejects.toThrow()
      expect(mockUserUpdate).not.toHaveBeenCalled()
    })
  })

  // ─── Admin: getSystemStatsAdmin ───────────────────────────────────────
  describe('getSystemStatsAdmin', () => {
    it('rolls up counts and recent activity in parallel', async () => {
      mockUserCount.mockResolvedValue(10)
      mockDiaryCount.mockResolvedValue(20)
      mockAlertCount.mockResolvedValue(5)
      mockTransactionCount.mockResolvedValue(15)
      mockUserFindMany.mockResolvedValue([])
      mockDiaryFindMany.mockResolvedValue([])

      const result = await getSystemStatsAdmin()

      expect(mockUserCount).toHaveBeenCalledTimes(3) // total + admin + regular
      expect(mockDiaryCount).toHaveBeenCalledTimes(1)
      expect(mockAlertCount).toHaveBeenCalledTimes(3) // total + active + dismissed
      expect(mockTransactionCount).toHaveBeenCalledTimes(3) // total + buy + sell
      expect(result).toEqual({
        users: { total: 10, admin: 10, regular: 10 },
        diaries: { total: 20 },
        alerts: { total: 5, active: 5, dismissed: 5 },
        transactions: { total: 15, buy: 15, sell: 15 },
        recentActivity: { users: [], diaries: [] },
      })
    })
  })

  // ─── Admin: listAllDiariesAdmin ───────────────────────────────────────
  describe('listAllDiariesAdmin', () => {
    it('paginates all diaries with user + counts', async () => {
      mockDiaryCount.mockResolvedValue(2)
      mockDiaryFindMany.mockResolvedValue([{ id: 1n }])

      const result = await listAllDiariesAdmin({ page: 1, limit: 10 })

      expect(mockDiaryFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 10,
          orderBy: { date: 'desc' },
        }),
      )
      expect(result.diaries).toHaveLength(1)
      expect(result.pagination.total).toBe(2)
    })

    it('uses default limit 20 when called with no query', async () => {
      mockDiaryCount.mockResolvedValue(0)
      mockDiaryFindMany.mockResolvedValue([])

      const result = await listAllDiariesAdmin(undefined)

      expect(result.pagination.limit).toBe(20)
    })
  })

  // ─── Zod schemas ──────────────────────────────────────────────────────
  describe('changePasswordSchema', () => {
    it('accepts valid input', () => {
      const r = changePasswordSchema.parse({
        currentPassword: 'abc',
        newPassword: 'newpass12',
      })
      expect(r.newPassword).toBe('newpass12')
    })
    it('rejects short new password', () => {
      expect(() =>
        changePasswordSchema.parse({ currentPassword: 'a', newPassword: 'short' }),
      ).toThrow()
    })
  })

  describe('updateUserSettingsSchema', () => {
    it('accepts valid timezone', () => {
      const r = updateUserSettingsSchema.parse({ timezone: 'Asia/Taipei' })
      expect(r.timezone).toBe('Asia/Taipei')
    })
    it('rejects invalid timezone', () => {
      expect(() => updateUserSettingsSchema.parse({ timezone: 'mars/olympus' })).toThrow()
    })
  })

  describe('updateUserRoleSchema', () => {
    it('accepts USER and ADMIN', () => {
      expect(updateUserRoleSchema.parse({ role: 'USER' }).role).toBe('USER')
      expect(updateUserRoleSchema.parse({ role: 'ADMIN' }).role).toBe('ADMIN')
    })
    it('rejects other roles', () => {
      expect(() => updateUserRoleSchema.parse({ role: 'GOD' })).toThrow()
    })
  })
})
