/**
 * Canonical, presentation-only Investment Activity read model.
 *
 * The model deliberately accepts already-owned projections. It does not
 * infer symbols from prose, create events, or mutate any source record.
 */

import {
  activityCursorPayloadSchema,
  type ActivityCursorPayload,
} from '~/lib/contracts/activity'
import { toCalendarDateWire } from '~/lib/dates/normalize'
import type { StockTimelineSourceType } from '~/lib/contracts/stocks/timeline-source'

export type ActivityKind = 'diary' | 'thesis_review' | 'stock_timeline' | 'thesis'

export interface ActivitySourceLabel {
  kind: 'user' | 'partner' | 'ai_agent' | 'system'
  label: string | null
}

export interface InvestmentActivityItem {
  id: string
  kind: ActivityKind
  /** Diary items use YYYY-MM-DD; all other kinds use a UTC Z instant. */
  occurredAt: string
  symbol: string | null
  title: string
  summary: string
  source: ActivitySourceLabel
  diaryId: string | null
  destination: string
  metadata: Record<string, unknown>
}

type DecimalInput = string | number | { toString(): string }

export interface DiaryActivityInput {
  id: string
  date: string
  title: string
  content?: string | null
  createdVia?: string | null
  createdByLabel?: string | null
  symbols?: string[]
  /** Numbers remain accepted here for old internal callers; output is strings. */
  transactionContext?: Array<{ id: string; symbol: string; type: string; quantity: DecimalInput; price: DecimalInput }>
  reviewOutcome?: string | null
  reviewStatus?: string | null
  alertCount?: number
  tradePlanSummary?: unknown
}

export interface ThesisReviewActivityInput {
  id: string
  reviewedAt: string
  symbol: string
  outcome: string
  portfolioDecision: string
  reflectionSummary?: string | null
  createdByLabel?: string | null
}

export interface StockTimelineActivityInput {
  id: string
  occurredAt: string
  symbol: string
  summary: string
  sourceType: StockTimelineSourceType
  sourceTitle?: string | null
  sourceUrl?: string | null
  sourceDiaryId?: string | null
  createdVia?: string | null
  createdByLabel?: string | null
}

export interface CurrentThesisActivityInput {
  id: string
  updatedAt: string
  symbol: string
  status: string
  summary?: string | null
  latestReviewOutcome?: string | null
}

export interface InvestmentActivitySources {
  diaries?: DiaryActivityInput[]
  thesisReviews?: ThesisReviewActivityInput[]
  stockTimeline?: StockTimelineActivityInput[]
  currentTheses?: CurrentThesisActivityInput[]
  /** True when a source query returned more rows than the read window. */
  sourceTruncated?: boolean
}

export interface InvestmentActivityOptions {
  symbol?: string | null
  asOf?: Date
  limit?: number
  cursor?: string | null
}

export interface InvestmentActivityPagination {
  nextCursor: string | null
  hasMore: boolean
  asOf: string
}

/**
 * Canonical page shape. The non-enumerable legacy accessors are intentionally
 * kept for internal callers that have not migrated yet; HTTP responses are
 * parsed into the canonical `{ data, pagination }` shape at the route.
 */
export interface InvestmentActivityPage {
  data: InvestmentActivityItem[]
  pagination: InvestmentActivityPagination
  readonly items: InvestmentActivityItem[]
  readonly nextCursor: string | null
  readonly asOf: string
}

export interface InvestmentActivitySnapshot {
  asOf: Date
  asOfIso: string
  symbol: string | null
  cursor: ActivityCursorPayload | null
}

/** Raised before source reads when an opaque Activity cursor is malformed. */
export class InvalidActivityCursorError extends Error {
  readonly code = 'INVALID_CURSOR'

  constructor() {
    super('Invalid cursor')
    this.name = 'InvalidActivityCursorError'
  }
}

const KIND_ORDER: Record<ActivityKind, number> = {
  diary: 0,
  thesis_review: 1,
  stock_timeline: 2,
  thesis: 3,
}

const REVIEW_OUTCOME_VALUES = new Set(['INTACT', 'PARTIAL', 'INVALIDATED', 'UNCLEAR'])
const REVIEW_STATUS_VALUES = new Set(['none', 'pending', 'reviewed'])

function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase()
}

function optionalSymbol(symbol: string | null | undefined): string | null {
  return symbol?.trim() ? normalizeSymbol(symbol) : null
}

function textSummary(value: string | null | undefined, fallback: string): string {
  const summary = value?.replace(/[#*`]/g, '').replace(/\s+/g, ' ').trim()
  return summary ? summary.slice(0, 280) : fallback
}

function sourceFrom(createdVia: string | null | undefined, createdByLabel?: string | null): ActivitySourceLabel {
  const via = String(createdVia ?? '').toUpperCase()
  if (via.includes('AGENT') || via === 'API_KEY') return { kind: 'ai_agent', label: createdByLabel ?? null }
  if (via.includes('SYSTEM')) return { kind: 'system', label: createdByLabel ?? null }
  if (via.includes('PARTNER')) return { kind: 'partner', label: createdByLabel ?? null }
  return { kind: 'user', label: createdByLabel ?? null }
}

function normalizeReviewOutcome(value: string | null | undefined): string | null {
  const normalized = String(value ?? '').trim().toUpperCase()
  return REVIEW_OUTCOME_VALUES.has(normalized) ? normalized : null
}

function normalizeReviewStatus(value: string | null | undefined): string | null {
  const normalized = String(value ?? '').trim().toLowerCase()
  return REVIEW_STATUS_VALUES.has(normalized) ? normalized : null
}

function decimalToWire(value: DecimalInput): string {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('Invalid decimal value')
    return String(value)
  }
  const result = String(value).trim()
  if (!result) throw new Error('Invalid decimal value')
  return result
}

function instantToWire(value: string | Date): string {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value)
  if (Number.isNaN(date.getTime())) throw new Error('Invalid activity instant')
  return date.toISOString()
}

function dateForComparison(value: string): number {
  const timestamp = Date.parse(value)
  return Number.isNaN(timestamp) ? Number.NEGATIVE_INFINITY : timestamp
}

function cursorKey(item: Pick<InvestmentActivityItem, 'occurredAt' | 'kind' | 'id'>): string {
  return `${item.occurredAt}\u0000${KIND_ORDER[item.kind]}\u0000${item.id}`
}

function compareItems(a: InvestmentActivityItem, b: InvestmentActivityItem): number {
  const time = dateForComparison(b.occurredAt) - dateForComparison(a.occurredAt)
  if (time !== 0) return time
  const kind = KIND_ORDER[a.kind] - KIND_ORDER[b.kind]
  if (kind !== 0) return kind
  return a.id.localeCompare(b.id, undefined, { numeric: true })
}

function parseAsOf(value: Date | string): Date {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value)
  if (Number.isNaN(date.getTime())) throw new Error('Invalid activity snapshot')
  return date
}

function encodeCursor(
  item: Pick<InvestmentActivityItem, 'occurredAt' | 'kind' | 'id' | 'symbol'>,
  context: { asOf?: Date | string; symbol?: string | null } = {},
): string {
  const asOf = parseAsOf(context.asOf ?? new Date())
  const payload = activityCursorPayloadSchema.parse({
    occurredAt: item.occurredAt,
    kind: item.kind,
    id: item.id,
    asOf: asOf.toISOString(),
    // An explicit null means an unfiltered feed. Do not fall back to the
    // current item's symbol, or the next page would silently become symbol-
    // filtered after the first item.
    symbol: optionalSymbol(context.symbol === undefined ? item.symbol : context.symbol),
  })
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
}

function decodeCursor(cursor: string | null | undefined): ActivityCursorPayload | null {
  if (!cursor) return null
  if (!/^[A-Za-z0-9_-]+$/.test(cursor)) return null
  try {
    const raw = Buffer.from(cursor, 'base64url')
    const canonical = raw.toString('base64url')
    if (!raw.length || canonical !== cursor) return null
    const parsed: unknown = JSON.parse(raw.toString('utf8'))
    const result = activityCursorPayloadSchema.safeParse(parsed)
    return result.success ? result.data : null
  } catch {
    return null
  }
}

function compareItemToCursor(item: InvestmentActivityItem, cursor: Pick<ActivityCursorPayload, 'occurredAt' | 'kind' | 'id'>): number {
  const time = dateForComparison(cursor.occurredAt) - dateForComparison(item.occurredAt)
  if (time !== 0) return time
  const kind = KIND_ORDER[item.kind] - KIND_ORDER[cursor.kind]
  if (kind !== 0) return kind
  return item.id.localeCompare(cursor.id, undefined, { numeric: true })
}

/** Resolve and validate snapshot/cursor state before any source query runs. */
export function resolveInvestmentActivitySnapshot(options: InvestmentActivityOptions = {}): InvestmentActivitySnapshot {
  const cursor = options.cursor ? decodeCursor(options.cursor) : null
  if (options.cursor && !cursor) throw new InvalidActivityCursorError()

  const requestedSymbol = optionalSymbol(options.symbol)
  const symbol = cursor?.symbol ?? requestedSymbol
  if (cursor && requestedSymbol !== null && requestedSymbol !== cursor.symbol) {
    throw new InvalidActivityCursorError()
  }

  const requestedAsOf = options.asOf ? parseAsOf(options.asOf) : null
  const cursorAsOf = cursor ? parseAsOf(cursor.asOf) : null
  if (requestedAsOf && cursorAsOf && requestedAsOf.getTime() !== cursorAsOf.getTime()) {
    throw new InvalidActivityCursorError()
  }

  const asOf = requestedAsOf ?? cursorAsOf ?? new Date()
  return { asOf, asOfIso: asOf.toISOString(), symbol, cursor }
}

function attachLegacyAccessors(page: {
  data: InvestmentActivityItem[]
  pagination: InvestmentActivityPagination
}): InvestmentActivityPage {
  Object.defineProperties(page, {
    items: { configurable: true, enumerable: false, get: () => page.data },
    nextCursor: { configurable: true, enumerable: false, get: () => page.pagination.nextCursor },
    asOf: { configurable: true, enumerable: false, get: () => page.pagination.asOf },
  })
  return page as InvestmentActivityPage
}

export function mergeInvestmentActivity(
  sources: InvestmentActivitySources,
  options: InvestmentActivityOptions = {},
): InvestmentActivityPage {
  const snapshot = resolveInvestmentActivitySnapshot(options)
  const requestedSymbol = snapshot.symbol
  const snapshotCalendarDate = toCalendarDateWire(snapshot.asOf)
  const diaries = sources.diaries ?? []
  const visibleDiaries = diaries.filter(diary => toCalendarDateWire(diary.date) <= snapshotCalendarDate)
  const diaryIds = new Set(visibleDiaries.map(diary => diary.id))
  const items: InvestmentActivityItem[] = []

  for (const diary of visibleDiaries) {
    const symbols = Array.from(new Set((diary.symbols ?? []).map(normalizeSymbol).filter(Boolean)))
    const transactionSymbols = diary.transactionContext?.map(tx => normalizeSymbol(tx.symbol)) ?? []
    const symbol = symbols[0] ?? transactionSymbols[0] ?? null
    if (requestedSymbol && !symbols.includes(requestedSymbol) && !transactionSymbols.includes(requestedSymbol)) continue
    items.push({
      id: `diary:${diary.id}`,
      kind: 'diary',
      occurredAt: toCalendarDateWire(diary.date),
      symbol,
      title: diary.title,
      summary: textSummary(diary.content, diary.title),
      source: sourceFrom(diary.createdVia, diary.createdByLabel),
      diaryId: diary.id,
      destination: `/diaries/${diary.id}`,
      metadata: {
        symbols,
        transactionContext: (diary.transactionContext ?? []).map(transaction => ({
          id: String(transaction.id),
          symbol: normalizeSymbol(transaction.symbol),
          type: String(transaction.type).trim().toUpperCase(),
          quantity: decimalToWire(transaction.quantity),
          price: decimalToWire(transaction.price),
        })),
        reviewOutcome: normalizeReviewOutcome(diary.reviewOutcome),
        reviewStatus: normalizeReviewStatus(diary.reviewStatus),
        alertCount: Math.max(0, Math.floor(diary.alertCount ?? 0)),
        tradePlanSummary: diary.tradePlanSummary ?? null,
      },
    })
  }

  for (const review of sources.thesisReviews ?? []) {
    const occurredAt = instantToWire(review.reviewedAt)
    if (dateForComparison(occurredAt) > snapshot.asOf.getTime()) continue
    const symbol = normalizeSymbol(review.symbol)
    if (requestedSymbol && requestedSymbol !== symbol) continue
    const outcome = String(review.outcome).trim().toUpperCase()
    const portfolioDecision = String(review.portfolioDecision).trim().toUpperCase()
    items.push({
      id: `thesis-review:${review.id}`,
      kind: 'thesis_review',
      occurredAt,
      symbol,
      title: `${symbol} Thesis Review`,
      summary: textSummary(review.reflectionSummary, `${outcome} · ${portfolioDecision}`),
      source: sourceFrom('USER', review.createdByLabel),
      diaryId: null,
      destination: `/stocks/${encodeURIComponent(symbol)}?tab=thesis&review=${encodeURIComponent(review.id)}`,
      metadata: { outcome, portfolioDecision },
    })
  }

  for (const record of sources.stockTimeline ?? []) {
    const occurredAt = instantToWire(record.occurredAt)
    if (dateForComparison(occurredAt) > snapshot.asOf.getTime()) continue
    const symbol = normalizeSymbol(record.symbol)
    if (record.sourceDiaryId && diaryIds.has(record.sourceDiaryId)) continue
    if (requestedSymbol && requestedSymbol !== symbol) continue
    items.push({
      id: `stock-timeline:${record.id}`,
      kind: 'stock_timeline',
      occurredAt,
      symbol,
      title: record.sourceTitle || `${symbol} Research`,
      summary: textSummary(record.summary, record.sourceType),
      source: sourceFrom(record.createdVia, record.createdByLabel),
      diaryId: record.sourceDiaryId ?? null,
      destination: `/stocks/${encodeURIComponent(symbol)}?tab=evidence&record=${encodeURIComponent(record.id)}`,
      metadata: { sourceType: record.sourceType, sourceUrl: record.sourceUrl ?? null },
    })
  }

  const thesisBySymbol = new Map<string, CurrentThesisActivityInput & { updatedAtWire: string }>()
  for (const thesis of sources.currentTheses ?? []) {
    const updatedAtWire = instantToWire(thesis.updatedAt)
    if (dateForComparison(updatedAtWire) > snapshot.asOf.getTime()) continue
    const symbol = normalizeSymbol(thesis.symbol)
    const current = thesisBySymbol.get(symbol)
    if (!current || dateForComparison(updatedAtWire) > dateForComparison(current.updatedAtWire)
      || (updatedAtWire === current.updatedAtWire && thesis.id > current.id)) {
      thesisBySymbol.set(symbol, { ...thesis, symbol, updatedAtWire })
    }
  }
  for (const thesis of thesisBySymbol.values()) {
    if (requestedSymbol && requestedSymbol !== thesis.symbol) continue
    const status = String(thesis.status).trim().toUpperCase()
    const latestReviewOutcome = thesis.latestReviewOutcome
      ? String(thesis.latestReviewOutcome).trim().toUpperCase()
      : null
    items.push({
      id: `thesis:${thesis.id}`,
      kind: 'thesis',
      occurredAt: thesis.updatedAtWire,
      symbol: thesis.symbol,
      title: `${thesis.symbol} Investment Thesis`,
      summary: textSummary(thesis.summary, `${status}${latestReviewOutcome ? ` · ${latestReviewOutcome}` : ''}`),
      source: { kind: 'user', label: null },
      diaryId: null,
      destination: `/stocks/${encodeURIComponent(thesis.symbol)}?tab=thesis`,
      metadata: { status, latestReviewOutcome },
    })
  }

  items.sort(compareItems)
  const cursor = snapshot.cursor
  const cursorIndex = cursor
    ? items.findIndex(item => cursorKey(item) === cursorKey(cursor))
    : -1
  const start = cursor
    ? cursorIndex >= 0
      ? cursorIndex + 1
      : items.findIndex(item => compareItemToCursor(item, cursor) > 0)
    : 0
  const safeStart = cursor && start < 0 ? items.length : start
  const limit = Math.min(50, Math.max(1, Math.floor(options.limit ?? 20)))
  const pageItems = items.slice(safeStart, safeStart + limit)
  const last = pageItems[pageItems.length - 1]
  const hasMore = Boolean(last) && (safeStart + pageItems.length < items.length || sources.sourceTruncated === true)
  const nextCursor = hasMore && last
    ? encodeCursor(last, { asOf: snapshot.asOf, symbol: requestedSymbol })
    : null

  return attachLegacyAccessors({
    data: pageItems,
    pagination: { nextCursor, hasMore, asOf: snapshot.asOfIso },
  })
}

export const activityComparator = compareItems
export const activityCursor = { encode: encodeCursor, decode: decodeCursor }
