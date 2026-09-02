import { logger } from '~/lib/logger'
import { requireUser } from '~/server/utils/auth'
import { handleApiError } from '~/server/utils/error-handler'
import {
  findCurrentThesisBySymbol,
  listThesisReviews,
  toCurrentInvestmentThesis,
  toThesisReviewRecord,
} from '~/server/utils/investment-thesis-queries'
import { parseSymbolParam } from '~/lib/stocks/symbols'
import { stockSymbolSchema } from '~/lib/contracts/stocks'
import { investmentThesisResponseSchema, thesisReviewListParamsSchema } from '~/lib/contracts/investment-thesis'

export default defineEventHandler(async (event) => {
  const log = logger.stocks.withRequestId(event.context.requestId)
  const user = requireUser(event)
  setHeader(event, 'Cache-Control', 'no-store')

  try {
    const symbol = stockSymbolSchema.parse(parseSymbolParam(event))
    const query = thesisReviewListParamsSchema.parse(getQuery(event))
    const thesis = await findCurrentThesisBySymbol(BigInt(user.id), symbol)
    if (!thesis) return investmentThesisResponseSchema.parse({ thesis: null, reviews: [] })
    const reviews = await listThesisReviews(BigInt(user.id), thesis.id, query.limit)
    return investmentThesisResponseSchema.parse({
      thesis: toCurrentInvestmentThesis(thesis),
      reviews: (reviews ?? []).map(toThesisReviewRecord),
    })
  } catch (error) {
    handleApiError(error, log)
  }
})
