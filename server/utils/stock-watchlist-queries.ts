import prisma from '~/lib/prisma'
import { normalizeStockSymbol } from '~/lib/stocks/symbols'

type StockWatchStatus = 'WATCHING' | 'ARCHIVED'

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

type StockTimelineSourceType =
  | 'TRADE_BASIC_DIARY'
  | 'VIDEO_TRANSCRIBE_SUMMARIZE'
  | 'DIARY'
  | 'ARTICLE'
  | 'MANUAL'
  | 'SYSTEM'
  | 'MARKET_ROTATION'
  | 'SEC_FILING'
  | 'RELATIVE_VALUE'
  | 'SEASONALITY'

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
