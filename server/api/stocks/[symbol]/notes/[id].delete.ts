import { logger } from '~/lib/logger'
import { requireUser } from '~/server/utils/auth'
import { getStockNoteById, deleteStockNote } from '~/lib/stocks/notes'
import { Errors } from '~/lib/errors/factory'
import { handleApiError } from '~/server/utils/error-handler'
import { parsePositiveBigIntParam } from '~/server/utils/validation'
import { parseSymbolParam } from '~/lib/stocks/symbols'
import { stockSymbolSchema } from '~/lib/contracts/stocks'

export default defineEventHandler(async (event) => {
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
      throw Errors.stockNoteAccessDenied('delete').toH3Error()
    }

    const result = await deleteStockNote(noteId, BigInt(user.id))
    if (!result) {
      throw Errors.stockNoteNotFound().toH3Error()
    }

    return { success: true }
  } catch (error) {
    handleApiError(error, log)
  }
})
