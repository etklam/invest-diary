import prisma from '~/lib/prisma'
import { logger } from '~/lib/logger'
import { requireUser } from '~/server/utils/auth'
import { listStockNotes, toStockNoteResponse } from '~/lib/stocks/notes'
import { normalizeStockSymbol, parseSymbolParam } from '~/lib/stocks/symbols'
import { handleApiError } from '~/server/utils/error-handler'
import { resolveSharedStockNotesOwner } from '~/server/utils/partner'
import type { StockNotesResponse } from '~/types/stock-note'
import { stockNoteListResponseSchema, stockNoteListParamsSchema, stockSymbolSchema } from '~/lib/contracts/stocks'

export default defineEventHandler(async (event): Promise<StockNotesResponse> => {
  const log = logger.stocks.withRequestId(event.context.requestId)
  const user = requireUser(event)

  try {
    const symbol = normalizeStockSymbol(stockSymbolSchema.parse(parseSymbolParam(event) ?? ''))
    const query = stockNoteListParamsSchema.parse(getQuery(event))
    const { page, limit, partnerId, createdVia } = query

    const stock = await prisma.stock.findUnique({ where: { symbol }, select: { id: true } })
    if (!stock) {
      return stockNoteListResponseSchema.parse({
        data: [],
        pagination: { page, limit, total: 0, totalPages: 0 },
      })
    }

    let targetUserId = BigInt(user.id)
    let isOwnedByViewer = true

    if (partnerId) {
      targetUserId = await resolveSharedStockNotesOwner(user.id, partnerId)
      isOwnedByViewer = false
    }

    const result = await listStockNotes(targetUserId, BigInt(stock.id), { page, limit, createdVia })
    return stockNoteListResponseSchema.parse({
      data: result.notes.map((n: Parameters<typeof toStockNoteResponse>[0]) => ({
        ...toStockNoteResponse(n),
        isOwnedByViewer,
      })),
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.total === 0 ? 0 : Math.ceil(result.total / result.limit),
      },
    })
  } catch (error) {
    handleApiError(error, log)
  }
})
