import type { Prisma } from '@prisma/client'
import prisma from '~/lib/prisma'
import { normalizeStockSymbol } from '~/lib/stocks/symbols'
import { toCalendarDateWire, toUtcNoonDate } from '~/lib/dates/normalize'
import type { ActivityCursorPayload, ActivityKind } from '~/lib/contracts/activity'
import type { StockTimelineSourceType } from '~/lib/contracts/stocks/timeline-source'
import {
  mergeInvestmentActivity,
  resolveInvestmentActivitySnapshot,
  type InvestmentActivityOptions,
  type InvestmentActivitySources,
} from '~/lib/investment-activity'

const ACTIVITY_LIMIT = 50
const ACTIVITY_KIND_ORDER: Record<ActivityKind, number> = {
  diary: 0,
  thesis_review: 1,
  stock_timeline: 2,
  thesis: 3,
}
const ACTIVITY_KIND_PREFIX: Record<ActivityKind, string> = {
  diary: 'diary:',
  thesis_review: 'thesis-review:',
  stock_timeline: 'stock-timeline:',
  thesis: 'thesis:',
}

type DiaryRow = {
  id: bigint; date: Date; title: string; content: string | null
  createdVia: string; createdByLabel: string | null; reviewStatus: string | null; reviewOutcome: string | null
  alerts: Array<{ id: bigint }>
  stockContexts: Array<{ stock: { symbol: string } }>
  transactions: Array<{ id: bigint; symbol: string; type: string; quantity: unknown; price: unknown }>
  tradePlans: Array<{ status: string }>
}
type ReviewRow = {
  id: bigint; reviewedAt: Date; outcome: string; portfolioDecision: string
  whatImproved: string | null; whatDeteriorated: string | null; whatChanged: string | null
  thesis: { stock: { symbol: string } }
}
type TimelineRow = {
  id: bigint; occurredAt: Date; summary: string; sourceType: StockTimelineSourceType; sourceTitle: string | null; sourceUrl: string | null
  sourceDiaryId: bigint | null; createdVia: string; createdByLabel: string | null; stock: { symbol: string }
}
type ThesisRow = {
  id: bigint; updatedAt: Date; status: string; summary: string | null; latestReviewOutcome: string | null
  stock: { symbol: string }
}

function decimalToString(value: unknown): string {
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('Invalid decimal value')
    return String(value)
  }
  if (value && typeof value === 'object') {
    const result = String(value).trim()
    if (result) return result
  }
  throw new Error('Invalid decimal value')
}

function cleanSummary(value: string | null | undefined): string | null {
  const cleaned = value?.replace(/\s+/g, ' ').trim()
  return cleaned ? cleaned.slice(0, 280) : null
}

function cursorInstant(cursor: ActivityCursorPayload): Date {
  const raw = cursor.occurredAt.length === 10
    ? `${cursor.occurredAt}T00:00:00.000Z`
    : cursor.occurredAt
  return new Date(raw)
}

/**
 * Return the source-specific keyset predicate for the global Activity order.
 * A source query must continue after the cursor before applying its window;
 * fetching a fixed top-N slice and filtering in memory can silently omit old
 * records once one source grows past that window.
 */
function afterActivityCursor(
  sourceKind: ActivityKind,
  cursor: ActivityCursorPayload | null | undefined,
  field: 'date' | 'reviewedAt' | 'occurredAt' | 'updatedAt',
): Record<string, unknown> | null {
  if (!cursor) return null

  const sourceOrder = ACTIVITY_KIND_ORDER[sourceKind]
  const cursorOrder = ACTIVITY_KIND_ORDER[cursor.kind]
  const cursorTime = cursorInstant(cursor)
  const cursorPrefix = ACTIVITY_KIND_PREFIX[cursor.kind]
  const cursorId = BigInt(cursor.id.slice(cursorPrefix.length))

  if (sourceKind === 'diary') {
    // Diary dates are calendar values persisted at UTC noon, while the merged
    // presentation compares them at UTC midnight. Same-day Diaries therefore
    // need a calendar-day predicate rather than a raw DateTime comparison.
    const cursorDay = toUtcNoonDate(cursorTime)
    const cursorDayStart = new Date(Date.UTC(
      cursorDay.getUTCFullYear(),
      cursorDay.getUTCMonth(),
      cursorDay.getUTCDate(),
    ))

    if (cursor.kind === 'diary') {
      return {
        OR: [
          { [field]: { lt: cursorDay } },
          { [field]: { equals: cursorDay }, id: { gt: cursorId } },
        ],
      }
    }

    return { [field]: cursorTime.getTime() > cursorDayStart.getTime() ? { lte: cursorDay } : { lt: cursorDay } }
  }

  if (sourceOrder < cursorOrder) return { [field]: { lt: cursorTime } }
  if (sourceOrder > cursorOrder) return { [field]: { lte: cursorTime } }
  return {
    OR: [
      { [field]: { lt: cursorTime } },
      { [field]: { equals: cursorTime }, id: { gt: cursorId } },
    ],
  }
}

export async function readInvestmentActivitySources(
  userId: bigint,
  options: {
    symbol?: string | null
    asOf?: Date
    cursor?: ActivityCursorPayload | null
    sourceLimit?: number
  } = {},
): Promise<InvestmentActivitySources> {
  const symbol = options.symbol?.trim() ? normalizeStockSymbol(options.symbol) : null
  const asOf = options.asOf ?? new Date()
  const diaryAsOf = toUtcNoonDate(asOf)
  const sourceLimit = Math.min(ACTIVITY_LIMIT * 3, Math.max(20, options.sourceLimit ?? ACTIVITY_LIMIT * 2))
  const diaryWhere = {
    userId,
    date: { lte: diaryAsOf },
    ...(symbol ? {
      OR: [
        { stockContexts: { some: { stock: { symbol } } } },
        { transactions: { some: { symbol } } },
      ],
    } : {}),
  }
  const diaryCursorWhere = afterActivityCursor('diary', options.cursor, 'date')
  const reviewCursorWhere = afterActivityCursor('thesis_review', options.cursor, 'reviewedAt')
  const timelineCursorWhere = afterActivityCursor('stock_timeline', options.cursor, 'occurredAt')
  const thesisCursorWhere = afterActivityCursor('thesis', options.cursor, 'updatedAt')

  const [diaryRows, reviewRows, timelineRows, thesisRows] = await Promise.all([
    prisma.diary.findMany({
      where: {
        ...diaryWhere,
        ...(diaryCursorWhere ? { AND: [diaryCursorWhere as Prisma.DiaryWhereInput] } : {}),
      },
      orderBy: [{ date: 'desc' }, { id: 'asc' }],
      take: sourceLimit + 1,
      select: {
        id: true,
        date: true,
        title: true,
        content: true,
        createdVia: true,
        createdByLabel: true,
        reviewStatus: true,
        reviewOutcome: true,
        alerts: { where: { isDismissed: false }, select: { id: true } },
        stockContexts: { select: { stock: { select: { symbol: true } } } },
        transactions: { select: { id: true, symbol: true, type: true, quantity: true, price: true } },
        tradePlans: { select: { status: true } },
      },
    }),
    prisma.thesisReview.findMany({
      where: {
        userId,
        reviewedAt: { lte: asOf },
        ...(symbol ? { thesis: { stock: { symbol } } } : {}),
        ...(reviewCursorWhere ? { AND: [reviewCursorWhere as Prisma.ThesisReviewWhereInput] } : {}),
      },
      orderBy: [{ reviewedAt: 'desc' }, { id: 'asc' }],
      take: sourceLimit + 1,
      include: { thesis: { select: { stock: { select: { symbol: true } } } } },
    }),
    prisma.stockTimelineRecord.findMany({
      where: {
        userId,
        occurredAt: { lte: asOf },
        ...(symbol ? { stock: { symbol } } : {}),
        ...(timelineCursorWhere ? { AND: [timelineCursorWhere as Prisma.StockTimelineRecordWhereInput] } : {}),
      },
      orderBy: [{ occurredAt: 'desc' }, { id: 'asc' }],
      take: sourceLimit + 1,
      include: { stock: { select: { symbol: true } } },
    }),
    prisma.investmentThesis.findMany({
      where: {
        userId,
        updatedAt: { lte: asOf },
        ...(symbol ? { stock: { symbol } } : {}),
        ...(thesisCursorWhere ? { AND: [thesisCursorWhere as Prisma.InvestmentThesisWhereInput] } : {}),
      },
      orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
      take: sourceLimit + 1,
      include: { stock: { select: { symbol: true } } },
    }),
  ]) as unknown as [DiaryRow[], ReviewRow[], TimelineRow[], ThesisRow[]]

  const sourceTruncated = [diaryRows, reviewRows, timelineRows, thesisRows]
    .some(rows => rows.length > sourceLimit)
  const diaries = diaryRows.slice(0, sourceLimit)
  const reviews = reviewRows.slice(0, sourceLimit)
  const timeline = timelineRows.slice(0, sourceLimit)
  const theses = thesisRows.slice(0, sourceLimit)

  return {
    diaries: diaries.map(diary => ({
      id: diary.id.toString(),
      date: toCalendarDateWire(diary.date),
      title: diary.title,
      content: diary.content,
      createdVia: diary.createdVia,
      createdByLabel: diary.createdByLabel,
      symbols: diary.stockContexts.map(context => context.stock.symbol),
      transactionContext: diary.transactions.map(transaction => ({
        id: transaction.id.toString(),
        symbol: normalizeStockSymbol(transaction.symbol),
        type: transaction.type,
        quantity: decimalToString(transaction.quantity),
        price: decimalToString(transaction.price),
      })),
      reviewOutcome: diary.reviewOutcome,
      reviewStatus: diary.reviewStatus,
      alertCount: diary.alerts.length,
      tradePlanSummary: diary.tradePlans.length ? { total: diary.tradePlans.length } : null,
    })),
    thesisReviews: reviews.map(review => ({
      id: review.id.toString(),
      reviewedAt: review.reviewedAt.toISOString(),
      symbol: review.thesis.stock.symbol,
      outcome: review.outcome,
      portfolioDecision: review.portfolioDecision,
      reflectionSummary: [review.whatImproved, review.whatDeteriorated, review.whatChanged].map(cleanSummary).filter(Boolean).join(' · ') || null,
      createdByLabel: null,
    })),
    stockTimeline: timeline.map(record => ({
      id: record.id.toString(),
      occurredAt: record.occurredAt.toISOString(),
      symbol: record.stock.symbol,
      summary: record.summary,
      sourceType: record.sourceType,
      sourceTitle: record.sourceTitle,
      sourceUrl: record.sourceUrl,
      sourceDiaryId: record.sourceDiaryId?.toString() ?? null,
      createdVia: record.createdVia,
      createdByLabel: record.createdByLabel,
    })),
    currentTheses: theses.map(thesis => ({
      id: thesis.id.toString(),
      updatedAt: thesis.updatedAt.toISOString(),
      symbol: thesis.stock.symbol,
      status: thesis.status,
      summary: thesis.summary,
      latestReviewOutcome: thesis.latestReviewOutcome,
    })),
    sourceTruncated,
  }
}

export async function readInvestmentActivityPage(
  userId: bigint,
  options: InvestmentActivityOptions = {},
) {
  // Resolve before reading any source so malformed/mismatched cursors cannot
  // accidentally fall back to page one and every query shares one snapshot.
  const snapshot = resolveInvestmentActivitySnapshot(options)
  const sources = await readInvestmentActivitySources(userId, {
    symbol: snapshot.symbol,
    asOf: snapshot.asOf,
    cursor: snapshot.cursor,
  })
  return mergeInvestmentActivity(sources, {
    ...options,
    symbol: snapshot.symbol,
    asOf: snapshot.asOf,
    limit: Math.min(ACTIVITY_LIMIT, Math.max(1, options.limit ?? 20)),
  })
}
