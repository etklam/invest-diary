/**
 * Canonical, presentation-only Investment Activity read model.
 *
 * The model deliberately accepts already-owned projections.  It does not
 * infer symbols from prose, create events, or mutate any source record.
 */

export type ActivityKind = 'diary' | 'thesis_review' | 'stock_timeline' | 'thesis'

export interface ActivitySourceLabel {
  kind: 'user' | 'partner' | 'ai_agent' | 'system'
  label: string | null
}

export interface InvestmentActivityItem {
  id: string
  kind: ActivityKind
  occurredAt: string
  symbol: string | null
  title: string
  summary: string
  source: ActivitySourceLabel
  diaryId: string | null
  destination: string
  metadata: Record<string, unknown>
}

export interface DiaryActivityInput {
  id: string
  date: string
  title: string
  content?: string | null
  createdVia?: string | null
  createdByLabel?: string | null
  symbols?: string[]
  transactionContext?: Array<{ id: string; symbol: string; type: string; quantity: number; price: number }>
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
  sourceType: string
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
}

export interface InvestmentActivityOptions {
  symbol?: string | null
  asOf?: Date
  limit?: number
  cursor?: string | null
}

export interface InvestmentActivityPage {
  items: InvestmentActivityItem[]
  nextCursor: string | null
  asOf: string
}

const KIND_ORDER: Record<ActivityKind, number> = {
  diary: 0,
  thesis_review: 1,
  stock_timeline: 2,
  thesis: 3,
}

function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase()
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

function cursorKey(item: Pick<InvestmentActivityItem, 'occurredAt' | 'kind' | 'id'>): string {
  return `${item.occurredAt}\u0000${KIND_ORDER[item.kind]}\u0000${item.id}`
}

function compareItems(a: InvestmentActivityItem, b: InvestmentActivityItem): number {
  const time = Date.parse(b.occurredAt) - Date.parse(a.occurredAt)
  if (time !== 0) return time
  const kind = KIND_ORDER[a.kind] - KIND_ORDER[b.kind]
  if (kind !== 0) return kind
  return a.id.localeCompare(b.id, undefined, { numeric: true })
}

function encodeCursor(item: InvestmentActivityItem): string {
  const value = JSON.stringify({ occurredAt: item.occurredAt, kind: item.kind, id: item.id })
  return Buffer.from(value, 'utf8').toString('base64url')
}

function decodeCursor(cursor: string | null | undefined): Pick<InvestmentActivityItem, 'occurredAt' | 'kind' | 'id'> | null {
  if (!cursor) return null
  try {
    const raw = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as Record<string, unknown>
    if (typeof raw.occurredAt !== 'string' || typeof raw.id !== 'string' || !Object.hasOwn(KIND_ORDER, raw.kind as string)) return null
    return { occurredAt: raw.occurredAt, id: raw.id, kind: raw.kind as ActivityKind }
  } catch {
    return null
  }
}

export function mergeInvestmentActivity(
  sources: InvestmentActivitySources,
  options: InvestmentActivityOptions = {},
): InvestmentActivityPage {
  const asOf = options.asOf ?? new Date()
  const requestedSymbol = options.symbol?.trim() ? normalizeSymbol(options.symbol) : null
  const diaries = sources.diaries ?? []
  const diaryIds = new Set(diaries.map(diary => diary.id))
  const items: InvestmentActivityItem[] = []

  for (const diary of diaries) {
    const symbols = Array.from(new Set((diary.symbols ?? []).map(normalizeSymbol).filter(Boolean)))
    const symbol = symbols[0] ?? diary.transactionContext?.[0]?.symbol?.trim().toUpperCase() ?? null
    if (requestedSymbol && !symbols.includes(requestedSymbol) && !diary.transactionContext?.some(tx => normalizeSymbol(tx.symbol) === requestedSymbol)) continue
    items.push({
      id: `diary:${diary.id}`,
      kind: 'diary',
      occurredAt: diary.date,
      symbol,
      title: diary.title,
      summary: textSummary(diary.content, diary.title),
      source: sourceFrom(diary.createdVia, diary.createdByLabel),
      diaryId: diary.id,
      destination: `/diaries/${diary.id}`,
      metadata: {
        symbols,
        transactionContext: diary.transactionContext ?? [],
        reviewOutcome: diary.reviewOutcome ?? null,
        reviewStatus: diary.reviewStatus ?? null,
        alertCount: diary.alertCount ?? 0,
        tradePlanSummary: diary.tradePlanSummary ?? null,
      },
    })
  }

  for (const review of sources.thesisReviews ?? []) {
    const symbol = normalizeSymbol(review.symbol)
    if (requestedSymbol && requestedSymbol !== symbol) continue
    items.push({
      id: `thesis-review:${review.id}`,
      kind: 'thesis_review',
      occurredAt: review.reviewedAt,
      symbol,
      title: `${symbol} Thesis Review`,
      summary: textSummary(review.reflectionSummary, `${review.outcome} · ${review.portfolioDecision}`),
      source: sourceFrom('USER', review.createdByLabel),
      diaryId: null,
      destination: `/stocks/${encodeURIComponent(symbol)}?tab=thesis&review=${encodeURIComponent(review.id)}`,
      metadata: { outcome: review.outcome, portfolioDecision: review.portfolioDecision },
    })
  }

  for (const record of sources.stockTimeline ?? []) {
    const symbol = normalizeSymbol(record.symbol)
    if (record.sourceDiaryId && diaryIds.has(record.sourceDiaryId)) continue
    if (requestedSymbol && requestedSymbol !== symbol) continue
    items.push({
      id: `stock-timeline:${record.id}`,
      kind: 'stock_timeline',
      occurredAt: record.occurredAt,
      symbol,
      title: record.sourceTitle || `${symbol} Research`,
      summary: textSummary(record.summary, record.sourceType),
      source: sourceFrom(record.createdVia, record.createdByLabel),
      diaryId: record.sourceDiaryId ?? null,
      destination: `/stocks/${encodeURIComponent(symbol)}?tab=evidence&record=${encodeURIComponent(record.id)}`,
      metadata: { sourceType: record.sourceType, sourceUrl: record.sourceUrl ?? null },
    })
  }

  const thesisBySymbol = new Map<string, CurrentThesisActivityInput>()
  for (const thesis of sources.currentTheses ?? []) {
    const symbol = normalizeSymbol(thesis.symbol)
    const current = thesisBySymbol.get(symbol)
    if (!current || Date.parse(thesis.updatedAt) > Date.parse(current.updatedAt) || (thesis.updatedAt === current.updatedAt && thesis.id > current.id)) {
      thesisBySymbol.set(symbol, { ...thesis, symbol })
    }
  }
  for (const thesis of thesisBySymbol.values()) {
    if (requestedSymbol && requestedSymbol !== thesis.symbol) continue
    items.push({
      id: `thesis:${thesis.id}`,
      kind: 'thesis',
      occurredAt: thesis.updatedAt,
      symbol: thesis.symbol,
      title: `${thesis.symbol} Investment Thesis`,
      summary: textSummary(thesis.summary, `${thesis.status}${thesis.latestReviewOutcome ? ` · ${thesis.latestReviewOutcome}` : ''}`),
      source: { kind: 'user', label: null },
      diaryId: null,
      destination: `/stocks/${encodeURIComponent(thesis.symbol)}?tab=thesis`,
      metadata: { status: thesis.status, latestReviewOutcome: thesis.latestReviewOutcome ?? null },
    })
  }

  items.sort(compareItems)
  const cursor = decodeCursor(options.cursor)
  const after = cursor ? items.findIndex(item => cursorKey(item) === cursorKey(cursor)) : -1
  const start = after >= 0 ? after + 1 : 0
  const limit = Math.min(50, Math.max(1, Math.floor(options.limit ?? 20)))
  const pageItems = items.slice(start, start + limit)
  const last = pageItems[pageItems.length - 1]
  return { items: pageItems, nextCursor: start + limit < items.length && last ? encodeCursor(last) : null, asOf: asOf.toISOString() }
}

export const activityComparator = compareItems
export const activityCursor = { encode: encodeCursor, decode: decodeCursor }
