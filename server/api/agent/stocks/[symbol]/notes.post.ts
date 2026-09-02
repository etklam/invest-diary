import { logger } from '~/lib/logger'
import { requireApiKey } from '~/server/utils/api-key'
import { createStockNote, requestSchema, toStockNoteResponse } from '~/lib/stocks/notes'
import { normalizeStockSymbol, parseSymbolParam } from '~/lib/stocks/symbols'
import { handleApiError } from '~/server/utils/error-handler'
import type { StockNoteResponse } from '~/types/stock-note'
import { stockSymbolSchema } from '~/lib/contracts/stocks'

export default defineEventHandler(async (event): Promise<StockNoteResponse> => {
  const log = logger.stocks.withRequestId(event.context.requestId)

  try {
    const auth = await requireApiKey(event, ['AGENT_WRITE'])

    const rawSymbol = parseSymbolParam(event)
    const symbol = normalizeStockSymbol(stockSymbolSchema.parse(rawSymbol))

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
