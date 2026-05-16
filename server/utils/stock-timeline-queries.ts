import prisma from '~/lib/prisma'
import { normalizeStockSymbol } from '~/lib/stocks/symbols'
import { ensureStockBySymbol } from '~/server/utils/stock-watchlist-queries'

type StockTimelineSourceType =
  | 'TRADE_BASIC_DIARY'
  | 'VIDEO_TRANSCRIBE_SUMMARIZE'
  | 'DIARY'
  | 'ARTICLE'
  | 'MANUAL'
  | 'SYSTEM'
type StockTimelineCreatedVia = 'API_KEY' | 'WEB' | 'SYSTEM'

export interface AgentTimelineRecordInput {
  symbol: string
  summary: string
  sourceType: StockTimelineSourceType
  idempotencyKey: string
  occurredAt: string
  sourceTitle?: string
  sourceUrl?: string
  sourceDiaryId?: string
  sourceExternalId?: string
  sourceExcerpt?: string
  confidence?: number
  metadataJson?: string
}

export async function createStockTimelineRecordsFromAgent(input: {
  userId: string | bigint
  createdByLabel?: string
  records: AgentTimelineRecordInput[]
}) {
  const userId = BigInt(input.userId)
  const watchingItems = await prisma.stockWatchlist.findMany({
    where: {
      userId,
      status: 'WATCHING',
    },
    include: { stock: true },
  })

  const watchMap = new Map(
    watchingItems.map((item: { stock: { symbol: string }; stockId: bigint }) => [item.stock.symbol, item.stockId] as const)
  )
  const created: string[] = []
  const updated: string[] = []
  const skipped: Array<{ symbol: string; reason: string }> = []

  for (const record of input.records) {
    const normalizedSymbol = normalizeStockSymbol(record.symbol)
    const stockId = watchMap.get(normalizedSymbol)
    if (!stockId) {
      skipped.push({ symbol: normalizedSymbol, reason: 'NOT_IN_WATCHLIST' })
      continue
    }

    let sourceDiaryId: bigint | null = null
    if (record.sourceDiaryId) {
      const parsedDiaryId = BigInt(record.sourceDiaryId)
      const diary = await prisma.diary.findFirst({
        where: {
          id: parsedDiaryId,
          userId,
        },
        select: { id: true },
      })
      if (!diary) {
        skipped.push({ symbol: normalizedSymbol, reason: 'SOURCE_DIARY_NOT_OWNED' })
        continue
      }
      sourceDiaryId = parsedDiaryId
    }
    const existing = await prisma.stockTimelineRecord.findUnique({
      where: {
        userId_stockId_idempotencyKey: {
          userId,
          stockId,
          idempotencyKey: record.idempotencyKey,
        },
      },
      select: { id: true },
    })

    const result = await prisma.stockTimelineRecord.upsert({
      where: {
        userId_stockId_idempotencyKey: {
          userId,
          stockId,
          idempotencyKey: record.idempotencyKey,
        },
      },
      update: {
        summary: record.summary,
        sourceType: record.sourceType,
        sourceTitle: record.sourceTitle ?? null,
        sourceUrl: record.sourceUrl ?? null,
        sourceDiaryId,
        sourceExternalId: record.sourceExternalId ?? null,
        sourceExcerpt: record.sourceExcerpt ?? null,
        confidence: record.confidence ?? null,
        occurredAt: new Date(record.occurredAt),
        metadataJson: record.metadataJson ?? null,
      },
      create: {
        userId,
        stockId,
        summary: record.summary,
        sourceType: record.sourceType,
        sourceTitle: record.sourceTitle ?? null,
        sourceUrl: record.sourceUrl ?? null,
        sourceDiaryId,
        sourceExternalId: record.sourceExternalId ?? null,
        sourceExcerpt: record.sourceExcerpt ?? null,
        confidence: record.confidence ?? null,
        idempotencyKey: record.idempotencyKey,
        occurredAt: new Date(record.occurredAt),
        createdVia: 'API_KEY',
        createdByLabel: input.createdByLabel ?? null,
        metadataJson: record.metadataJson ?? null,
      },
      select: { id: true },
    })

    if (existing) {
      updated.push(result.id.toString())
    } else {
      created.push(result.id.toString())
    }
  }

  return { created, updated, skipped }
}

export async function listUserTimeline(userIdInput: string | bigint, limit = 100) {
  const userId = BigInt(userIdInput)
  return prisma.stockTimelineRecord.findMany({
    where: { userId },
    include: { stock: true },
    orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
    take: limit,
  })
}

export async function listUserTimelineBySymbol(userIdInput: string | bigint, symbolRaw: string, limit = 100) {
  const userId = BigInt(userIdInput)
  const symbol = normalizeStockSymbol(symbolRaw)
  return prisma.stockTimelineRecord.findMany({
    where: {
      userId,
      stock: { symbol },
    },
    include: { stock: true },
    orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
    take: limit,
  })
}

export function toTimelineResponseItem(item: {
  id: bigint
  stock: { symbol: string }
  summary: string
  sourceType: StockTimelineSourceType
  sourceTitle: string | null
  sourceUrl: string | null
  sourceDiaryId: bigint | null
  sourceExternalId: string | null
  sourceExcerpt: string | null
  confidence: number | null
  idempotencyKey: string
  occurredAt: Date
  createdVia: StockTimelineCreatedVia
  createdByLabel: string | null
  metadataJson: string | null
  createdAt: Date
  updatedAt: Date
}) {
  return {
    id: item.id.toString(),
    symbol: item.stock.symbol,
    summary: item.summary,
    sourceType: item.sourceType,
    sourceTitle: item.sourceTitle,
    sourceUrl: item.sourceUrl,
    sourceDiaryId: item.sourceDiaryId ? item.sourceDiaryId.toString() : null,
    sourceExternalId: item.sourceExternalId,
    sourceExcerpt: item.sourceExcerpt,
    confidence: item.confidence,
    idempotencyKey: item.idempotencyKey,
    occurredAt: item.occurredAt.toISOString(),
    createdVia: item.createdVia,
    createdByLabel: item.createdByLabel,
    metadataJson: item.metadataJson,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  }
}
