import { logger } from '~/lib/logger'
import { requireUser } from '~/server/utils/auth'
import { getStockNoteById, updateStockNote, toStockNoteResponse } from '~/lib/stocks/notes'
import { Errors } from '~/lib/errors/factory'
import { handleApiError } from '~/server/utils/error-handler'
import { stockNoteUpdateRequestSchema, stockSymbolSchema } from '~/lib/contracts/stocks'
import type { StockNoteResponse } from '~/types/stock-note'
import { parsePositiveBigIntParam } from '~/server/utils/validation'
import { parseSymbolParam } from '~/lib/stocks/symbols'

export default defineEventHandler(async (event): Promise<StockNoteResponse> => {
  const log = logger.stocks.withRequestId(event.context.requestId)
  const user = requireUser(event)

  try {
    const noteId = parsePositiveBigIntParam(event, 'id')
    const symbol = stockSymbolSchema.parse(parseSymbolParam(event) ?? '')

    // Verify ownership and type
    const existing = await getStockNoteById(noteId, BigInt(user.id))
    if (!existing || stockSymbolSchema.parse(existing.stock.symbol) !== symbol) {
      throw Errors.stockNoteNotFound().toH3Error()
    }
    if (existing.createdVia !== 'USER') {
      throw Errors.stockNoteAccessDenied('edit').toH3Error()
    }

    const body = await readBody(event)
    const payload = stockNoteUpdateRequestSchema.parse(body)

    const updated = await updateStockNote(noteId, BigInt(user.id), payload)
    if (!updated) {
      throw Errors.stockNoteNotFound().toH3Error()
    }

    return toStockNoteResponse(updated)
  } catch (error) {
    handleApiError(error, log)
  }
})
