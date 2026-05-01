import { z } from 'zod'
import { AppError, Errors } from '~/lib/errors/factory'
import { requireUser } from '~/server/utils/auth'
import { listUserTimelineBySymbol, toTimelineResponseItem } from '~/server/utils/stock-timeline-records'
import { normalizeStockSymbol } from '~/lib/stocks/symbols'

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(100),
})

export default defineEventHandler(async (event) => {
  const user = requireUser(event)

  try {
    const rawSymbol = event.context.params?.symbol
    if (!rawSymbol) {
      throw Errors.validationError([{ field: 'symbol', message: 'symbol is required' }]).toH3Error()
    }

    const symbol = normalizeStockSymbol(rawSymbol)
    const query = querySchema.parse(getQuery(event))
    const records = await listUserTimelineBySymbol(user.id, symbol, query.limit)

    return {
      stock: {
        symbol,
        name: null,
      },
      records: records.map(toTimelineResponseItem),
    }
  } catch (error) {
    if (error instanceof AppError) {
      throw error.toH3Error()
    }
    if (error instanceof z.ZodError) {
      throw Errors.validationError(error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }))).toH3Error()
    }
    throw Errors.internalError(error).toH3Error()
  }
})
