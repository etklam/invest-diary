/**
 * server/utils/diary-read.ts
 *
 * Diary read-side query layer — mirrors the deep-module pattern in
 * diary-write.ts. Centralises every Prisma read path for diaries so that
 * schema changes only need to touch this file, not N handlers.
 *
 * Surfaces:
 *  - findDiaryForUser(id)         : single diary by id (ownership-checked)
 *  - findDiaryDetailForUser(id)   : rich owner-only Decision Record detail
 *  - findDiaryByDate(date)        : single diary by date (null when absent)
 *  - findLatestDiaryForUser()     : newest diary (null when none exists)
 *  - listDiariesForUser(filters)  : paginated list + count + tag parse
 *  - buildReviewBuckets(tz)       : review dashboard's 5-bucket date math
 *
 * Contract:
 *  - Return raw Prisma results (with BigInt). Handlers call serialize().
 *  - Functions that verify ownership throw AppError (not found / access denied).
 *  - List-style lookups (findLatestDiaryForUser, findDiaryByDate) return null
 *    when absent — the handler decides whether null is an error.
 */

import type { Prisma } from '@prisma/client'
import prisma from '~/lib/prisma'
import { getUtcDayRange } from '~/lib/dates/normalize'
import { getUserDayRange } from '~/lib/dates/user-tz'
import { parseDiaryTags } from '~/lib/diary-tags'
import { Errors } from '~/lib/errors/factory'
import { TRADE_PLAN_STATUSES, type TradePlanStatus } from '~/types/trade-plan'

/**
 * Shared include fragment used by most single-diary read paths.
 * Every handler that needs the full diary with relations should go through
 * findDiaryForUser() which uses this fragment internally.
 */
const DIARY_FULL_INCLUDE = {
  transactions: true,
  alerts: true,
} as const

const DIARY_DETAIL_INCLUDE = {
  alerts: true,
  transactions: {
    orderBy: [{ tradeDate: 'asc' as const }, { id: 'asc' as const }],
  },
  tradePlans: {
    select: {
      id: true,
      symbol: true,
      setupType: true,
      entryPrice: true,
      entryZoneLow: true,
      entryZoneHigh: true,
      stopLoss: true,
      targetPrice: true,
      maxPositionSize: true,
      invalidationCondition: true,
      notes: true,
      status: true,
    },
    orderBy: { id: 'asc' as const },
  },
} satisfies Prisma.DiaryInclude

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
 * Rich owner-only Diary detail used by the Decision Record page. It keeps the
 * ordinary ownership lookup lean for alert checks and by-date authoring while
 * loading every relation the detail page renders in one bounded query.
 */
export async function findDiaryDetailForUser(
  id: bigint | string,
  userId: bigint | string,
) {
  const diaryId = typeof id === 'bigint' ? id : BigInt(id)
  const uid = typeof userId === 'bigint' ? userId : BigInt(userId)

  const diary = await prisma.diary.findFirst({
    where: { id: diaryId, userId: uid },
    include: DIARY_DETAIL_INCLUDE,
  })

  if (!diary) throw Errors.diaryNotFound(String(diaryId))
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

// ---- Latest diary ----

/**
 * Find the most recently created diary for a user.
 * Returns null when the user has no diaries — the caller decides whether
 * that's an error (transactions/latest.get.ts returns null payload).
 *
 * Ordered by createdAt desc, mirrors transactions/latest.get.ts.
 */
export async function findLatestDiaryForUser(userId: bigint) {
  return prisma.diary.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: { transactions: true },
  })
}

// ---- List with filters (diaries.get.ts) ----

const DIARY_LIST_SORT_OPTIONS: Record<string, Prisma.DiaryOrderByWithRelationInput[]> = {
  'date-desc': [{ date: 'desc' }, { id: 'desc' }],
  'date-asc': [{ date: 'asc' }, { id: 'asc' }],
  'title-asc': [{ title: 'asc' }, { id: 'asc' }],
  'title-desc': [{ title: 'desc' }, { id: 'desc' }],
}

const DIARY_LIST_SELECT = {
  id: true,
  userId: true,
  title: true,
  content: true,
  tagsString: true,
  createdVia: true,
  createdByLabel: true,
  date: true,
  createdAt: true,
  updatedAt: true,
  thesis: true,
  risk: true,
  execution: true,
  reviewDueAt: true,
  reviewStatus: true,
  reviewedAt: true,
  reviewOutcome: true,
  alerts: {
    where: { isDismissed: false },
    select: {
      id: true,
      message: true,
      triggerAt: true,
      isDismissed: true,
    },
  },
  transactions: {
    select: {
      id: true,
      symbol: true,
      type: true,
      quantity: true,
      price: true,
      tradeDate: true,
    },
  },
  tradePlans: {
    select: {
      status: true,
    },
  },
} satisfies Prisma.DiarySelect

export interface TradePlanSummary {
  total: number
  statuses: Array<{
    status: TradePlanStatus
    count: number
  }>
}

function summarizeTradePlans(tradePlans: Array<{ status: string }>): TradePlanSummary | undefined {
  if (tradePlans.length === 0) return undefined

  return {
    total: tradePlans.length,
    statuses: TRADE_PLAN_STATUSES
      .map(status => ({
        status,
        count: tradePlans.filter(plan => plan.status === status).length,
      }))
      .filter(({ count }) => count > 0),
  }
}

export interface DiaryListFilters {
  page: number
  limit: number
  days?: number
  search?: string
  sortBy?: string
  reviewStatus?: string
  dateFrom?: Date
  dateTo?: Date
}

export interface DiaryListItem {
  id: bigint
  userId: bigint
  title: string
  content: string
  tagsString: string | null
  createdVia: string
  createdByLabel: string | null
  date: Date
  createdAt: Date
  updatedAt: Date
  thesis: string | null
  risk: string | null
  execution: string | null
  reviewDueAt: Date | null
  reviewStatus: string | null
  reviewedAt: Date | null
  reviewOutcome: string | null
  alerts: Array<{
    id: bigint
    message: string
    triggerAt: Date
    isDismissed: boolean
  }>
  transactions: Array<{
    id: bigint
    symbol: string
    type: string
    quantity: Prisma.Decimal
    price: Prisma.Decimal
    tradeDate: Date
  }>
  tradePlanSummary?: TradePlanSummary
  // ponytail: tags is parsed from tagsString — kept on the item so handlers
  // don't need to re-map. serialize() leaves arrays untouched.
  tags: string[]
}

/**
 * List diaries for a user with the same filters diaries.get.ts supported:
 * pagination, days-window (createdAt gte), title/content search, date range
 * on the diary `date` field, reviewStatus (with the pending==overdue special
 * case), and whitelisted sort options.
 *
 * Returns `{ items, total }`. Items carry a parsed `tags` array alongside the
 * raw `tagsString` so the handler can serialize directly. BigInt/Decimal are
 * left intact — handler wraps with serialize().
 */
export async function listDiariesForUser(
  userId: bigint,
  filters: DiaryListFilters,
): Promise<{ items: DiaryListItem[]; total: number }> {
  const orderBy = (filters.sortBy && DIARY_LIST_SORT_OPTIONS[filters.sortBy])
    ?? DIARY_LIST_SORT_OPTIONS['date-desc']

  const where: Prisma.DiaryWhereInput = { userId }

  // Days filter (legacy — uses createdAt)
  if (filters.days !== undefined && filters.days > 0) {
    const since = new Date()
    since.setDate(since.getDate() - filters.days)
    where.createdAt = { gte: since }
  }

  // Search filter (case-insensitive contains on title + content)
  if (filters.search) {
    where.OR = [
      { title: { contains: filters.search } },
      { content: { contains: filters.search } },
    ]
  }

  // Date range filter (uses diary date field)
  if (filters.dateFrom || filters.dateTo) {
    where.date = {
      ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
      ...(filters.dateTo ? { lte: filters.dateTo } : {}),
    }
  }

  // Review status filter
  if (filters.reviewStatus) {
    if (filters.reviewStatus === 'pending') {
      // "pending" means reviewStatus='pending' AND reviewDueAt <= now (overdue or due)
      where.reviewStatus = 'pending'
      where.reviewDueAt = { lte: new Date() }
    } else {
      where.reviewStatus = filters.reviewStatus
    }
  }

  const skip = (filters.page - 1) * filters.limit

  const [rawItems, total] = await Promise.all([
    prisma.diary.findMany({
      where,
      orderBy,
      select: DIARY_LIST_SELECT,
      skip,
      take: filters.limit,
    }),
    prisma.diary.count({ where }),
  ])

  const items = rawItems.map(
    (d: Prisma.DiaryGetPayload<{ select: typeof DIARY_LIST_SELECT }>) => {
      const { tradePlans, ...diary } = d
      return {
        ...diary,
        tags: parseDiaryTags(d.tagsString),
        tradePlanSummary: summarizeTradePlans(tradePlans ?? []),
      }
    },
  ) as unknown as DiaryListItem[]

  return { items, total }
}

// ---- Review dashboard buckets (reviews.get.ts) ----

const REVIEW_SELECT = {
  id: true,
  title: true,
  date: true,
  thesis: true,
  risk: true,
  reviewDueAt: true,
  reviewStatus: true,
  reviewedAt: true,
  reviewOutcome: true,
} satisfies Prisma.DiarySelect

export type ReviewItem = {
  id: bigint
  title: string
  date: Date
  thesis: string | null
  risk: string | null
  reviewDueAt: Date | null
  // Normalized to 'none' when null — review dashboard treats absent status as
  // "no review scheduled" rather than exposing the DB null.
  reviewStatus: string | null
  reviewedAt: Date | null
  reviewOutcome: string | null
}

export interface ReviewBuckets {
  unscheduled: ReviewItem[]
  overdue: ReviewItem[]
  today: ReviewItem[]
  upcoming: ReviewItem[]
  completed: ReviewItem[]
}

/**
 * Build the 5 review-dashboard buckets using user-local day boundaries from
 * lib/dates/user-tz.ts (single source of truth for tz math, DST-safe).
 *
 * Bucket logic (half-open [todayStart, tomorrowStart)):
 *  - unscheduled : reviewDueAt is null AND reviewStatus='pending'
 *  - overdue     : reviewDueAt < todayStart (still open)
 *  - today       : todayStart <= reviewDueAt < tomorrowStart
 *  - upcoming    : reviewDueAt >= tomorrowStart
 *  - completed   : reviewStatus='reviewed' (latest 50)
 *
 * "Open" (unscheduled/overdue/today/upcoming) excludes anything already
 * reviewStatus='reviewed' so a completed diary never re-appears in two
 * buckets.
 */
export async function buildReviewBuckets(
  userId: bigint,
  timeZone: string,
): Promise<ReviewBuckets> {
  // half-open [start, end): start = user-local today 00:00 UTC,
  // end = next-day 00:00 UTC. DST-safe via getUserDayRange.
  const { start: todayStart, end: tomorrowStart } = getUserDayRange(new Date(), timeZone)

  const baseOpenWhere: Prisma.DiaryWhereInput = {
    userId,
    NOT: { reviewStatus: 'reviewed' },
  }

  const [unscheduled, overdue, today, upcoming, completed] = await Promise.all([
    prisma.diary.findMany({
      where: {
        ...baseOpenWhere,
        reviewDueAt: null,
        reviewStatus: 'pending',
      },
      select: REVIEW_SELECT,
      orderBy: { date: 'desc' },
    }),
    prisma.diary.findMany({
      where: {
        ...baseOpenWhere,
        reviewDueAt: { lt: todayStart },
      },
      select: REVIEW_SELECT,
      orderBy: { reviewDueAt: 'asc' },
    }),
    prisma.diary.findMany({
      where: {
        ...baseOpenWhere,
        // half-open: [todayStart, tomorrowStart)
        reviewDueAt: { gte: todayStart, lt: tomorrowStart },
      },
      select: REVIEW_SELECT,
      orderBy: { reviewDueAt: 'asc' },
    }),
    prisma.diary.findMany({
      where: {
        ...baseOpenWhere,
        reviewDueAt: { gte: tomorrowStart },
      },
      select: REVIEW_SELECT,
      orderBy: { reviewDueAt: 'asc' },
    }),
    prisma.diary.findMany({
      where: {
        userId,
        reviewStatus: 'reviewed',
      },
      select: REVIEW_SELECT,
      orderBy: { reviewedAt: 'desc' },
      take: 50,
    }),
  ])

  const normalize = (items: ReviewItem[]): ReviewItem[] =>
    items.map(item => ({
      ...item,
      reviewStatus: item.reviewStatus || 'none',
    }))

  return {
    unscheduled: normalize(unscheduled as ReviewItem[]),
    overdue: normalize(overdue as ReviewItem[]),
    today: normalize(today as ReviewItem[]),
    upcoming: normalize(upcoming as ReviewItem[]),
    completed: normalize(completed as ReviewItem[]),
  }
}
