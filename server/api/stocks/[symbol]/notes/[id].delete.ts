import { logger } from '~/lib/logger'
import { requireUser } from '~/server/utils/auth'
import { getStockNoteById, deleteStockNote } from '~/lib/stocks/notes'
import { handleApiError } from '~/server/utils/error-handler'

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
      throw createError({ statusCode: 403, statusMessage: 'Cannot delete agent-created notes' })
    }

    const result = await deleteStockNote(noteId, BigInt(user.id))
    if (!result) {
      throw createError({ statusCode: 404, statusMessage: 'Note not found' })
    }

    return { success: true }
  } catch (error) {
    handleApiError(error, log)
  }
})
