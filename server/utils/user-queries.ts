/**
 * User query layer — auth writes, profile/settings reads & writes, and the
 * admin-facing user management ops that were previously inline in handlers.
 *
 * Validation via Zod, ownership verification via findFirst/findUnique that
 * does not leak existence of rows not owned by the caller. Returns raw Prisma
 * results; handlers call serialize().
 *
 * tokenVersion rule lives here: changeUserPassword bumps tokenVersion inside
 * the same $transaction that wipes refresh tokens, so any outstanding access
 * token (carrying the old tokenVersion) is rejected by auth-session on the
 * next request.
 *
 * Symmetric with discipline-queries.ts in structure.
 */

import type { Prisma } from '@prisma/client'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import prisma from '~/lib/prisma'
import { Errors } from '~/lib/errors/factory'
import { sha256Hex } from '~/server/utils/hash'
import { REFRESH_TOKEN_MAX_AGE_SECONDS } from '~/lib/jwt'
import { randomUUID } from 'node:crypto'
import {
  isValidIanaTimezone,
  normalizeInput,
  optionalNormalizedString,
} from '~/server/utils/validation'
import {
  loginRequestSchema as canonicalLoginRequestSchema,
  registerRequestSchema as canonicalRegisterRequestSchema,
} from '~/lib/contracts/auth'
import { connectionManager } from '~/server/websocket/connectionManager'

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

export const loginUserSchema = canonicalLoginRequestSchema

export const registerUserSchema = canonicalRegisterRequestSchema

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
})

export const updateUserSettingsSchema = z.object({
  name: optionalNormalizedString(100),
  expectedMonthlyTrades: z.coerce.number().int().min(0).optional(),
  expectedProfit: z.coerce.number().optional(),
  expectedAvgHolding: z.coerce.number().optional(),
  timezone: z
    .union([z.string(), z.undefined()])
    .transform((value) => (value ? normalizeInput(value) : undefined))
    .refine((value) => value === undefined || isValidIanaTimezone(value), {
      message: 'Invalid timezone',
    }),
})

export const updateUserRoleSchema = z.object({
  role: z.enum(['USER', 'ADMIN']),
})

export const listUsersAdminSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).default(10),
  search: z.string().trim().optional(),
})

export const listAllDiariesAdminSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).default(20),
})

export type LoginUserInput = z.infer<typeof loginUserSchema>
export type RegisterUserInput = z.infer<typeof registerUserSchema>
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
export type UpdateUserSettingsInput = z.infer<typeof updateUserSettingsSchema>
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>
export type ListUsersAdminInput = z.infer<typeof listUsersAdminSchema>
export type ListAllDiariesAdminInput = z.infer<typeof listAllDiariesAdminSchema>

// ─── Select helpers (DRY) ─────────────────────────────────────────────────────

const USER_SETTINGS_SELECT = {
  name: true,
  expectedMonthlyTrades: true,
  expectedProfit: true,
  expectedAvgHolding: true,
  timezone: true,
} as const

const USER_PROFILE_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  expectedMonthlyTrades: true,
  expectedProfit: true,
  expectedAvgHolding: true,
  timezone: true,
  favoriteTagsString: true,
  createdAt: true,
  updatedAt: true,
} as const

type UserTimezoneClient = Pick<Prisma.TransactionClient, 'user'>

async function resolveUserTimezone(client: UserTimezoneClient, userId: bigint): Promise<string> {
  const user = await client.user.findUnique({
    where: { id: userId },
    select: { timezone: true },
  })
  return user?.timezone ?? 'Asia/Taipei'
}

/** Read the canonical timezone for a user, with the schema default fallback. */
export async function getUserTimezone(
  userId: bigint,
  client: UserTimezoneClient = prisma,
): Promise<string> {
  return resolveUserTimezone(client, userId)
}

// ─── Auth / Session writes ────────────────────────────────────────────────────

/**
 * Find a user by email. Returns the raw Prisma row (includes password hash —
 * caller must not serialize password into responses).
 */
export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } })
}

/**
 * Create a new user with role=USER. Password must already be hashed.
 * Used by registration. Throws Prisma unique-constraint error on email clash;
 * handlers decide how to translate that (the register handler checks
 * existence first via findUserByEmail and throws userEmailExists).
 */
export async function createUserForRegistration(input: {
  email: string
  hashedPassword: string
  name?: string
}) {
  return prisma.user.create({
    data: {
      email: input.email,
      password: input.hashedPassword,
      name: input.name,
      role: 'USER',
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      expectedMonthlyTrades: true,
      expectedProfit: true,
      expectedAvgHolding: true,
      createdAt: true,
    },
  })
}

/**
 * Persist a refresh token for a user. Hashes the raw token with sha256Hex.
 * A refresh token is one independent session. A unique collision must never
 * rebind another session's row, so P2002 is allowed to propagate.
 */
export async function createRefreshToken(
  userId: bigint,
  rawToken: string,
): Promise<void> {
  const tokenHash = sha256Hex(rawToken)
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_MAX_AGE_SECONDS * 1000)

  try {
    await prisma.refreshToken.create({
      data: {
        token: tokenHash,
        userId,
        clientType: 'WEB',
        familyId: randomUUID(),
        expiresAt,
      },
    })
  } catch (error) {
    // Never overwrite a row belonging to another refresh session.
    throw error
  }
}

/** Revoke every refresh family and invalidate all outstanding access JWTs. */
export async function logoutAllSessions(userId: bigint): Promise<void> {
  const revokedAt = new Date()
  const [updatedUser] = await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { tokenVersion: { increment: 1 } },
      select: { tokenVersion: true },
    }),
    prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt, revocationReason: 'LOGOUT_ALL' },
    }),
  ])
  connectionManager.revokeUser(userId, updatedUser.tokenVersion)
}

/**
 * Change a user's password atomically.
 *
 * 1. Validate input via Zod.
 * 2. Look up the user (notFound if missing).
 * 3. bcrypt.compare current password (invalidCredentials if mismatch).
 * 4. Hash the new password.
 * 5. $transaction: update password + increment tokenVersion (invalidates all
 *    outstanding access tokens) + delete all refresh tokens.
 *
 * Caller is responsible for clearing auth cookies afterwards.
 */
export async function changeUserPassword(
  userId: bigint,
  input: unknown,
): Promise<void> {
  const validated = changePasswordSchema.parse(input)

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, password: true },
  })

  if (!user) {
    throw Errors.userNotFound().toH3Error()
  }

  const isValid = await bcrypt.compare(validated.currentPassword, user.password)
  if (!isValid) {
    throw Errors.invalidCredentials().toH3Error()
  }

  const hashedPassword = await bcrypt.hash(validated.newPassword, 10)

  const [updatedUser] = await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        tokenVersion: { increment: 1 },
      },
      select: { tokenVersion: true },
    }),
    prisma.refreshToken.deleteMany({ where: { userId } }),
  ])
  connectionManager.revokeUser(userId, updatedUser.tokenVersion)
}

// ─── Profile / Settings reads & writes ────────────────────────────────────────

/**
 * Get the user's full profile (used by GET /api/auth/me).
 * Throws userNotFound if missing — caller has a valid session, so absence is
 * a real 404 rather than an existence leak.
 */
export async function getUserProfile(userId: bigint) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: USER_PROFILE_SELECT,
  })

  if (!user) {
    throw Errors.userNotFound().toH3Error()
  }

  return user
}

/**
 * Get the user's settings (used by GET /api/user/settings).
 * Throws userNotFound if missing.
 */
export async function getUserSettings(userId: bigint) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: USER_SETTINGS_SELECT,
  })

  if (!user) {
    throw Errors.userNotFound().toH3Error()
  }

  return user
}

/**
 * Update the user's settings. Validates input via Zod.
 * Returns the updated settings row (no id/email/role).
 */
export async function updateUserSettings(userId: bigint, input: unknown) {
  const validated = updateUserSettingsSchema.parse(input)

  return prisma.user.update({
    where: { id: userId },
    data: validated,
    select: USER_SETTINGS_SELECT,
  })
}

// ─── Admin: user management ───────────────────────────────────────────────────
//
// Admin ops live in user-queries because their primary subject is the User
// entity. System stats and the global diary listing cross into Diary/Alert/
// Transaction, but they have no natural home in those bounded contexts (they
// are read-only roll-ups), and colocating them with the admin user ops keeps
// the admin handlers thin without inventing a separate admin-queries module.

const ADMIN_USER_LIST_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  createdAt: true,
  _count: { select: { diaries: true } },
} as const

/**
 * List users with pagination + optional email/name search. Admin-only.
 */
export async function listUsersAdmin(input: unknown) {
  const validated = listUsersAdminSchema.parse(input ?? {})
  const { page, limit, search } = validated
  const skip = (page - 1) * limit

  const where = search
    ? { OR: [{ email: { contains: search } }, { name: { contains: search } }] }
    : {}

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      select: ADMIN_USER_LIST_SELECT,
      orderBy: { createdAt: 'desc' },
    }),
  ])

  return {
    users,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}

/**
 * Delete a user (cascade deletes diaries/transactions/alerts/etc.).
 * Guards against self-deletion — admin cannot delete their own account.
 * Returns the deleted user row so the handler can log the email.
 */
export async function deleteUserAdmin(
  userId: bigint,
  currentAdminId: string,
) {
  if (userId.toString() === currentAdminId) {
    throw Errors.accountSelfModification('delete your own account').toH3Error()
  }

  const existingUser = await prisma.user.findUnique({
    where: { id: userId },
  })

  if (!existingUser) {
    throw Errors.userNotFound().toH3Error()
  }

  await prisma.user.delete({ where: { id: userId } })
  connectionManager.revokeUser(userId)

  return existingUser
}

/**
 * Update a user's role. Guards against self-modification.
 * Returns { id, email, name, role }.
 */
export async function updateUserRoleAdmin(
  userId: bigint,
  currentAdminId: string,
  input: unknown,
) {
  if (userId.toString() === currentAdminId) {
    throw Errors.accountSelfModification('modify your own role').toH3Error()
  }

  const validated = updateUserRoleSchema.parse(input)

  const existingUser = await prisma.user.findUnique({
    where: { id: userId },
  })

  if (!existingUser) {
    throw Errors.userNotFound().toH3Error()
  }

  return prisma.user.update({
    where: { id: userId },
    data: { role: validated.role },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
  })
}

/**
 * Roll up system-wide counts for the admin dashboard.
 * Crosses User/Diary/Alert/Transaction — read-only.
 */
export async function getSystemStatsAdmin() {
  const [
    totalUsers,
    adminUsers,
    regularUsers,
    totalDiaries,
    totalAlerts,
    activeAlerts,
    dismissedAlerts,
    totalTransactions,
    buyTransactions,
    sellTransactions,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: 'ADMIN' } }),
    prisma.user.count({ where: { role: 'USER' } }),
    prisma.diary.count(),
    prisma.alert.count(),
    prisma.alert.count({ where: { isDismissed: false } }),
    prisma.alert.count({ where: { isDismissed: true } }),
    prisma.transaction.count(),
    prisma.transaction.count({ where: { type: 'BUY' } }),
    prisma.transaction.count({ where: { type: 'SELL' } }),
  ])

  const [recentUsers, recentDiaries] = await Promise.all([
    prisma.user.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    }),
    prisma.diary.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    }),
  ])

  return {
    users: { total: totalUsers, admin: adminUsers, regular: regularUsers },
    diaries: { total: totalDiaries },
    alerts: { total: totalAlerts, active: activeAlerts, dismissed: dismissedAlerts },
    transactions: {
      total: totalTransactions,
      buy: buyTransactions,
      sell: sellTransactions,
    },
    recentActivity: { users: recentUsers, diaries: recentDiaries },
  }
}

/**
 * List all diaries system-wide with user info + alert/transaction counts.
 * Admin-only, paginated.
 */
export async function listAllDiariesAdmin(input: unknown) {
  const validated = listAllDiariesAdminSchema.parse(input ?? {})
  const { page, limit } = validated
  const skip = (page - 1) * limit

  const [total, diaries] = await Promise.all([
    prisma.diary.count(),
    prisma.diary.findMany({
      skip,
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        _count: {
          select: {
            alerts: true,
            transactions: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    }),
  ])

  return {
    diaries,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}
