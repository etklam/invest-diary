import { z } from 'zod'
import { logger } from '~/lib/logger'
import { requireUser } from '~/server/utils/auth'
import { getStockNoteById, updateStockNote, toStockNoteResponse } from '~/lib/stocks/notes'
import { handleApiError } from '~/server/utils/error-handler'

const requestSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  content: z.string().min(1).max(50000).optional(),
  date: z.string().datetime().optional(),
})

export default defineEventHandler(async (event) => {
  const log = logger.stocks.withRequestId(event.context.requestId)
  const user = requireUser(event)

  try {
    const noteId = BigInt(String(event.context.params?.id ?? '0'))

    // Verify ownership and type
    const existing = await getStockNoteById(noteId, BigInt(user.id))
    if (!existing) {
      throw createError({ statusCode: 404, statusMessage: 'Note not found' })
    }
    if (existing.createdVia !== 'USER') {
      throw createError({ statusCode: 403, statusMessage: 'Cannot edit agent-created notes' })
    }

    const body = await readBody(event)
    const payload = requestSchema.parse(body)

    const updated = await updateStockNote(noteId, BigInt(user.id), payload)
    if (!updated) {
      throw createError({ statusCode: 404, statusMessage: 'Note not found' })
    }

    return toStockNoteResponse(updated)
  } catch (error) {
    handleApiError(error, log)
  }
})
