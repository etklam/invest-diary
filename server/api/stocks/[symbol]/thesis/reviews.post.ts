import { logger } from '~/lib/logger'
import { requireUser } from '~/server/utils/auth'
import { handleApiError } from '~/server/utils/error-handler'
import {
  completeThesisReview,
  toCurrentInvestmentThesis,
  toThesisReviewRecord,
} from '~/server/utils/investment-thesis-queries'
import { completeThesisReviewRequestSchema, thesisReviewResponseSchema } from '~/lib/contracts/investment-thesis'
import { parseSymbolParam } from '~/lib/stocks/symbols'
import { stockSymbolSchema } from '~/lib/contracts/stocks'

export default defineEventHandler(async (event) => {
  const log = logger.stocks.withRequestId(event.context.requestId)
  const user = requireUser(event)
  setHeader(event, 'Cache-Control', 'no-store')

  try {
    const symbol = stockSymbolSchema.parse(parseSymbolParam(event))
    const reviewInput = completeThesisReviewRequestSchema.parse(await readBody(event))
    const result = await completeThesisReview({
      userId: BigInt(user.id),
      symbol,
      review: reviewInput,
    })
    return thesisReviewResponseSchema.parse({
      thesis: toCurrentInvestmentThesis(result.current),
      review: toThesisReviewRecord(result.review),
    })
  } catch (error) {
    handleApiError(error, log)
  }
})
