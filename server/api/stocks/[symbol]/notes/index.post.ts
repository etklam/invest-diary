import { logger } from '~/lib/logger'
import { requireUser } from '~/server/utils/auth'
import { createStockNote, requestSchema, SYMBOL_REGEX, toStockNoteResponse } from '~/lib/stocks/notes'
import { normalizeStockSymbol } from '~/lib/stocks/symbols'
import { Errors } from '~/lib/errors/factory'
import { handleApiError } from '~/server/utils/error-handler'

export default defineEventHandler(async (event) => {
  const log = logger.stocks.withRequestId(event.context.requestId)
  const user = requireUser(event)

  try {
    const rawSymbol = decodeURIComponent(String(event.context.params?.symbol))
    if (!SYMBOL_REGEX.test(rawSymbol)) {
      throw Errors.validationError([{ field: 'symbol', message: 'Invalid stock symbol format' }]).toH3Error()
    }
    const symbol = normalizeStockSymbol(rawSymbol)

    const body = await readBody(event)
    const payload = requestSchema.parse(body)

    const note = await createStockNote(BigInt(user.id), {
      symbol,
      title: payload.title,
      content: payload.content,
      date: payload.date,
      createdVia: 'USER',
      createdByLabel: undefined,
    })

    return toStockNoteResponse(note)
  } catch (error) {
    handleApiError(error, log)
  }
})
