import type { z } from 'zod'
import {
  diaryListResponseSchema,
  diaryResponseSchema,
  type DiaryListResponse,
  type DiaryResponse,
} from '~/lib/contracts/diary'
import {
  diaryReviewResponseSchema,
  reviewGroupsResponseSchema,
  type DiaryReviewResponse,
  type ReviewGroups,
} from '~/lib/contracts/review'
import { parseDiaryTags } from '~/lib/diary-tags'
import { Errors } from '~/lib/errors/factory'
import { REVIEW_STATUSES, type ReviewStatus } from '~/lib/contracts/review'

type Row = Record<string, any>

function parseResponse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value)
  if (!result.success) throw Errors.internalError(result.error)
  return result.data
}

function id(value: unknown): string {
  return String(value)
}

function instant(value: unknown): string {
  const date = value instanceof Date ? value : new Date(String(value))
  if (Number.isNaN(date.getTime())) throw Errors.internalError(new Error('Invalid response instant'))
  return date.toISOString()
}

function nullableInstant(value: unknown): string | null {
  return value == null ? null : instant(value)
}

function calendarDate(value: unknown): string {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  return instant(value).slice(0, 10)
}

function decimal(value: unknown): string {
  return String(value)
}

function reviewStatus(value: unknown): ReviewStatus {
  const normalized = String(value ?? '').toLowerCase()
  return REVIEW_STATUSES.includes(normalized as ReviewStatus) ? normalized as ReviewStatus : 'none'
}

function mapTransaction(row: Row) {
  return {
    id: id(row.id),
    ...(row.diaryId != null ? { diaryId: id(row.diaryId) } : {}),
    ...(row.userId != null ? { userId: id(row.userId) } : {}),
    symbol: row.symbol,
    type: row.type,
    quantity: decimal(row.quantity),
    price: decimal(row.price),
    tradeDate: instant(row.tradeDate),
    ...(Object.hasOwn(row, 'notes') ? { notes: row.notes } : {}),
    ...(Object.hasOwn(row, 'strategy') ? { strategy: row.strategy } : {}),
    ...(Object.hasOwn(row, 'emotion') ? { emotion: row.emotion } : {}),
    ...(row.createdAt != null ? { createdAt: instant(row.createdAt) } : {}),
  }
}

function mapAlert(row: Row) {
  return {
    id: id(row.id),
    ...(row.diaryId != null ? { diaryId: id(row.diaryId) } : {}),
    message: row.message,
    triggerAt: instant(row.triggerAt),
    ...(Object.hasOwn(row, 'isDismissed') ? { isDismissed: row.isDismissed } : {}),
    ...(Object.hasOwn(row, 'recurringMode') ? { recurringMode: row.recurringMode } : {}),
    ...(Object.hasOwn(row, 'parentId') ? { parentId: row.parentId == null ? null : id(row.parentId) } : {}),
    ...(Object.hasOwn(row, 'instanceNumber') ? { instanceNumber: row.instanceNumber } : {}),
    ...(Object.hasOwn(row, 'isPaused') ? { isPaused: row.isPaused } : {}),
    ...(row.createdAt != null ? { createdAt: instant(row.createdAt) } : {}),
  }
}

function mapTradePlan(row: Row) {
  return {
    id: id(row.id),
    symbol: row.symbol,
    setupType: row.setupType ?? null,
    entryPrice: row.entryPrice == null ? null : decimal(row.entryPrice),
    entryZoneLow: row.entryZoneLow == null ? null : decimal(row.entryZoneLow),
    entryZoneHigh: row.entryZoneHigh == null ? null : decimal(row.entryZoneHigh),
    stopLoss: row.stopLoss == null ? null : decimal(row.stopLoss),
    targetPrice: row.targetPrice == null ? null : decimal(row.targetPrice),
    maxPositionSize: row.maxPositionSize == null ? null : decimal(row.maxPositionSize),
    invalidationCondition: row.invalidationCondition ?? null,
    notes: row.notes ?? null,
    status: String(row.status).toLowerCase(),
  }
}

export function mapDiaryResponse(source: Row): DiaryResponse {
  const stockSymbols = Array.isArray(source.stockSymbols)
    ? source.stockSymbols.map(String)
    : (source.stockContexts ?? []).map((context: Row) => context.stock?.symbol).filter(Boolean)

  return parseResponse(diaryResponseSchema, {
    id: id(source.id),
    userId: id(source.userId),
    title: source.title,
    content: source.content ?? null,
    tags: Array.isArray(source.tags) ? source.tags : parseDiaryTags(source.tagsString),
    tagsString: source.tagsString ?? null,
    createdVia: source.createdVia,
    createdByLabel: source.createdByLabel ?? null,
    date: calendarDate(source.date),
    createdAt: instant(source.createdAt),
    updatedAt: instant(source.updatedAt),
    ...(Array.isArray(source.transactions) ? { transactions: source.transactions.map(mapTransaction) } : {}),
    ...(Array.isArray(source.alerts) ? { alerts: source.alerts.map(mapAlert) } : {}),
    ...(Array.isArray(source.tradePlans) ? { tradePlans: source.tradePlans.map(mapTradePlan) } : {}),
    ...(source.tradePlanSummary ? { tradePlanSummary: source.tradePlanSummary } : {}),
    thesis: source.thesis ?? null,
    risk: source.risk ?? null,
    execution: source.execution ?? null,
    reviewDueAt: nullableInstant(source.reviewDueAt),
    reviewStatus: reviewStatus(source.reviewStatus),
    reviewedAt: nullableInstant(source.reviewedAt),
    reviewOutcome: source.reviewOutcome ?? null,
    ...(Object.hasOwn(source, 'reviewSummary') ? { reviewSummary: source.reviewSummary } : {}),
    ...(Object.hasOwn(source, 'reviewLearning') ? { reviewLearning: source.reviewLearning } : {}),
    ...(Object.hasOwn(source, 'reviewAdjustment') ? { reviewAdjustment: source.reviewAdjustment } : {}),
    stockSymbols,
  })
}

export function mapDiaryListResponse(items: Row[], page: number, limit: number, total: number): DiaryListResponse {
  return parseResponse(diaryListResponseSchema, {
    data: items.map(mapDiaryResponse),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  })
}

export function mapDiaryReviewResponse(source: Row): DiaryReviewResponse {
  return parseResponse(diaryReviewResponseSchema, {
    id: id(source.id),
    title: source.title,
    date: calendarDate(source.date),
    content: source.content ?? null,
    tags: parseDiaryTags(source.tagsString),
    thesis: source.thesis ?? null,
    risk: source.risk ?? null,
    execution: source.execution ?? null,
    reviewDueAt: nullableInstant(source.reviewDueAt),
    reviewStatus: reviewStatus(source.reviewStatus),
    reviewedAt: nullableInstant(source.reviewedAt),
    reviewOutcome: source.reviewOutcome ?? null,
    reviewSummary: source.reviewSummary ?? null,
    reviewLearning: source.reviewLearning ?? null,
    reviewAdjustment: source.reviewAdjustment ?? null,
    transactions: (source.transactions ?? []).map((row: Row) => ({
      id: id(row.id),
      symbol: row.symbol,
      type: row.type,
      quantity: decimal(row.quantity),
      price: decimal(row.price),
      tradeDate: instant(row.tradeDate),
      notes: row.notes ?? null,
      strategy: row.strategy ?? null,
      emotion: row.emotion ?? null,
    })),
    tradePlans: (source.tradePlans ?? []).map(mapTradePlan),
  })
}

function mapReviewQueueItem(source: Row) {
  if (source.targetType === 'thesis') {
    return {
      targetType: 'thesis' as const,
      id: id(source.id),
      thesisId: id(source.thesisId),
      title: source.title,
      date: instant(source.date),
      thesis: source.thesis ?? null,
      risk: null,
      reviewDueAt: nullableInstant(source.reviewDueAt),
      reviewStatus: reviewStatus(source.reviewStatus),
      reviewedAt: nullableInstant(source.reviewedAt),
      reviewOutcome: source.reviewOutcome ?? null,
      symbol: source.symbol ?? null,
      thesisStatus: source.thesisStatus ?? null,
      latestReviewOutcome: source.latestReviewOutcome ?? null,
      portfolioDecision: source.portfolioDecision ?? null,
    }
  }
  return {
    targetType: 'diary' as const,
    id: id(source.id),
    title: source.title,
    date: calendarDate(source.date),
    thesis: source.thesis ?? null,
    risk: source.risk ?? null,
    reviewDueAt: nullableInstant(source.reviewDueAt),
    reviewStatus: reviewStatus(source.reviewStatus),
    reviewedAt: nullableInstant(source.reviewedAt),
    reviewOutcome: source.reviewOutcome ?? null,
  }
}

export function mapReviewGroupsResponse(source: {
  unscheduled: Row[]
  overdue: Row[]
  today: Row[]
  upcoming: Row[]
  completed: Row[]
}): ReviewGroups {
  return parseResponse(reviewGroupsResponseSchema, {
    unscheduled: source.unscheduled.map(mapReviewQueueItem),
    overdue: source.overdue.map(mapReviewQueueItem),
    today: source.today.map(mapReviewQueueItem),
    upcoming: source.upcoming.map(mapReviewQueueItem),
    completed: source.completed.map(mapReviewQueueItem),
  })
}
