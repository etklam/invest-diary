/**
 * server/utils/diary-read.ts
 *
 * Diary read-side query layer — mirrors the pattern in diary-write.ts.
 * Centralises Prisma queries for loading single diaries so that schema
 * changes only need to touch this file, not N handlers.
 *
 * Contract:
 *  - Return raw Prisma results (with BigInt). Handlers call serialize().
 *  - Functions that verify ownership throw AppError (not found / access denied).
 */

import prisma from '~/lib/prisma'
import { getUtcDayRange } from '~/lib/diary-date'
import { Errors } from '~/lib/errors/factory'

/**
 * Shared include fragment used by most single-diary read paths.
 * Every handler that needs the full diary with relations should go through
 * findDiaryForUser() which uses this fragment internally.
 */
const DIARY_FULL_INCLUDE = {
  transactions: true,
  alerts: true,
} as const

/**
 * Find a single diary by ID with full relations (transactions, alerts).
 * Verifies ownership. Throws AppError if not found or not owned by user.
 *
 * - Returns the raw Prisma result (BigInt fields intact).
 * - Handlers should wrap the result with serialize().
 *
 * Uses a SQL-level ownership filter so that not-found and not-owned
 * collapse into a single diaryNotFound response. This prevents resource
 * existence leakage (404 vs 403) and mirrors the discipline/price-alert
 * query layer pattern.
 *
 * @param id       Diary primary key (bigint or string representation)
 * @param userId   Owner's user ID (bigint or string representation)
 */
export async function findDiaryForUser(
  id: bigint | string,
  userId: bigint | string,
) {
  const diaryId = typeof id === 'bigint' ? id : BigInt(id)
  const uid = typeof userId === 'bigint' ? userId : BigInt(userId)

  const diary = await prisma.diary.findFirst({
    where: { id: diaryId, userId: uid },
    include: DIARY_FULL_INCLUDE,
  })

  if (!diary) {
    throw Errors.diaryNotFound(String(diaryId))
  }

  return diary
}

/**
 * Find a diary by date for a specific user.
 * Returns null if no diary exists for that date.
 *
 * - Uses UTC day-range matching (gte start / lte end) consistent with
 *   how dates are stored (UTC noon).
 * - Returns the raw Prisma result (BigInt fields intact).
 *
 * @param date    Target date (string 'YYYY-MM-DD' or Date)
 * @param userId  Owner's user ID (bigint)
 */
export async function findDiaryByDate(
  date: string | Date,
  userId: bigint,
) {
  const { startOfDayUtc, endOfDayUtc } = getUtcDayRange(date)

  return prisma.diary.findFirst({
    where: {
      userId,
      date: {
        gte: startOfDayUtc,
        lte: endOfDayUtc,
      },
    },
    include: DIARY_FULL_INCLUDE,
  })
}
