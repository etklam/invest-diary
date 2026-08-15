import { z } from 'zod'
import { logger } from '~/lib/logger'
import { requireUser } from '~/server/utils/auth'
import { getStockNoteById, updateStockNote, toStockNoteResponse } from '~/lib/stocks/notes'
import { Errors } from '~/lib/errors/factory'
import { handleApiError } from '~/server/utils/error-handler'
import { serialize } from '~/server/utils/serialize'
import type { StockNoteResponse } from '~/types/stock-note'

const requestSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  content: z.string().min(1).max(50000).optional(),
  date: z.string().datetime().optional(),
})

export default defineEventHandler(async (event): Promise<StockNoteResponse> => {
  const log = logger.stocks.withRequestId(event.context.requestId)
  const user = requireUser(event)

  try {
    const noteId = BigInt(String(event.context.params?.id ?? '0'))

    // Verify ownership and type
    const existing = await getStockNoteById(noteId, BigInt(user.id))
    if (!existing) {
      throw Errors.stockNoteNotFound().toH3Error()
    }
    if (existing.createdVia !== 'USER') {
      throw Errors.stockNoteAccessDenied('edit').toH3Error()
    }

    const body = await readBody(event)
    const payload = requestSchema.parse(body)

    const updated = await updateStockNote(noteId, BigInt(user.id), payload)
    if (!updated) {
      throw Errors.stockNoteNotFound().toH3Error()
    }

    return serialize(toStockNoteResponse(updated))
  } catch (error) {
    handleApiError(error, log)
  }
})
