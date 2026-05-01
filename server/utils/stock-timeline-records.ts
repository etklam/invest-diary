import prisma from '~/lib/prisma'
import { normalizeStockSymbol } from '~/lib/stocks/symbols'

type StockWatchStatus = 'WATCHING' | 'ARCHIVED'
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

export async function ensureStockBySymbol(symbolRaw: string) {
  const symbol = normalizeStockSymbol(symbolRaw)
  return prisma.stock.upsert({
    where: { symbol },
    update: {},
    create: { symbol },
  })
}

export async function upsertStockWatchlistItem(input: {
  userId: string | bigint
  symbol: string
  status?: StockWatchStatus
}) {
  const userId = BigInt(input.userId)
  const stock = await ensureStockBySymbol(input.symbol)

  const lastSort = await prisma.stockWatchlist.findFirst({
    where: { userId },
    orderBy: { sortOrder: 'desc' },
    select: { sortOrder: true },
  })

  return prisma.stockWatchlist.upsert({
    where: {
      userId_stockId: {
        userId,
        stockId: stock.id,
      },
    },
    update: {
      status: input.status ?? 'WATCHING',
    },
    create: {
      userId,
      stockId: stock.id,
      status: input.status ?? 'WATCHING',
      sortOrder: (lastSort?.sortOrder ?? -1) + 1,
    },
    include: { stock: true },
  })
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

export async function listUserWatchlist(userIdInput: string | bigint) {
  const userId = BigInt(userIdInput)
  const items = await prisma.stockWatchlist.findMany({
    where: { userId, status: 'WATCHING' },
    include: { stock: true },
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
  })

  return items.map((item: { id: bigint; stock: { symbol: string; name: string | null }; sortOrder: number; status: StockWatchStatus }) => ({
    id: item.id.toString(),
    symbol: item.stock.symbol,
    name: item.stock.name,
    sortOrder: item.sortOrder,
    status: item.status,
  }))
}

export async function listUserWatchlistItems(userIdInput: string | bigint) {
  const userId = BigInt(userIdInput)
  const items = await prisma.stockWatchlist.findMany({
    where: { userId, status: 'WATCHING' },
    include: {
      stock: {
        include: {
          records: {
            where: { userId },
            orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
            take: 1,
          },
        },
      },
    },
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
  })

  const recordCounts = await prisma.stockTimelineRecord.groupBy({
    by: ['stockId'],
    where: {
      userId,
      stockId: { in: items.map((item: { stockId: bigint }) => item.stockId) },
    },
    _count: { _all: true },
  })
  const countByStockId = new Map(recordCounts.map((count: { stockId: bigint; _count: { _all: number } }) => [
    count.stockId.toString(),
    count._count._all,
  ]))

  return items.map((item: {
    id: bigint
    stockId: bigint
    status: StockWatchStatus
    sortOrder: number
    updatedAt: Date
    stock: {
      symbol: string
      name: string | null
      records: Array<{
        id: bigint
        summary: string
        occurredAt: Date
        sourceType: StockTimelineSourceType
        sourceTitle: string | null
        confidence: number | null
      }>
    }
  }) => {
    const latestRecord = item.stock.records[0]

    return {
      id: item.id.toString(),
      status: item.status,
      sortOrder: item.sortOrder,
      updatedAt: item.updatedAt.toISOString(),
      stock: {
        symbol: item.stock.symbol,
        name: item.stock.name,
      },
      recordCount: countByStockId.get(item.stockId.toString()) ?? 0,
      latestRecord: latestRecord
        ? {
            id: latestRecord.id.toString(),
            summary: latestRecord.summary,
            occurredAt: latestRecord.occurredAt.toISOString(),
            sourceType: latestRecord.sourceType,
            sourceTitle: latestRecord.sourceTitle,
            confidence: latestRecord.confidence,
          }
        : null,
    }
  })
}

export async function updateStockWatchlistItem(input: {
  userId: string | bigint
  watchlistId: string | bigint
  status?: StockWatchStatus
  sortOrder?: number
}) {
  const userId = BigInt(input.userId)
  const watchlistId = BigInt(input.watchlistId)

  const existing = await prisma.stockWatchlist.findFirst({
    where: { id: watchlistId, userId },
    select: { id: true },
  })

  if (!existing) {
    return null
  }

  return prisma.stockWatchlist.update({
    where: { id: watchlistId },
    data: {
      ...(input.status ? { status: input.status } : {}),
      ...(typeof input.sortOrder === 'number' ? { sortOrder: input.sortOrder } : {}),
    },
    include: { stock: true },
  })
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
