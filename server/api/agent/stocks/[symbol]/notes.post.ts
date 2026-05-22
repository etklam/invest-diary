import { z } from 'zod'
import { logger } from '~/lib/logger'
import { requireApiKey } from '~/server/utils/api-key'
import { createStockNote, toStockNoteResponse } from '~/lib/stocks/notes'
import { normalizeStockSymbol } from '~/lib/stocks/symbols'
import { Errors } from '~/lib/errors/factory'
import { handleApiError } from '~/server/utils/error-handler'

const SYMBOL_REGEX = /^[A-Za-z0-9.]{1,10}$/

const requestSchema = z.object({
  title: z.string().min(1).max(255),
  content: z.string().min(1).max(50000),
  date: z.string().datetime().optional(),
})

export default defineEventHandler(async (event) => {
  const log = logger.stocks.withRequestId(event.context.requestId)

  try {
    const auth = await requireApiKey(event, ['AGENT_WRITE'])

    const rawSymbol = decodeURIComponent(String(event.context.params?.symbol))
    if (!SYMBOL_REGEX.test(rawSymbol)) {
      throw Errors.validationError([{ field: 'symbol', message: 'Invalid stock symbol format' }]).toH3Error()
    }
    const symbol = normalizeStockSymbol(rawSymbol)

    const body = await readBody(event)
    const payload = requestSchema.parse(body)

    const note = await createStockNote(BigInt(auth.user.id), {
      symbol,
      title: payload.title,
      content: payload.content,
      date: payload.date,
      createdVia: 'AGENT',
      createdByLabel: auth.label,
    })

    log.info('Stock note created via API key', {
      userId: auth.user.id,
      apiKeyId: auth.apiKeyId,
      symbol,
      noteId: String(note.id),
    })

    return toStockNoteResponse(note)
  } catch (error) {
    handleApiError(error, log)
  }
})
