import prisma from '~/lib/prisma'
import { upsertStockWatchlistItem } from '~/server/utils/stock-watchlist-queries'
import type { StockNoteCreatedVia, StockNoteResponse } from '~/types/stock-note'

export interface CreateStockNoteInput {
  symbol: string
  title: string
  content: string
  date?: string
  createdVia: StockNoteCreatedVia
  createdByLabel?: string
}

export interface ListStockNotesOptions {
  page?: number
  limit?: number
  createdVia?: StockNoteCreatedVia
}

export interface UpdateStockNoteInput {
  title?: string
  content?: string
  date?: string
}

export async function createStockNote(userId: bigint, input: CreateStockNoteInput) {
  const { stock } = await upsertStockWatchlistItem({
    userId,
    symbol: input.symbol,
  })

  return prisma.stockNote.create({
    data: {
      userId,
      stockId: stock.id,
      title: input.title,
      content: input.content,
      date: input.date ? new Date(input.date) : new Date(),
      createdVia: input.createdVia,
      createdByLabel: input.createdByLabel ?? null,
    },
    include: {
      stock: { select: { symbol: true, name: true } },
    },
  })
}

export async function listStockNotes(
  userId: bigint,
  stockId: bigint,
  options: ListStockNotesOptions = {},
) {
  const page = Math.max(1, options.page ?? 1)
  const limit = Math.min(100, Math.max(1, options.limit ?? 20))
  const skip = (page - 1) * limit

  const where = {
    userId,
    stockId,
    ...(options.createdVia ? { createdVia: options.createdVia } : {}),
  }

  const [notes, total] = await Promise.all([
    prisma.stockNote.findMany({
      where,
      include: {
        stock: { select: { symbol: true, name: true } },
      },
      orderBy: [{ date: 'desc' }, { id: 'desc' }],
      skip,
      take: limit,
    }),
    prisma.stockNote.count({ where }),
  ])

  return { notes, total, page, limit }
}

export async function getStockNoteById(noteId: bigint, userId: bigint) {
  return prisma.stockNote.findFirst({
    where: { id: noteId, userId },
    include: {
      stock: { select: { symbol: true, name: true } },
    },
  })
}

export async function updateStockNote(
  noteId: bigint,
  userId: bigint,
  input: UpdateStockNoteInput,
) {
  // Only allow updating USER notes
  const note = await prisma.stockNote.findFirst({
    where: { id: noteId, userId },
    select: { id: true, createdVia: true },
  })

  if (!note) return null
  if (note.createdVia !== 'USER') return null

  return prisma.stockNote.update({
    where: { id: noteId },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.content !== undefined ? { content: input.content } : {}),
      ...(input.date !== undefined ? { date: new Date(input.date) } : {}),
    },
    include: {
      stock: { select: { symbol: true, name: true } },
    },
  })
}

export async function deleteStockNote(noteId: bigint, userId: bigint) {
  // Only allow deleting USER notes
  const note = await prisma.stockNote.findFirst({
    where: { id: noteId, userId },
    select: { id: true, createdVia: true },
  })

  if (!note) return null
  if (note.createdVia !== 'USER') return null

  await prisma.stockNote.delete({ where: { id: noteId } })
  return { deleted: true }
}

export function toStockNoteResponse(item: {
  id: bigint
  title: string
  content: string
  date: Date
  createdVia: StockNoteCreatedVia
  createdByLabel: string | null
  createdAt: Date
  updatedAt: Date
  stock: { symbol: string; name: string | null }
}): Omit<StockNoteResponse, 'isOwnedByViewer'> {
  return {
    id: item.id.toString(),
    symbol: item.stock.symbol,
    name: item.stock.name,
    title: item.title,
    content: item.content,
    date: item.date.toISOString(),
    createdVia: item.createdVia,
    createdByLabel: item.createdByLabel,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  }
}
