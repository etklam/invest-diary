import { logger } from '~/lib/logger'
import { requireApiKey } from '~/server/utils/api-key'
import { createStockNote, requestSchema, toStockNoteResponse } from '~/lib/stocks/notes'
import { normalizeStockSymbol, parseSymbolParam, symbolSchema } from '~/lib/stocks/symbols'
import { handleApiError } from '~/server/utils/error-handler'
import { serialize } from '~/server/utils/serialize'
import type { StockNoteResponse } from '~/types/stock-note'

export default defineEventHandler(async (event): Promise<StockNoteResponse> => {
  const log = logger.stocks.withRequestId(event.context.requestId)

  try {
    const auth = await requireApiKey(event, ['AGENT_WRITE'])

    const rawSymbol = parseSymbolParam(event)
    const symbol = normalizeStockSymbol(symbolSchema.parse(rawSymbol))

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

    return serialize(toStockNoteResponse(note))
  } catch (error) {
    handleApiError(error, log)
  }
})
